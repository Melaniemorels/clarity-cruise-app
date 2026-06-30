import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import i18n from "@/i18n";

export interface Post {
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

interface PostsQueryOptions {
  userId?: string;
  feedType?: "following" | "public" | "user";
  pageSize?: number;
}

const DEFAULT_PAGE_SIZE = 20;

// Fetch posts with pagination support
async function fetchPosts(
  userId: string | undefined,
  feedType: "following" | "public" | "user",
  pageSize: number,
  cursor?: string
): Promise<{ posts: Post[]; nextCursor: string | null }> {
  if (!userId && feedType !== "public") {
    return { posts: [], nextCursor: null };
  }

  let query = supabase
    .from("posts")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(pageSize + 1); // Fetch one extra to determine if there's more

  // Apply cursor for pagination
  if (cursor) {
    query = query.lt("created_at", cursor);
  }

  // Filter based on feed type
  if (feedType === "following" && userId) {
    const { data: followsData } = await (supabase as any)
      .from("follows")
      .select("following_id")
      .eq("follower_id", userId)
      .eq("status", "accepted");

    const followingIds = (followsData || []).map((f) => f.following_id);
    const relevantUserIds = [...followingIds, userId];
    query = query.in("user_id", relevantUserIds);
  } else if (feedType === "user" && userId) {
    query = query.eq("user_id", userId);
  }

  const { data: postsData, error: postsError } = await query;

  if (postsError) throw postsError;

  if (!postsData || postsData.length === 0) {
    return { posts: [], nextCursor: null };
  }

  // Check if there's more data
  const hasMore = postsData.length > pageSize;
  const posts = hasMore ? postsData.slice(0, pageSize) : postsData;
  const nextCursor = hasMore ? posts[posts.length - 1].created_at : null;

  // Batch fetch profiles
  const userIds = [...new Set(posts.map((p) => p.user_id))];
  const { data: profilesData } = await supabase
    .from("profiles")
    .select("user_id, handle, photo_url")
    .in("user_id", userIds);

  const profilesMap = new Map(
    (profilesData || []).map((p) => [p.user_id, p])
  );

  // Batch fetch likes
  const postIds = posts.map((p) => p.id);
  const { data: likesData } = await supabase
    .from("post_likes")
    .select("post_id, user_id")
    .in("post_id", postIds);

  const likeCounts = new Map<string, number>();
  const userLikes = new Set<string>();

  (likesData || []).forEach((like) => {
    likeCounts.set(like.post_id, (likeCounts.get(like.post_id) || 0) + 1);
    if (userId && like.user_id === userId) {
      userLikes.add(like.post_id);
    }
  });

  const enrichedPosts: Post[] = posts.map((post) => ({
    ...post,
    profiles: profilesMap.get(post.user_id) || null,
    likes_count: likeCounts.get(post.id) || 0,
    user_has_liked: userLikes.has(post.id),
  }));

  return { posts: enrichedPosts, nextCursor };
}

// Hook for paginated posts (infinite scroll)
export function useInfinitePosts(options: PostsQueryOptions = {}) {
  const { user } = useAuth();
  const { feedType = "following", pageSize = DEFAULT_PAGE_SIZE } = options;
  const userId = options.userId || user?.id;

  return useInfiniteQuery({
    queryKey: ["posts", "infinite", feedType, userId],
    queryFn: ({ pageParam }) =>
      fetchPosts(userId, feedType, pageSize, pageParam),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: undefined as string | undefined,
    enabled: feedType === "public" || !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Hook for simple posts list (backward compatible)
export function usePosts(options: PostsQueryOptions = {}) {
  const { user } = useAuth();
  const { feedType = "following", pageSize = DEFAULT_PAGE_SIZE } = options;
  const userId = options.userId || user?.id;

  return useQuery({
    queryKey: ["posts", feedType, userId],
    queryFn: async () => {
      const result = await fetchPosts(userId, feedType, pageSize);
      return result.posts;
    },
    enabled: feedType === "public" || !!userId,
    staleTime: 1000 * 60 * 5,
  });
}

// Like/unlike mutation with optimistic updates
export function usePostLike() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      postId,
      hasLiked,
    }: {
      postId: string;
      hasLiked: boolean;
    }) => {
      if (!user) throw new Error("Usuario no autenticado");

      if (hasLiked) {
        const { error } = await supabase
          .from("post_likes")
          .delete()
          .eq("user_id", user.id)
          .eq("post_id", postId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("post_likes")
          .insert({ user_id: user.id, post_id: postId });
        if (error) throw error;
      }

      return { postId, newLikedState: !hasLiked };
    },
    onMutate: async ({ postId, hasLiked }) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: ["posts"] });

      // Return context for rollback
      return { postId, previousLiked: hasLiked };
    },
    onError: (_error, _variables, context) => {
      toast.error(i18n.t('post.errors.likeError'));
      // Rollback happens automatically via invalidation
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });
}

// Create post mutation
export function useCreatePost() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      imageFile,
      caption,
      activityTag,
    }: {
      imageFile: File;
      caption?: string;
      activityTag?: string;
    }) => {
      if (!user) throw new Error(i18n.t('errors.unauthorized'));

      // Upload image
      const fileExt = imageFile.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("images")
        .upload(fileName, imageFile, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        throw new Error(i18n.t('post.errors.captureFirst') + `: ${uploadError.message}`);
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("images").getPublicUrl(fileName);

      // Create post
      const { error: insertError } = await supabase.from("posts").insert({
        user_id: user.id,
        caption: caption?.trim() || null,
        activity_tag: activityTag || null,
        image_url: publicUrl,
      });

      if (insertError) {
        // Cleanup uploaded image
        await supabase.storage.from("images").remove([fileName]);
        throw new Error(i18n.t('post.errors.updateError') + `: ${insertError.message}`);
      }

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      toast.success(i18n.t('post.published'));
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : i18n.t('post.errors.updateError');
      toast.error(message);
    },
  });
}

// Delete post mutation
export function useDeletePost() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (postId: string) => {
      if (!user) throw new Error(i18n.t('errors.unauthorized'));

      const { error } = await supabase
        .from("posts")
        .delete()
        .eq("id", postId)
        .eq("user_id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      toast.success(i18n.t('post.postDeleted'));
    },
    onError: () => {
      toast.error(i18n.t('post.errors.deleteError'));
    },
  });
}

// Update post mutation
export function useUpdatePost() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      postId,
      caption,
      activityTag,
    }: {
      postId: string;
      caption?: string;
      activityTag?: string;
    }) => {
      if (!user) throw new Error(i18n.t('errors.unauthorized'));

      const { error } = await supabase
        .from("posts")
        .update({
          caption: caption?.trim() || null,
          activity_tag: activityTag?.trim() || null,
        })
        .eq("id", postId)
        .eq("user_id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      toast.success(i18n.t('post.postUpdated'));
    },
    onError: () => {
      toast.error(i18n.t('post.errors.updateError'));
    },
  });
}
