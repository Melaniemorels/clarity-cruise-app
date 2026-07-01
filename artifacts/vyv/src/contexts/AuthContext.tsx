import { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { useNavigate } from "react-router-dom";
import { useAuth as useClerkAuth, useUser, useClerk } from "@clerk/react";

// Where the api-server lives (same-origin `/api` in this workspace).
const API_BASE = (import.meta.env.VITE_SUPABASE_URL as string) || "/api";
// Shared cache key: the shim (integrations/supabase/client.ts) reads this to
// shape sessions with our stable UUID instead of the raw Clerk id.
const APP_USER_KEY = "vyv-app-user";

interface AppUser {
  id: string;
  email: string;
}

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

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const { isLoaded, isSignedIn, getToken } = useClerkAuth();
  const { user: clerkUser } = useUser();
  const clerk = useClerk();
  const navigate = useNavigate();

  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Bridge the Clerk session to this app's identity. On sign-in we call
  // /api/auth/me (which JIT-provisions the app_users row + profile and returns
  // our stable UUID), cache it for the shim, and expose it as `user`.
  useEffect(() => {
    let mounted = true;

    if (!isLoaded) return;

    if (!isSignedIn) {
      try {
        localStorage.removeItem(APP_USER_KEY);
      } catch {
        /* ignore */
      }
      setAppUser(null);
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const token = await getToken();
        const res = await fetch(`${API_BASE}/auth/me`, {
          credentials: "include",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = await res.json();
        if (!mounted) return;
        if (data?.id) {
          const u: AppUser = { id: data.id, email: data.email };
          try {
            localStorage.setItem(APP_USER_KEY, JSON.stringify(u));
          } catch {
            /* ignore */
          }
          setAppUser(u);
        }
      } catch (err) {
        console.error("Failed to resolve app user from /auth/me:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [isLoaded, isSignedIn, getToken]);

  const user: User | null = appUser
    ? ({
        id: appUser.id,
        email: appUser.email,
        aud: "authenticated",
        role: "authenticated",
        app_metadata: {},
        user_metadata: {
          avatar_url: clerkUser?.imageUrl,
          full_name: clerkUser?.fullName ?? undefined,
        },
        created_at: clerkUser?.createdAt?.toISOString?.() ?? new Date().toISOString(),
      } as unknown as User)
    : null;

  const session: Session | null = user
    ? ({ user, access_token: "", token_type: "bearer" } as unknown as Session)
    : null;

  // Real sign-in / sign-up happen on Clerk's hosted <SignIn>/<SignUp> pages.
  // These retain the old signatures for imported screens, routing to Clerk.
  const signIn = async (_email?: string, _password?: string) => {
    navigate("/sign-in");
    return { error: null };
  };

  const signUp = async (_email?: string, _password?: string, _handle?: string) => {
    navigate("/sign-up");
    return { error: null };
  };

  const signOut = async () => {
    try {
      await clerk.signOut();
    } catch (error) {
      console.error("Error during sign out:", error);
    } finally {
      try {
        localStorage.removeItem(APP_USER_KEY);
      } catch {
        /* ignore */
      }
      setAppUser(null);
      navigate("/sign-in");
    }
  };

  // Clerk ends the active session on sign-out; there is no separate
  // "current device vs. all devices" distinction exposed here.
  const signOutAll = signOut;

  return (
    <AuthContext.Provider
      value={{ user, session, signUp, signIn, signOut, signOutAll, loading }}
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
