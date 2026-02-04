import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Heart, MoreHorizontal, Pencil, Archive, Trash2, Loader2 } from "lucide-react";
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
  
  // Edit dialog state
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editCaption, setEditCaption] = useState(post.caption || "");
  const [editActivityTag, setEditActivityTag] = useState(post.activity_tag || "");
  
  // Delete confirmation state
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const hasLiked = optimisticLike !== null ? optimisticLike : post.user_has_liked;
  const likesCount = optimisticCount !== null ? optimisticCount : post.likes_count;
  const isOwner = user?.id === post.user_id;

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

  const editMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Usuario no autenticado");

      const { error } = await supabase
        .from("posts")
        .update({
          caption: editCaption.trim() || null,
          activity_tag: editActivityTag.trim() || null,
        })
        .eq("id", post.id)
        .eq("user_id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Post actualizado");
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      setIsEditOpen(false);
    },
    onError: (error) => {
      toast.error("Error al actualizar el post");
      console.error(error);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Usuario no autenticado");

      const { error } = await supabase
        .from("posts")
        .delete()
        .eq("id", post.id)
        .eq("user_id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Post eliminado");
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      setIsDeleteOpen(false);
    },
    onError: (error) => {
      toast.error("Error al eliminar el post");
      console.error(error);
    },
  });

  const handleLike = () => {
    if (!user) {
      toast.error("Inicia sesión para dar like");
      return;
    }
    likeMutation.mutate();
  };

  const handleEdit = () => {
    setEditCaption(post.caption || "");
    setEditActivityTag(post.activity_tag || "");
    setIsEditOpen(true);
  };

  const handleArchive = () => {
    // For now, archive works as a soft delete - we'll show a toast
    toast.info("Función de archivar próximamente disponible");
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
    <>
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
            
            {/* 3-dot menu - only visible to post owner */}
            {isOwner && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  >
                    <MoreHorizontal className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                  align="end" 
                  className="w-48 rounded-xl border-border/50 shadow-xl bg-popover"
                >
                  <DropdownMenuItem 
                    onClick={handleEdit}
                    className="py-3 cursor-pointer focus:bg-muted"
                  >
                    <Pencil className="mr-3 h-4 w-4 text-primary" />
                    <span className="font-medium">Editar</span>
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem 
                    onClick={handleArchive}
                    className="py-3 cursor-pointer focus:bg-muted"
                  >
                    <Archive className="mr-3 h-4 w-4 text-amber-500" />
                    <span className="font-medium">Archivar</span>
                  </DropdownMenuItem>
                  
                  <DropdownMenuSeparator />
                  
                  <DropdownMenuItem 
                    onClick={() => setIsDeleteOpen(true)}
                    className="py-3 cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
                  >
                    <Trash2 className="mr-3 h-4 w-4" />
                    <span className="font-medium">Eliminar</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
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

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar post</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-caption">Descripción</Label>
              <Textarea
                id="edit-caption"
                value={editCaption}
                onChange={(e) => setEditCaption(e.target.value)}
                placeholder="Escribe una descripción..."
                className="min-h-[100px] resize-none"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-activity">Actividad</Label>
              <Input
                id="edit-activity"
                value={editActivityTag}
                onChange={(e) => setEditActivityTag(e.target.value)}
                placeholder="ej: Yoga, Gym, Running..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditOpen(false)}
              disabled={editMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              onClick={() => editMutation.mutate()}
              disabled={editMutation.isPending}
            >
              {editMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                "Guardar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este post?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El post será eliminado permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Eliminando...
                </>
              ) : (
                "Eliminar"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};