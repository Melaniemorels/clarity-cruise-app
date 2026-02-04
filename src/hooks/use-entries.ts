import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface Entry {
  id: string;
  user_id: string;
  photo_url: string | null;
  caption: string | null;
  mood: number | null;
  category_id: string | null;
  tags: string[];
  visibility: "private" | "public" | "followers";
  occurred_at: string;
  created_at: string;
  updated_at: string;
}

export interface EnrichedEntry extends Entry {
  profiles: {
    handle: string;
    photo_url: string | null;
  } | null;
  reactions: {
    inspire: number;
    save: number;
  };
  userReactions: {
    inspire: boolean;
    save: boolean;
  };
}

// Fetch user's own entries
export function useUserEntries(limit = 50) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["entries", "user", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("entries")
        .select("*")
        .eq("user_id", user.id)
        .order("occurred_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as Entry[];
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
  });
}

// Fetch public entries feed with reactions
export function usePublicEntriesFeed(limit = 20) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["entries", "public-feed"],
    queryFn: async () => {
      const { data: entriesData, error: entriesError } = await supabase
        .from("entries")
        .select("*")
        .eq("visibility", "public")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (entriesError) throw entriesError;

      if (!entriesData || entriesData.length === 0) return [];

      // Batch fetch profiles
      const userIds = [...new Set(entriesData.map((e) => e.user_id))];
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("user_id, handle, photo_url")
        .in("user_id", userIds);

      const profilesMap = new Map(
        (profilesData || []).map((p) => [p.user_id, p])
      );

      // Batch fetch reactions
      const entryIds = entriesData.map((e) => e.id);
      const { data: reactionsData } = await supabase
        .from("reactions")
        .select("entry_id, type, user_id")
        .in("entry_id", entryIds);

      // Calculate reaction counts and user reactions
      const reactionCounts = new Map<string, { inspire: number; save: number }>();
      const userReactionMap = new Map<string, { inspire: boolean; save: boolean }>();

      entryIds.forEach((id) => {
        reactionCounts.set(id, { inspire: 0, save: 0 });
        userReactionMap.set(id, { inspire: false, save: false });
      });

      (reactionsData || []).forEach((r) => {
        const counts = reactionCounts.get(r.entry_id);
        if (counts) {
          if (r.type === "INSPIRE") counts.inspire++;
          if (r.type === "SAVE_IDEA") counts.save++;
        }

        if (user && r.user_id === user.id) {
          const userReactions = userReactionMap.get(r.entry_id);
          if (userReactions) {
            if (r.type === "INSPIRE") userReactions.inspire = true;
            if (r.type === "SAVE_IDEA") userReactions.save = true;
          }
        }
      });

      return entriesData.map((entry): EnrichedEntry => ({
        ...entry,
        profiles: profilesMap.get(entry.user_id) || null,
        reactions: reactionCounts.get(entry.id) || { inspire: 0, save: 0 },
        userReactions: userReactionMap.get(entry.id) || { inspire: false, save: false },
      }));
    },
    staleTime: 1000 * 60 * 5,
  });
}

// React to entry
export function useEntryReaction() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      entryId,
      type,
      hasReacted,
    }: {
      entryId: string;
      type: "INSPIRE" | "SAVE_IDEA";
      hasReacted: boolean;
    }) => {
      if (!user) throw new Error("Usuario no autenticado");

      if (hasReacted) {
        const { error } = await supabase
          .from("reactions")
          .delete()
          .eq("user_id", user.id)
          .eq("entry_id", entryId)
          .eq("type", type);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("reactions")
          .insert({ user_id: user.id, entry_id: entryId, type });
        if (error) throw error;
      }

      return { entryId, type, newState: !hasReacted };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entries"] });
    },
    onError: () => {
      toast.error("Error al reaccionar");
    },
  });
}

// Create entry
export function useCreateEntry() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (entry: {
      photo_url?: string;
      caption?: string;
      mood?: number;
      category_id?: string;
      tags?: string[];
      visibility?: "private" | "public" | "followers";
      occurred_at?: string;
    }) => {
      if (!user) throw new Error("Usuario no autenticado");

      const { data, error } = await supabase
        .from("entries")
        .insert({
          user_id: user.id,
          photo_url: entry.photo_url || null,
          caption: entry.caption?.trim() || null,
          mood: entry.mood || null,
          category_id: entry.category_id || null,
          tags: entry.tags || [],
          visibility: entry.visibility || "private",
          occurred_at: entry.occurred_at || new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entries"] });
      toast.success("Entrada creada");
    },
    onError: () => {
      toast.error("Error al crear entrada");
    },
  });
}

// Delete entry
export function useDeleteEntry() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (entryId: string) => {
      if (!user) throw new Error("Usuario no autenticado");

      const { error } = await supabase
        .from("entries")
        .delete()
        .eq("id", entryId)
        .eq("user_id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entries"] });
      toast.success("Entrada eliminada");
    },
    onError: () => {
      toast.error("Error al eliminar entrada");
    },
  });
}
