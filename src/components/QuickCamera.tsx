import { useState, useRef } from "react";
import { Camera, X, SwitchCamera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

type FilterType = "natural" | "bw";
type FacingMode = "environment" | "user";

interface QuickCameraProps {
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const QuickCamera = ({ isOpen: controlledOpen, onOpenChange }: QuickCameraProps) => {
  const { t } = useTranslation();
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setIsOpen = onOpenChange || setInternalOpen;
  const [filter, setFilter] = useState<FilterType>("natural");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [capturedTimestamp, setCapturedTimestamp] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [facingMode, setFacingMode] = useState<FacingMode>("environment");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const { user } = useAuth();

  const startCamera = async (mode: FacingMode = facingMode) => {
    // Stop existing stream first
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Failed to start camera:", error);
      }
      toast.error(t('camera.cameraError'));
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const toggleCamera = () => {
    const newMode: FacingMode = facingMode === "environment" ? "user" : "environment";
    setFacingMode(newMode);
    startCamera(newMode);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;

    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    // Mirror the image if using front camera
    if (facingMode === "user") {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(videoRef.current, 0, 0);

    // Reset transform
    if (facingMode === "user") {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }

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
    const timestamp = new Date().toISOString();
    setCapturedImage(imageUrl);
    setCapturedTimestamp(timestamp);
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
      return { emoji: "📸", label: t('calendar.instantCapture'), category: "otro" };
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

      // Use captured timestamp for accurate timing
      const timestamp = capturedTimestamp || new Date().toISOString();

      // Analyze the image with AI to get category and label
      const analysis = await analyzeImage(urlData.publicUrl);
      const activityTag = `${analysis.emoji} ${analysis.label}`;

      // Save to entries (almanac/profile)
      const { error: entryError } = await supabase.from("entries").insert({
        user_id: user.id,
        photo_url: urlData.publicUrl,
        caption: "",
        occurred_at: timestamp,
        visibility: "public",
      });

      if (entryError) throw entryError;

      // Auto-publish to posts (feed) with preserved timestamp
      const { error: postError } = await supabase.from("posts").insert({
        user_id: user.id,
        image_url: urlData.publicUrl,
        caption: "",
        activity_tag: activityTag,
        created_at: timestamp,
      });

      if (postError) throw postError;

      // Create calendar block for the capture with preserved timestamp
      const captureTime = new Date(timestamp);
      const endTime = new Date(captureTime.getTime() + 30 * 60 * 1000).toISOString();

      const { error: blockError } = await supabase.from("schedule_blocks").insert({
        user_id: user.id,
        title: activityTag,
        start_at: timestamp,
        end_at: endTime,
        visibility: "public",
        note: urlData.publicUrl,
      });

      if (blockError) throw blockError;

      toast.success(t('camera.photoSaved'));
      setIsOpen(false);
      setCapturedImage(null);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Error uploading photo:", error);
      }
      toast.error(t('camera.uploadError'));
    } finally {
      setIsUploading(false);
    }
  };

  const handleOpen = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      setCapturedImage(null);
      setCapturedTimestamp(null);
      startCamera(facingMode);
    } else {
      stopCamera();
      setCapturedImage(null);
      setCapturedTimestamp(null);
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
          {t('camera.title')}
        </Button>
      )}

      <Dialog open={isOpen} onOpenChange={handleOpen}>
        <DialogContent className="max-w-md pt-10 pb-9">
          <div className="flex flex-col items-center justify-center min-h-[500px]">
            <DialogHeader className="text-center pb-4 mb-5">
              <DialogTitle className="text-foreground text-[22px] font-semibold tracking-wide text-center">
                {t('camera.title')}
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
                    } ${facingMode === "user" ? "scale-x-[-1]" : ""}`}
                  />
                  
                  {/* Camera toggle button */}
                  <Button
                    variant="secondary"
                    size="icon"
                    onClick={toggleCamera}
                    className="absolute top-3 right-3 bg-background/60 hover:bg-background/80 backdrop-blur-sm rounded-full"
                  >
                    <SwitchCamera className="h-5 w-5" strokeWidth={1.4} />
                  </Button>
                </div>

                <div className="flex gap-3 justify-center mt-5 w-[84%]">
                  <Button
                    variant={filter === "natural" ? "default" : "outline"}
                    onClick={() => setFilter("natural")}
                    className="rounded-[22px] h-[42px] px-6 font-semibold transition-all duration-150"
                  >
                    {t('camera.natural')}
                  </Button>
                  <Button
                    variant={filter === "bw" ? "default" : "outline"}
                    onClick={() => setFilter("bw")}
                    className="rounded-[22px] h-[42px] px-6 font-semibold transition-all duration-150"
                  >
                    {t('camera.blackAndWhite')}
                  </Button>
                </div>

                <Button 
                  onClick={capturePhoto} 
                  size="lg" 
                  className="mt-6 w-[84%] rounded-[30px] h-[54px] text-base font-semibold bg-gradient-to-b from-accent to-primary hover:opacity-90 transition-transform duration-150 hover:scale-[0.98]"
                >
                  <Camera className="mr-2" size={18} strokeWidth={1.4} />
                  {t('camera.capture')}
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
                      setCapturedTimestamp(null);
                      startCamera(facingMode);
                    }}
                    className="flex-1"
                  >
                    <X className="mr-2 h-4 w-4" />
                    {t('camera.retry')}
                  </Button>
                  <Button
                    onClick={uploadAndCreate}
                    disabled={isUploading}
                    className="flex-1"
                  >
                    {isUploading ? t('camera.saving') : t('camera.save')}
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
