import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface PublicMember {
  handle: string;
  name: string | null;
  photo_url: string | null;
}

const Members = () => {
  const [members, setMembers] = useState<PublicMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    supabase
      .from("profiles")
      .select("handle, name, photo_url")
      .eq("is_private", false)
      .eq("is_suspended", false)
      .order("created_at", { ascending: false })
      .limit(200)
      .then(({ data, error: err }) => {
        if (err) {
          setError(true);
        } else {
          setMembers((data as PublicMember[] | null) ?? []);
        }
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-10">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-luxury-emerald mb-2">VYV Members</h1>
          <p className="text-muted-foreground">
            Discover people on VYV — visualize your vibe with the community.
          </p>
        </header>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <p className="text-muted-foreground text-center py-20">Could not load members.</p>
        ) : members.length === 0 ? (
          <p className="text-muted-foreground text-center py-20">No public profiles yet.</p>
        ) : (
          <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {members.map((m) => (
              <li key={m.handle}>
                <a
                  href={`/u/${m.handle}`}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border hover:border-luxury-emerald/60 transition-colors text-center"
                >
                  <div className="w-14 h-14 rounded-full bg-luxury-emerald/20 overflow-hidden flex items-center justify-center shrink-0">
                    {m.photo_url ? (
                      <img
                        src={m.photo_url}
                        alt={m.name ?? m.handle}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-luxury-emerald font-semibold text-xl">
                        {(m.name ?? m.handle).charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div>
                    {m.name && (
                      <p className="text-sm font-medium text-foreground leading-tight">
                        {m.name}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">@{m.handle}</p>
                  </div>
                </a>
              </li>
            ))}
          </ul>
        )}

        <footer className="mt-16 pt-6 border-t border-border flex flex-wrap gap-4 justify-center text-sm text-muted-foreground">
          <Link to="/welcome" className="hover:text-foreground transition-colors">Home</Link>
          <Link to="/sign-in" className="hover:text-foreground transition-colors">Sign In</Link>
          <Link to="/sign-up" className="hover:text-foreground transition-colors">Sign Up</Link>
          <Link to="/privacy-policy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
          <Link to="/terms-of-use" className="hover:text-foreground transition-colors">Terms of Use</Link>
        </footer>
      </div>
    </div>
  );
};

export default Members;
