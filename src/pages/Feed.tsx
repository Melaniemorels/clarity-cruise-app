import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PostItem } from "@/components/PostItem";
import { CreatePostDialog } from "@/components/CreatePostDialog";
import { Plus, RefreshCw, Search, Hexagon, Camera } from "lucide-react";
import { toast } from "sonner";
import { UserSearchDialog } from "@/components/UserSearchDialog";

interface Post {
  id: string;
  user_id: string;
  image_url: string | null;
  caption: string | null;
  activity_tag: string | null;
  created_at: string;
  profiles: {
    handle: string;
    photo_url: string | null;
  } | null;
  likes_count: number;
  user_has_liked: boolean;
}

const Feed = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const { data: posts = [], isLoading, refetch } = useQuery({
    queryKey: ["posts"],
    queryFn: async () => {
      const { data: postsData, error: postsError } = await supabase
        .from("posts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);

      if (postsError) throw postsError;

      const userIds = [...new Set(postsData.map((p) => p.user_id))];
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("user_id, handle, photo_url")
        .in("user_id", userIds);

      const profilesMap = new Map(
        (profilesData || []).map((p) => [p.user_id, p])
      );

      const postIds = postsData.map((p) => p.id);
      const { data: likesData } = await supabase
        .from("post_likes")
        .select("post_id, user_id")
        .in("post_id", postIds);

      const likeCounts = new Map<string, number>();
      const userLikes = new Set<string>();

      (likesData || []).forEach((like) => {
        likeCounts.set(like.post_id, (likeCounts.get(like.post_id) || 0) + 1);
        if (user && like.user_id === user.id) {
          userLikes.add(like.post_id);
        }
      });

      return postsData.map((post) => ({
        ...post,
        profiles: profilesMap.get(post.user_id) || null,
        likes_count: likeCounts.get(post.id) || 0,
        user_has_liked: userLikes.has(post.id),
      }));
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    gcTime: 1000 * 60 * 30, // Keep in cache for 30 minutes offline
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
      toast.success("Feed actualizado");
    } catch (error) {
      toast.error("Error al actualizar");
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    const channel = supabase
      .channel("posts-channel")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "posts",
        },
        () => {
          refetch();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "post_likes",
        },
        () => {
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch]);

  return (
    <div className="min-h-screen pb-20 relative bg-theme-bg">
      {/* Watermark */}
      <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-0">
        <Hexagon 
          size={400} 
          strokeWidth={0.5}
          className="text-theme-borderSubtle opacity-12"
        />
      </div>

      <div className="mx-auto max-w-2xl relative z-10">
        <div className="sticky top-0 z-10 backdrop-blur bg-theme-bgElevated/80 border-b border-theme-borderSubtle">
          <div className="flex items-center justify-between p-4">
            <h1 className="text-2xl font-bold text-foreground">VYV</h1>
            <div className="flex items-center gap-5">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsSearchOpen(true)}
              >
                <Search className="h-5 w-5" strokeWidth={1.4} style={{ color: '#EAEAEA' }} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                <RefreshCw className={`h-5 w-5 ${isRefreshing ? "animate-spin" : ""}`} strokeWidth={1.4} style={{ color: '#EAEAEA' }} />
              </Button>
              <Button
                size="icon"
                onClick={() => setIsCreateOpen(true)}
                className="rounded-full"
                style={{
                  backgroundColor: '#2F7058',
                  color: '#FFFFFF',
                  borderRadius: '18px',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.25)',
                  padding: '0 16px',
                  height: '36px',
                  width: 'auto'
                }}
              >
                <Plus className="h-4 w-4" strokeWidth={1.4} />
              </Button>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {isLoading ? (
            <>
              {[...Array(3)].map((_, i) => (
                <div key={i} className="space-y-3 p-4 border border-border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <Skeleton className="h-64 w-full rounded-lg" />
                  <Skeleton className="h-4 w-full" />
                  <div className="flex gap-4">
                    <Skeleton className="h-8 w-16" />
                  </div>
                </div>
              ))}
            </>
          ) : posts.length === 0 ? (
            <div className="text-center py-12 animate-in fade-in" style={{ animationDuration: '280ms' }}>
              <div className="flex justify-center mb-4">
                <Camera size={48} strokeWidth={1.5} style={{ color: '#D9D9D9' }} />
              </div>
              <p className="mb-1.5" style={{ 
                fontSize: '20px', 
                fontWeight: 500, 
                letterSpacing: '0.3px',
                color: 'hsl(var(--foreground))'
              }}>
                No hay posts aún
              </p>
              <p className="mb-4" style={{ 
                fontSize: '14px', 
                color: '#A3A3A3' 
              }}>
                Sé el primero en compartir algo
              </p>
              <Button 
                onClick={() => setIsCreateOpen(true)}
                style={{
                  backgroundColor: '#2F7058',
                  color: '#FFFFFF',
                  borderRadius: '18px',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.25)',
                  padding: '10px 24px'
                }}
              >
                <Plus className="h-4 w-4 mr-2" strokeWidth={1.5} />
                Crear Post
              </Button>
            </div>
          ) : (
            posts.map((post) => (
              <PostItem
                key={post.id}
                post={post}
              />
            ))
          )}
        </div>
      </div>

      <CreatePostDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
      />

      <UserSearchDialog
        open={isSearchOpen}
        onOpenChange={setIsSearchOpen}
      />

      <BottomNav />
    </div>
  );
};

export default Feed;
