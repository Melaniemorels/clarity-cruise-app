import { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

const KEEP_SIGNED_IN_KEY = "vyv-keep-signed-in";

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
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;
    let initialSessionResolved = false;

    // Set up listener FIRST (before getSession)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!isMounted) return;

        setSession(session);
        setUser(session?.user ?? null);

        // Only set loading false from listener after initial session is resolved
        if (initialSessionResolved) {
          setLoading(false);
        }
      }
    );

    // THEN get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMounted) return;

      initialSessionResolved = true;
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      // Session persistence: if "keep signed in" is OFF and this is a new browser session, sign out
      if (session) {
        const keepSignedIn = localStorage.getItem(KEEP_SIGNED_IN_KEY);
        const sessionActive = sessionStorage.getItem(KEEP_SIGNED_IN_KEY);
        
        if (keepSignedIn === "false" && !sessionActive) {
          supabase.auth.signOut().then(() => {
            if (!isMounted) return;
            setSession(null);
            setUser(null);
          });
        } else {
          sessionStorage.setItem(KEEP_SIGNED_IN_KEY, "active");
        }
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, handle: string) => {
    const redirectUrl = `${window.location.origin}/security-onboarding`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          handle,
        },
      },
    });
    
    if (!error) {
      navigate("/security-onboarding");
    }
    
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (!error) {
      sessionStorage.setItem(KEEP_SIGNED_IN_KEY, "active");
      navigate("/");
    }
    
    return { error };
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Error during sign out:", error);
    } finally {
      localStorage.removeItem(KEEP_SIGNED_IN_KEY);
      sessionStorage.removeItem(KEEP_SIGNED_IN_KEY);
      setSession(null);
      setUser(null);
      navigate("/auth");
    }
  };

  const signOutAll = async () => {
    try {
      await supabase.auth.signOut({ scope: "global" });
    } catch (error) {
      console.error("Error during global sign out:", error);
    } finally {
      localStorage.removeItem(KEEP_SIGNED_IN_KEY);
      sessionStorage.removeItem(KEEP_SIGNED_IN_KEY);
      setSession(null);
      setUser(null);
      navigate("/auth");
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, signUp, signIn, signOut, signOutAll, loading }}>
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
