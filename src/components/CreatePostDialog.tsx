import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";

interface CreatePostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ACTIVITY_TAGS = [
  { value: "comida", label: "🍽️ Comida" },
  { value: "gym", label: "💪 Gym" },
  { value: "meditación", label: "🧘 Meditación" },
  { value: "estudio", label: "📚 Estudio" },
  { value: "otros", label: "✨ Otros" },
];

export const CreatePostDialog = ({ open, onOpenChange }: CreatePostDialogProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [caption, setCaption] = useState("");
  const [activityTag, setActivityTag] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const lastSubmitTime = useRef<number>(0);
  const DEBOUNCE_MS = 800;

  const createPostMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Usuario no autenticado");
      if (!imageFile) throw new Error("Imagen requerida");

      setUploadError(null);

      try {
        // Upload image to storage
        const fileExt = imageFile.name.split(".").pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from("images")
          .upload(fileName, imageFile, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) {
          throw new Error(`Error al subir imagen: ${uploadError.message}`);
        }

        const { data: { publicUrl } } = supabase.storage
          .from("images")
          .getPublicUrl(fileName);

        // Insert post into database
        const { error: insertError } = await supabase
          .from("posts")
          .insert({
            user_id: user.id,
            caption: caption.trim() || null,
            activity_tag: activityTag || null,
            image_url: publicUrl,
          });

        if (insertError) {
          // Clean up uploaded image if post creation fails
          await supabase.storage.from("images").remove([fileName]);
          throw new Error(`Error al crear post: ${insertError.message}`);
        }

        return true;
      } catch (error) {
        if (error instanceof Error) {
          throw error;
        }
        throw new Error("Error desconocido al crear post");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      toast.success("Publicado");
      handleClose();
      navigate("/");
    },
    onError: (error) => {
      const errorMessage = error instanceof Error ? error.message : "Error al crear post";
      setUploadError(errorMessage);
      toast.error(errorMessage, {
        action: {
          label: "Reintentar",
          onClick: () => {
            setUploadError(null);
            handleSubmit(new Event("submit") as any);
          },
        },
      });
    },
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
      if (!validTypes.includes(file.type)) {
        toast.error("Formato de imagen no válido. Usa JPG, PNG o WEBP");
        return;
      }

      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error("La imagen no puede superar 5MB");
        return;
      }

      setImageFile(file);
      setUploadError(null);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setUploadError(null);
  };

  const handleClose = () => {
    if (!createPostMutation.isPending) {
      setCaption("");
      setActivityTag("");
      setImageFile(null);
      setImagePreview(null);
      setUploadError(null);
      onOpenChange(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Debounce to prevent repeated taps
    const now = Date.now();
    if (now - lastSubmitTime.current < DEBOUNCE_MS) {
      return;
    }
    lastSubmitTime.current = now;

    // Validate image is required
    if (!imageFile) {
      toast.error("La imagen es obligatoria");
      return;
    }

    // Validate caption length
    if (caption.trim() && caption.length > 140) {
      toast.error("El caption no puede tener más de 140 caracteres");
      return;
    }

    createPostMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Crear Post</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="image" className="flex items-center gap-2">
              Imagen <span className="text-destructive text-xs">*obligatoria</span>
            </Label>
            <div className="flex flex-col gap-3">
              {!imagePreview ? (
                <label
                  htmlFor="image"
                  className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary transition-colors bg-muted/50"
                >
                  <Upload className="h-12 w-12 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Haz clic para subir una imagen
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    JPG, PNG o WEBP (máx. 5MB)
                  </p>
                </label>
              ) : (
                <div className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={handleRemoveImage}
                    disabled={createPostMutation.isPending}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
              <Input
                id="image"
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handleImageChange}
                disabled={createPostMutation.isPending}
                className="hidden"
              />
            </div>
            {uploadError && (
              <p className="text-sm text-destructive">{uploadError}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="caption">
              Caption <span className="text-muted-foreground text-xs">(opcional, {caption.length}/140)</span>
            </Label>
            <Textarea
              id="caption"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="¿Qué está pasando?"
              maxLength={140}
              rows={3}
              disabled={createPostMutation.isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tag">
              Etiqueta de actividad <span className="text-muted-foreground text-xs">(opcional)</span>
            </Label>
            <Select
              value={activityTag}
              onValueChange={setActivityTag}
              disabled={createPostMutation.isPending}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona una actividad" />
              </SelectTrigger>
              <SelectContent>
                {ACTIVITY_TAGS.map((tag) => (
                  <SelectItem key={tag.value} value={tag.value}>
                    {tag.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={createPostMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={createPostMutation.isPending || !imageFile}
            >
              {createPostMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Publicando...
                </>
              ) : (
                "Publicar"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
