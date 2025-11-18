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

  const uploadAndCreate = async () => {
    if (!capturedImage || !user) return;

    setIsUploading(true);
    try {
      const blob = await fetch(capturedImage).then((r) => r.blob());
      const fileName = `${user.id}/${Date.now()}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from("quick-captures")
        .upload(fileName, blob);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("quick-captures")
        .getPublicUrl(fileName);

      const now = new Date().toISOString();

      const { error: entryError } = await supabase.from("entries").insert({
        user_id: user.id,
        photo_url: urlData.publicUrl,
        caption: "",
        occurred_at: now,
        visibility: "private",
      });

      if (entryError) throw entryError;

      const endTime = new Date(Date.now() + 30 * 60 * 1000).toISOString();

      const { error: blockError } = await supabase.from("schedule_blocks").insert({
        user_id: user.id,
        title: "Quick Capture",
        start_at: now,
        end_at: endTime,
        visibility: "private",
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
          className="w-full bg-primary hover:bg-primary/90"
        >
          <Camera className="mr-2 h-5 w-5" />
          Captura Rápida
        </Button>
      )}

      <Dialog open={isOpen} onOpenChange={handleOpen}>
        <DialogContent className="max-w-md" style={{ paddingTop: '28px' }}>
          <DialogHeader className="text-center" style={{
            boxShadow: '0 2px 10px rgba(0,0,0,0.35)',
            paddingBottom: '16px',
            marginBottom: '32px'
          }}>
            <DialogTitle style={{
              fontSize: '22px',
              fontWeight: 600,
              letterSpacing: '0.3px',
              color: '#F5F5F5'
            }}>
              Captura Rápida
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4" style={{ marginTop: '24px', marginBottom: '24px' }}>
            {!capturedImage ? (
              <>
                <div 
                  className="relative aspect-[4/3] overflow-hidden"
                  style={{
                    borderRadius: '26px',
                    border: '1px solid rgba(255,255,255,0.05)',
                    boxShadow: '0 4px 14px rgba(0,0,0,0.35)',
                    background: 'linear-gradient(180deg, #1C1C1C, #151515)'
                  }}
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

                <div className="flex gap-2 justify-center">
                  <Button
                    variant="ghost"
                    onClick={() => setFilter("natural")}
                    className="transition-all duration-[140ms]"
                    style={{
                      borderRadius: '20px',
                      height: '40px',
                      fontSize: '14px',
                      fontWeight: 600,
                      paddingLeft: '24px',
                      paddingRight: '24px',
                      backgroundColor: filter === "natural" ? '#2E5C4F' : 'transparent',
                      color: filter === "natural" ? '#FFFFFF' : '#C7C7C7',
                      border: filter === "natural" ? 'none' : '1px solid rgba(255,255,255,0.18)',
                      boxShadow: filter === "natural" ? '0 2px 8px rgba(0,0,0,0.25)' : 'none'
                    }}
                  >
                    Natural
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setFilter("bw")}
                    className="transition-all duration-[140ms]"
                    style={{
                      borderRadius: '20px',
                      height: '40px',
                      fontSize: '14px',
                      fontWeight: 600,
                      paddingLeft: '24px',
                      paddingRight: '24px',
                      backgroundColor: filter === "bw" ? '#2E5C4F' : 'transparent',
                      color: filter === "bw" ? '#FFFFFF' : '#C7C7C7',
                      border: filter === "bw" ? 'none' : '1px solid rgba(255,255,255,0.18)',
                      boxShadow: filter === "bw" ? '0 2px 8px rgba(0,0,0,0.25)' : 'none'
                    }}
                  >
                    Blanco y Negro
                  </Button>
                </div>

                <Button 
                  onClick={capturePhoto} 
                  size="lg" 
                  className="w-full transition-transform duration-[120ms] hover:scale-[0.98]"
                  style={{
                    borderRadius: '28px',
                    height: '54px',
                    background: 'linear-gradient(180deg, #49D3A0, #37B680)',
                    color: '#FFFFFF',
                    fontSize: '16px',
                    fontWeight: 600,
                    boxShadow: '0 4px 16px rgba(0,0,0,0.28), 0 0 28px rgba(70,200,140,0.22)'
                  }}
                >
                  <Camera className="mr-2" size={18} strokeWidth={1.4} />
                  Capturar
                </Button>
              </>
            ) : (
              <>
                <div 
                  className="relative aspect-[4/3] overflow-hidden"
                  style={{
                    borderRadius: '26px',
                    border: '1px solid rgba(255,255,255,0.05)',
                    boxShadow: '0 4px 14px rgba(0,0,0,0.35)',
                    background: 'linear-gradient(180deg, #1C1C1C, #151515)'
                  }}
                >
                  <img
                    src={capturedImage}
                    alt="Captured"
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="flex gap-2">
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
