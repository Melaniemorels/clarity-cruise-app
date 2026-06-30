import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Play, Pause, SkipBack, SkipForward, Volume2, Heart } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { useState } from "react";

interface ContentPlayerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  content: {
    title: string;
    category: string;
    icon: string;
    duration: string;
    color: string;
  } | null;
}

export const ContentPlayer = ({ open, onOpenChange, content }: ContentPlayerProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState([75]);
  const [progress, setProgress] = useState([0]);
  const [isFavorite, setIsFavorite] = useState(false);

  if (!content) return null;

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
    if (!isPlaying) {
      // Simulate progress
      const interval = setInterval(() => {
        setProgress(prev => {
          const newProgress = prev[0] + 1;
          if (newProgress >= 100) {
            clearInterval(interval);
            setIsPlaying(false);
            return [100];
          }
          return [newProgress];
        });
      }, 1000);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{content.category}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Album Art / Visual */}
          <div className={`aspect-square rounded-lg bg-gradient-to-br ${content.color} flex items-center justify-center`}>
            <div className="text-8xl">{content.icon}</div>
          </div>

          {/* Title and Duration */}
          <div className="text-center space-y-1">
            <h3 className="font-semibold text-lg">{content.title}</h3>
            <p className="text-sm text-muted-foreground">{content.duration}</p>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <Slider
              value={progress}
              onValueChange={setProgress}
              max={100}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{Math.floor((progress[0] / 100) * parseInt(content.duration))}m</span>
              <span>{content.duration}</span>
            </div>
          </div>

          {/* Playback Controls */}
          <div className="flex items-center justify-center gap-4">
            <Button size="icon" variant="ghost">
              <SkipBack className="h-5 w-5" />
            </Button>
            
            <Button 
              size="icon" 
              className="h-14 w-14"
              onClick={handlePlayPause}
            >
              {isPlaying ? (
                <Pause className="h-6 w-6" />
              ) : (
                <Play className="h-6 w-6" />
              )}
            </Button>
            
            <Button size="icon" variant="ghost">
              <SkipForward className="h-5 w-5" />
            </Button>
          </div>

          {/* Volume and Favorite */}
          <div className="flex items-center gap-3">
            <Volume2 className="h-4 w-4 text-muted-foreground" />
            <Slider
              value={volume}
              onValueChange={setVolume}
              max={100}
              step={1}
              className="flex-1"
            />
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setIsFavorite(!isFavorite)}
            >
              <Heart className={`h-5 w-5 ${isFavorite ? 'fill-primary text-primary' : ''}`} />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
