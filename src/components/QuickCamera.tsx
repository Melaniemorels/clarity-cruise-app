import { useState, useRef } from "react";
import { Camera, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

type FilterType = "natural" | "bw";

interface QuickCameraProps {
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const QuickCamera = ({ isOpen: controlledOpen, onOpenChange }: QuickCameraProps) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setIsOpen = onOpenChange || setInternalOpen;
  const [filter, setFilter] = useState<FilterType>("natural");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const { user } = useAuth();

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Failed to start camera:", error);
      }
      toast.error("No se pudo acceder a la cámara");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;

    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    ctx.drawImage(videoRef.current, 0, 0);

    if (filter === "bw") {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
        data[i] = avg;
        data[i + 1] = avg;
        data[i + 2] = avg;
      }
      ctx.putImageData(imageData, 0, 0);
    }

    const imageUrl = canvas.toDataURL("image/jpeg", 0.9);
    setCapturedImage(imageUrl);
    stopCamera();
  };

  const analyzeImage = async (imageUrl: string): Promise<{ emoji: string; label: string; category: string }> => {
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-image`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ imageUrl }),
      });

      if (!response.ok) {
        throw new Error("Failed to analyze image");
      }

      return await response.json();
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Error analyzing image:", error);
      }
      return { emoji: "📸", label: "Captura instantánea", category: "otro" };
    }
  };

  const uploadAndCreate = async () => {
    if (!capturedImage || !user) return;

    setIsUploading(true);
    try {
      const response = await fetch(capturedImage);
      const blob = await response.blob();
      const fileName = `${user.id}/${Date.now()}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from("quick-captures")
        .upload(fileName, blob, {
          contentType: 'image/jpeg',
          cacheControl: '3600',
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("quick-captures")
        .getPublicUrl(fileName);

      const now = new Date().toISOString();

      // Analyze the image with AI to get category and label
      const analysis = await analyzeImage(urlData.publicUrl);
      const activityTag = `${analysis.emoji} ${analysis.label}`;

      // Save to entries (almanac/profile)
      const { error: entryError } = await supabase.from("entries").insert({
        user_id: user.id,
        photo_url: urlData.publicUrl,
        caption: "",
        occurred_at: now,
        visibility: "public",
      });

      if (entryError) throw entryError;

      // Auto-publish to posts (feed)
      const { error: postError } = await supabase.from("posts").insert({
        user_id: user.id,
        image_url: urlData.publicUrl,
        caption: "",
        activity_tag: activityTag,
      });

      if (postError) throw postError;

      // Create calendar block for the capture
      const endTime = new Date(Date.now() + 30 * 60 * 1000).toISOString();

      const { error: blockError } = await supabase.from("schedule_blocks").insert({
        user_id: user.id,
        title: activityTag,
        start_at: now,
        end_at: endTime,
        visibility: "public",
        note: urlData.publicUrl,
      });

      if (blockError) throw blockError;

      toast.success("Foto guardada en tu calendario y perfil");
      setIsOpen(false);
      setCapturedImage(null);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Error uploading photo:", error);
      }
      toast.error("Error al guardar la foto");
    } finally {
      setIsUploading(false);
    }
  };

  const handleOpen = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      setCapturedImage(null);
      startCamera();
    } else {
      stopCamera();
      setCapturedImage(null);
    }
  };

  return (
    <>
      {controlledOpen === undefined && (
        <Button
          onClick={() => handleOpen(true)}
          size="lg"
          className="w-full"
        >
          <Camera className="mr-2 h-5 w-5" />
          Captura Rápida
        </Button>
      )}

      <Dialog open={isOpen} onOpenChange={handleOpen}>
        <DialogContent className="max-w-md pt-10 pb-9">
          <div className="flex flex-col items-center justify-center min-h-[500px]">
            <DialogHeader className="text-center pb-4 mb-5">
              <DialogTitle className="text-foreground text-[22px] font-semibold tracking-wide text-center">
                Captura Rápida
              </DialogTitle>
            </DialogHeader>
            {!capturedImage ? (
              <>
                <div 
                  className="relative overflow-hidden bg-card dark:bg-gradient-to-b dark:from-muted dark:to-background border border-border rounded-[32px] shadow-lg w-[84%] min-h-[280px]"
                >
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className={`w-full h-full object-cover ${
                      filter === "bw" ? "grayscale" : ""
                    }`}
                  />
                </div>

                <div className="flex gap-3 justify-center mt-5 w-[84%]">
                  <Button
                    variant={filter === "natural" ? "default" : "outline"}
                    onClick={() => setFilter("natural")}
                    className="rounded-[22px] h-[42px] px-6 font-semibold transition-all duration-150"
                  >
                    Natural
                  </Button>
                  <Button
                    variant={filter === "bw" ? "default" : "outline"}
                    onClick={() => setFilter("bw")}
                    className="rounded-[22px] h-[42px] px-6 font-semibold transition-all duration-150"
                  >
                    Blanco y Negro
                  </Button>
                </div>

                <Button 
                  onClick={capturePhoto} 
                  size="lg" 
                  className="mt-6 w-[84%] rounded-[30px] h-[54px] text-base font-semibold bg-gradient-to-b from-accent to-primary hover:opacity-90 transition-transform duration-150 hover:scale-[0.98]"
                >
                  <Camera className="mr-2" size={18} strokeWidth={1.4} />
                  Capturar
                </Button>
              </>
            ) : (
              <>
                <div 
                  className="relative overflow-hidden bg-card dark:bg-gradient-to-b dark:from-muted dark:to-background border border-border rounded-[32px] shadow-lg w-[84%] min-h-[280px]"
                >
                  <img
                    src={capturedImage}
                    alt="Captured"
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="flex gap-3 mt-6 w-[84%]">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setCapturedImage(null);
                      startCamera();
                    }}
                    className="flex-1"
                  >
                    <X className="mr-2 h-4 w-4" />
                    Reintentar
                  </Button>
                  <Button
                    onClick={uploadAndCreate}
                    disabled={isUploading}
                    className="flex-1"
                  >
                    {isUploading ? "Guardando..." : "Guardar"}
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};