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
        } else {
          clearAuth();
          return;
        }
      } catch {
        clearAuth();
        return;
      } finally {
        if (!cancelled) setLoading(false);
      }
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
        signOutAll: doSignOut,
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
