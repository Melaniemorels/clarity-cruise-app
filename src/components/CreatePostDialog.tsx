import { useState, useRef, useEffect } from "react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Camera, RotateCcw, MoreHorizontal, Trash2, RefreshCw } from "lucide-react";
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
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lastSubmitTime = useRef<number>(0);
  const DEBOUNCE_MS = 800;

  // Start camera
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsCameraActive(true);
      }
    } catch (error) {
      console.error("Error accessing camera:", error);
      toast.error("No se pudo acceder a la cámara");
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  // Capture photo with B&W filter
  const capturePhoto = () => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");

    if (ctx) {
      ctx.filter = "grayscale(100%)";
      ctx.drawImage(video, 0, 0);
      
      const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
      setCapturedImage(dataUrl);
      stopCamera();

      // Convert to File
      fetch(dataUrl)
        .then(res => res.blob())
        .then(blob => {
          const file = new File([blob], `photo-${Date.now()}.jpg`, { type: "image/jpeg" });
          setImageFile(file);
          setImagePreview(dataUrl);
        });
    }
  };

  // Clear photo and go back to camera
  const clearPhotoAndRetry = () => {
    setCapturedImage(null);
    setImageFile(null);
    setImagePreview(null);
    startCamera();
  };

  // Just clear photo without restarting camera
  const clearPhoto = () => {
    setCapturedImage(null);
    setImageFile(null);
    setImagePreview(null);
    stopCamera();
    toast.success("Foto eliminada");
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Start camera when dialog opens
  useEffect(() => {
    if (open) {
      startCamera();
    } else {
      stopCamera();
      setCapturedImage(null);
    }
  }, [open]);

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

        // Create calendar event
        const now = new Date();
        const eventEnd = new Date(now.getTime() + 15 * 60000); // 15 minutes later
        
        await (supabase as any).from("calendar_events").insert({
          user_id: user.id,
          title: "Momento capturado",
          category: activityTag || "otros",
          starts_at: now.toISOString(),
          ends_at: eventEnd.toISOString(),
          notes: caption.trim() || null,
        });

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

  const handleClose = () => {
    if (!createPostMutation.isPending) {
      setCaption("");
      setActivityTag("");
      setImageFile(null);
      setImagePreview(null);
      setCapturedImage(null);
      setUploadError(null);
      stopCamera();
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
      toast.error("Debes capturar una foto primero");
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
          <DialogTitle>Capturar Momento</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Camera View */}
          {isCameraActive && !capturedImage && (
            <div className="relative">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-64 object-cover"
                style={{ 
                  filter: "grayscale(100%)",
                  borderRadius: '22px',
                  border: '1px solid rgba(255,255,255,0.07)',
                  boxShadow: '0 0 12px rgba(0,0,0,0.4)',
                  backgroundColor: '#1F1F1F'
                }}
              />
              <Button
                type="button"
                size="lg"
                className="absolute bottom-4 left-1/2 -translate-x-1/2"
                onClick={capturePhoto}
              >
                <Camera className="w-5 h-5 mr-2" />
                Capturar
              </Button>
            </div>
          )}

          {/* Captured Image Preview */}
          {capturedImage && (
            <div className="relative group">
              <img
                src={capturedImage}
                alt="Captured"
                className="w-full h-64 object-cover"
                style={{
                  borderRadius: '22px',
                  border: '1px solid rgba(255,255,255,0.07)',
                  boxShadow: '0 0 12px rgba(0,0,0,0.4)',
                  backgroundColor: '#1F1F1F'
                }}
              />
              
              {/* Instagram-style options menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    className="absolute top-3 right-3 bg-black/60 hover:bg-black/80 border-0 backdrop-blur-sm"
                    disabled={createPostMutation.isPending}
                  >
                    <MoreHorizontal className="w-5 h-5 text-white" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                  align="end" 
                  className="w-48 rounded-xl border-border/50 shadow-xl"
                >
                  <DropdownMenuItem 
                    onClick={clearPhotoAndRetry}
                    className="py-3 cursor-pointer focus:bg-muted"
                  >
                    <RefreshCw className="mr-3 h-4 w-4 text-primary" />
                    <span className="font-medium">Tomar otra foto</span>
                  </DropdownMenuItem>
                  
                  <DropdownMenuSeparator />
                  
                  <DropdownMenuItem 
                    onClick={clearPhoto}
                    className="py-3 cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
                  >
                    <Trash2 className="mr-3 h-4 w-4" />
                    <span className="font-medium">Eliminar foto</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}

          {/* Form - only show after capture */}
          {capturedImage && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {uploadError && (
                <p className="text-sm text-destructive">{uploadError}</p>
              )}

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
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
