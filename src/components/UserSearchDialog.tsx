import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Search, UserPlus, UserCheck, X } from "lucide-react";
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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[90vh] p-0 flex flex-col">
        <SheetHeader className="px-4 pt-4 pb-3 border-b border-border sticky top-0 bg-background z-10">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-xl">Buscar Amigos</SheetTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="h-8 w-8"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </SheetHeader>

        <div className="px-4 py-3 border-b border-border sticky top-[60px] bg-background z-10">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Buscar por @usuario..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-11 text-base"
              autoFocus
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-2">
          {!searchQuery.trim() ? (
            <div className="text-center py-16 text-muted-foreground">
              <Search className="h-16 w-16 mx-auto mb-3 opacity-30" />
              <p className="text-lg">Busca usuarios por su @handle</p>
            </div>
          ) : isLoading ? (
            <div className="text-center py-16 text-muted-foreground">
              <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-3" />
              <p>Buscando...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <p className="text-lg">No se encontraron usuarios</p>
            </div>
          ) : (
            <div className="space-y-1">
              {users.map((searchUser) => (
                <div
                  key={searchUser.id}
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 transition-colors active:scale-[0.98]"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Avatar className="h-12 w-12 flex-shrink-0">
                      <AvatarImage src={searchUser.photo_url || undefined} />
                      <AvatarFallback className="text-lg">
                        {searchUser.handle[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold truncate text-base">
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
                    className="flex-shrink-0 h-9 px-4"
                  >
                    {searchUser.is_following ? (
                      <>
                        <UserCheck className="h-4 w-4 mr-1.5" />
                        Siguiendo
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-4 w-4 mr-1.5" />
                        Seguir
                      </>
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
