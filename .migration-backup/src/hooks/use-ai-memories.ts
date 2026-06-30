import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type AIMemoryType =
  | "preference"
  | "goal"
  | "routine"
  | "relationship"
  | "health"
  | "work"
  | "calendar"
  | "interest"
  | "other";

export interface AIMemory {
  id: string;
  user_id: string;
  content: string;
  memory_type: AIMemoryType;
  importance_score: number;
  created_at: string;
  updated_at: string;
  last_accessed_at: string;
}

export function useAIMemories() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["ai-memories", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_memories" as any)
        .select("*")
        .order("importance_score", { ascending: false })
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as AIMemory[];
    },
  });
}

export function useUpdateAIMemory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, content }: { id: string; content: string }) => {
      const { error } = await supabase
        .from("ai_memories" as any)
        .update({ content })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ai-memories"] }),
    onError: (e: any) => toast.error(e?.message || "Could not update memory"),
  });
}

export function useDeleteAIMemory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ai_memories" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ai-memories"] }),
    onError: (e: any) => toast.error(e?.message || "Could not delete memory"),
  });
}

export function useClearAIMemories() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!user) return;
      const { error } = await supabase
        .from("ai_memories" as any)
        .delete()
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ai-memories"] }),
    onError: (e: any) => toast.error(e?.message || "Could not clear memories"),
  });
}