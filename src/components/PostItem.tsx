import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";
import { toast } from "sonner";

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

interface PostItemProps {
  post: Post;
}

export const PostItem = ({ post }: PostItemProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [optimisticLike, setOptimisticLike] = useState<boolean | null>(null);
  const [optimisticCount, setOptimisticCount] = useState<number | null>(null);

  const hasLiked = optimisticLike !== null ? optimisticLike : post.user_has_liked;
  const likesCount = optimisticCount !== null ? optimisticCount : post.likes_count;

  const likeMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Usuario no autenticado");

      if (hasLiked) {
        const { error } = await supabase
          .from("post_likes")
          .delete()
          .eq("user_id", user.id)
          .eq("post_id", post.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("post_likes")
          .insert({ user_id: user.id, post_id: post.id });
        
        if (error) throw error;
      }
    },
    onMutate: async () => {
      setOptimisticLike(!hasLiked);
      setOptimisticCount(hasLiked ? likesCount - 1 : likesCount + 1);
    },
    onError: (error) => {
      setOptimisticLike(null);
      setOptimisticCount(null);
      toast.error("Error al dar like");
      console.error(error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      setOptimisticLike(null);
      setOptimisticCount(null);
    },
  });

  const handleLike = () => {
    if (!user) {
      toast.error("Inicia sesión para dar like");
      return;
    }
    likeMutation.mutate();
  };

  const getTimeAgo = (date: string) => {
    const now = new Date();
    const past = new Date(date);
    const diffMs = now.getTime() - past.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    return `${diffDays}d`;
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={post.profiles?.photo_url || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary">
              {post.profiles?.handle?.[0]?.toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="font-semibold text-sm text-foreground">
              {post.profiles?.handle || "usuario"}
            </p>
            <p className="text-xs text-muted-foreground">
              {getTimeAgo(post.created_at)}
            </p>
          </div>
        </div>

        {post.image_url && (
          <div className="relative aspect-square rounded-lg overflow-hidden bg-muted">
            <img
              src={post.image_url}
              alt={post.caption || "Post image"}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
        )}

        {post.caption && (
          <p className="text-sm text-foreground line-clamp-3">{post.caption}</p>
        )}

        {post.activity_tag && (
          <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
            {post.activity_tag}
          </div>
        )}

        <div className="flex items-center gap-4 pt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLike}
            className="gap-2 hover:text-destructive"
          >
            <Heart
              className={`h-5 w-5 ${
                hasLiked ? "fill-destructive text-destructive" : ""
              }`}
            />
            <span className="text-sm font-medium">{likesCount}</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
