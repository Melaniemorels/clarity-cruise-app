import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { BottomNav } from "@/components/BottomNav";
import { FeedPost } from "@/components/FeedPost";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

interface Entry {
  id: string;
  user_id: string;
  photo_url: string | null;
  caption: string | null;
  created_at: string;
  profiles: {
    handle: string;
    photo_url: string | null;
  } | null;
}

const Home = () => {
  const { user } = useAuth();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [reactions, setReactions] = useState<Record<string, { inspire: number; save: number }>>({});
  const [userReactions, setUserReactions] = useState<Record<string, { inspire: boolean; save: boolean }>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeed = async () => {
      try {
        // Fetch entries with profiles
        const { data: entriesData, error: entriesError } = await supabase
          .from("entries")
          .select("*")
          .eq("visibility", "public")
          .order("created_at", { ascending: false })
          .limit(20);

        if (entriesError) throw entriesError;

        // Fetch profiles for each entry
        const userIds = [...new Set((entriesData || []).map((e) => e.user_id))];
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("user_id, handle, photo_url")
          .in("user_id", userIds);

        const profilesMap = new Map(
          (profilesData || []).map((p) => [p.user_id, p])
        );

        const enrichedEntries: Entry[] = (entriesData || []).map((e) => ({
          id: e.id,
          user_id: e.user_id,
          photo_url: e.photo_url,
          caption: e.caption,
          created_at: e.created_at,
          profiles: profilesMap.get(e.user_id) || null,
        }));

        setEntries(enrichedEntries);

        // Fetch reaction counts
        const entryIds = (entriesData || []).map((e) => e.id);
        if (entryIds.length > 0) {
          const { data: reactionsData } = await supabase
            .from("reactions")
            .select("entry_id, type")
            .in("entry_id", entryIds);

          const counts: Record<string, { inspire: number; save: number }> = {};
          (reactionsData || []).forEach((r) => {
            if (!counts[r.entry_id]) {
              counts[r.entry_id] = { inspire: 0, save: 0 };
            }
            if (r.type === "INSPIRE") counts[r.entry_id].inspire++;
            if (r.type === "SAVE_IDEA") counts[r.entry_id].save++;
          });
          setReactions(counts);

          // Fetch user's reactions
          if (user) {
            const { data: userReactionsData } = await supabase
              .from("reactions")
              .select("entry_id, type")
              .eq("user_id", user.id)
              .in("entry_id", entryIds);

            const userCounts: Record<string, { inspire: boolean; save: boolean }> = {};
            (userReactionsData || []).forEach((r) => {
              if (!userCounts[r.entry_id]) {
                userCounts[r.entry_id] = { inspire: false, save: false };
              }
              if (r.type === "INSPIRE") userCounts[r.entry_id].inspire = true;
              if (r.type === "SAVE_IDEA") userCounts[r.entry_id].save = true;
            });
            setUserReactions(userCounts);
          }
        }
      } catch (error) {
        console.error("Error fetching feed:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchFeed();

    // Set up realtime subscription
    const channel = supabase
      .channel("feed-updates")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "entries",
          filter: "visibility=eq.public",
        },
        () => {
          fetchFeed();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);
  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="mx-auto max-w-2xl p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-foreground">VYV</h1>
          <div className="text-sm text-muted-foreground">Feed</div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : entries.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="text-4xl mb-4">🌿</div>
              <p className="text-muted-foreground">No hay publicaciones aún</p>
              <p className="text-sm text-muted-foreground mt-2">
                Captura tu primera foto desde Focus
              </p>
            </CardContent>
          </Card>
        ) : (
          entries.map((entry) => (
            <FeedPost
              key={entry.id}
              postId={entry.id}
              userHandle={entry.profiles?.handle || "anonymous"}
              userPhotoUrl={entry.profiles?.photo_url || undefined}
              photoUrl={entry.photo_url || undefined}
              caption={entry.caption || undefined}
              createdAt={entry.created_at}
              inspireCount={reactions[entry.id]?.inspire || 0}
              saveCount={reactions[entry.id]?.save || 0}
              hasInspired={userReactions[entry.id]?.inspire || false}
              hasSaved={userReactions[entry.id]?.save || false}
            />
          ))
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default Home;
