import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Search, UserPlus, UserCheck } from "lucide-react";
import { toast } from "sonner";

interface UserSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SearchUser {
  id: string;
  user_id: string;
  handle: string;
  name: string | null;
  photo_url: string | null;
  bio: string | null;
  is_following: boolean;
}

export function UserSearchDialog({ open, onOpenChange }: UserSearchDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["user-search", searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim() || !user) return [];

      const { data: profilesData, error } = await supabase
        .from("profiles")
        .select("id, user_id, handle, name, photo_url, bio")
        .ilike("handle", `%${searchQuery}%`)
        .neq("user_id", user.id)
        .limit(20);

      if (error) throw error;

      const { data: followsData } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", user.id);

      const followingIds = new Set(
        (followsData || []).map((f) => f.following_id)
      );

      return (profilesData || []).map((profile) => ({
        ...profile,
        is_following: followingIds.has(profile.user_id),
      }));
    },
    enabled: open && !!user,
  });

  const followMutation = useMutation({
    mutationFn: async ({
      userId,
      isFollowing,
    }: {
      userId: string;
      isFollowing: boolean;
    }) => {
      if (!user) throw new Error("No user");

      if (isFollowing) {
        const { error } = await supabase
          .from("follows")
          .delete()
          .eq("follower_id", user.id)
          .eq("following_id", userId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("follows")
          .insert({ follower_id: user.id, following_id: userId });
        if (error) throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["user-search"] });
      toast.success(
        variables.isFollowing ? "Dejaste de seguir" : "Siguiendo"
      );
    },
    onError: () => {
      toast.error("Error al actualizar");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Buscar Amigos</DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por @usuario..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 min-h-[200px]">
          {!searchQuery.trim() ? (
            <div className="text-center py-12 text-muted-foreground">
              <Search className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Busca usuarios por su @handle</p>
            </div>
          ) : isLoading ? (
            <div className="text-center py-12 text-muted-foreground">
              Buscando...
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No se encontraron usuarios</p>
            </div>
          ) : (
            users.map((searchUser) => (
              <div
                key={searchUser.id}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Avatar className="h-10 w-10 flex-shrink-0">
                    <AvatarImage src={searchUser.photo_url || undefined} />
                    <AvatarFallback>
                      {searchUser.handle[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">
                      @{searchUser.handle}
                    </p>
                    {searchUser.name && (
                      <p className="text-sm text-muted-foreground truncate">
                        {searchUser.name}
                      </p>
                    )}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant={searchUser.is_following ? "outline" : "default"}
                  onClick={() =>
                    followMutation.mutate({
                      userId: searchUser.user_id,
                      isFollowing: searchUser.is_following,
                    })
                  }
                  disabled={followMutation.isPending}
                  className="flex-shrink-0"
                >
                  {searchUser.is_following ? (
                    <>
                      <UserCheck className="h-4 w-4 mr-1" />
                      Siguiendo
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4 mr-1" />
                      Seguir
                    </>
                  )}
                </Button>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
