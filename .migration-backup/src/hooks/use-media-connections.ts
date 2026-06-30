import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface MediaConnection {
  id: string;
  user_id: string;
  provider: string;
  access_token: string;
  refresh_token: string | null;
  is_active: boolean;
  scopes: string[];
  connected_at: string;
  last_sync_at: string | null;
  token_expires_at: string | null;
}

export function useMediaConnections() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["media-connections", user?.id],
    queryFn: async (): Promise<MediaConnection[]> => {
      const session = (await supabase.auth.getSession()).data.session;
      if (!session) throw new Error("Not authenticated");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/media_integrations?user_id=eq.${user!.id}&is_active=eq.true&select=*`,
        {
          headers: {
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) throw new Error("Failed to fetch connections");
      return response.json();
    },
    enabled: !!user,
  });
}

export function useDisconnectMedia() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (provider: string) => {
      const session = (await supabase.auth.getSession()).data.session;
      if (!session) throw new Error("Not authenticated");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/media_integrations?user_id=eq.${user!.id}&provider=eq.${provider}`,
        {
          method: "PATCH",
          headers: {
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
            Prefer: "return=minimal",
          },
          body: JSON.stringify({
            is_active: false,
            access_token: "",
            refresh_token: null,
            updated_at: new Date().toISOString(),
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to disconnect");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["media-connections"] });
    },
  });
}

export function useHealthyVerifiedMode() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["healthy-verified-mode", user?.id],
    queryFn: async (): Promise<boolean> => {
      const session = (await supabase.auth.getSession()).data.session;
      if (!session) return true;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/media_consent?user_id=eq.${user!.id}&select=healthy_verified_mode`,
        {
          headers: {
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) return true;
      const data = await response.json();
      return data?.[0]?.healthy_verified_mode ?? true;
    },
    enabled: !!user,
  });
}

export function useToggleHealthyVerified() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (enabled: boolean) => {
      const session = (await supabase.auth.getSession()).data.session;
      if (!session) throw new Error("Not authenticated");

      // Check if consent record exists
      const checkResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/media_consent?user_id=eq.${user!.id}&select=id`,
        {
          headers: {
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      const existing = await checkResponse.json();

      if (existing?.length > 0) {
        await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/media_consent?user_id=eq.${user!.id}`,
          {
            method: "PATCH",
            headers: {
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              Authorization: `Bearer ${session.access_token}`,
              "Content-Type": "application/json",
              Prefer: "return=minimal",
            },
            body: JSON.stringify({ healthy_verified_mode: enabled }),
          }
        );
      } else {
        await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/media_consent`,
          {
            method: "POST",
            headers: {
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              Authorization: `Bearer ${session.access_token}`,
              "Content-Type": "application/json",
              Prefer: "return=minimal",
            },
            body: JSON.stringify({
              user_id: user!.id,
              healthy_verified_mode: enabled,
            }),
          }
        );
      }
    },
    onMutate: async (enabled) => {
      await queryClient.cancelQueries({ queryKey: ["healthy-verified-mode"] });
      queryClient.setQueryData(["healthy-verified-mode", user?.id], enabled);
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ["healthy-verified-mode"] });
    },
  });
}
