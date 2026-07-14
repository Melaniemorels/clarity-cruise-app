import { createContext, useContext, useEffect, useState } from "react";
import type { User, Session } from "@supabase/supabase-js";
import { useNavigate } from "react-router-dom";
import { useAuth as useClerkAuth, useUser, useClerk } from "@clerk/react";
import { setShimSession } from "@/integrations/supabase/client";

const BASE = (import.meta.env.VITE_SUPABASE_URL as string) || "/api";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  signUp: (email: string, password: string, handle: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  signOutAll: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Auth is owned by Clerk. This context bridges Clerk's session to the rest of
// the app: it exchanges the Clerk session (sent via cookie) for the internal
// user record (a stable UUID) from /api/auth/user, and mirrors that session
// into the Supabase-compat shim so legacy `supabase.auth.*` callers keep working.
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const { isLoaded: clerkLoaded, isSignedIn } = useClerkAuth();
  const { user: clerkUser } = useUser();
  const clerk = useClerk();
  const navigate = useNavigate();

  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const clearAuth = () => {
      if (cancelled) return;
      setUser(null);
      setSession(null);
      setShimSession(null);
      setLoading(false);
    };

    const sync = async () => {
      if (!clerkLoaded) return; // wait until Clerk resolves the session

      if (!isSignedIn) {
        clearAuth();
        return;
      }

      // Right after an OAuth return (e.g. Apple/Google), Clerk reports
      // isSignedIn before the session cookie is usable by our API, so the
      // first bridge fetch can 401. Retry briefly instead of giving up —
      // giving up while Clerk still holds a session causes a redirect loop
      // between ProtectedRoute (→ /sign-in) and Clerk's <SignIn> (→ /).
      const MAX_ATTEMPTS = 5;
      const RETRY_DELAY_MS = 1000;

      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
          const res = await fetch(`${BASE}/auth/user`, {
            credentials: "include",
          });
          const json = await res.json();
          const internalUser = (json?.data?.user ?? null) as User | null;
          if (cancelled) return;

          if (internalUser) {
            const now = Math.floor(Date.now() / 1000);
            // access_token is a sentinel — transport is cookie-based (Clerk),
            // but the app has many `if (session?.access_token)` truthy guards.
            const sess = {
              access_token: "clerk",
              token_type: "bearer",
              expires_in: 3600,
              expires_at: now + 3600,
              refresh_token: "clerk",
              user: internalUser,
            } as unknown as Session;
            setUser(internalUser);
            setSession(sess);
            setShimSession(sess);
            setLoading(false);
            return;
          }
        } catch {
          /* network hiccup — fall through to retry */
        }

        if (cancelled) return;
        if (attempt < MAX_ATTEMPTS) {
          await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
          if (cancelled) return;
        }
      }

      // The Clerk session could not be bridged to an internal account.
      // Leaving Clerk signed-in while the app is signed-out would loop the
      // router forever, so drop the Clerk session for a clean signed-out state.
      console.error(
        "Auth bridge failed after retries; signing out to avoid a redirect loop.",
      );
      try {
        await clerk.signOut();
      } catch {
        /* best effort */
      }
      clearAuth();
    };

    void sync();
    return () => {
      cancelled = true;
    };
  }, [clerkLoaded, isSignedIn, clerkUser?.id]);

  // Sign-in / sign-up are handled by Clerk's hosted-in-app pages (/sign-in,
  // /sign-up). These stubs remain only to satisfy the context interface.
  const signUp = async () => ({
    error: { message: "Please use the sign-up page." },
  });
  const signIn = async () => ({
    error: { message: "Please use the sign-in page." },
  });

  // Revokes every Clerk session server-side (all devices), then signs out
  // locally. Throws if the server could not revoke all remote sessions so the
  // UI never claims an all-device logout that did not happen.
  const doSignOutAll = async () => {
    const res = await fetch(`${BASE}/auth/signout-all`, {
      method: "POST",
      credentials: "include",
    });
    if (!res.ok) throw new Error("signout_all_failed");
    await doSignOut();
  };

  const doSignOut = async () => {
    try {
      await clerk.signOut();
    } catch (error) {
      console.error("Error during sign out:", error);
    } finally {
      setUser(null);
      setSession(null);
      setShimSession(null);
      navigate("/sign-in");
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        signUp,
        signIn,
        signOut: doSignOut,
        signOutAll: doSignOutAll,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
