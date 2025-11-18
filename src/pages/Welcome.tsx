import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Sparkles } from "lucide-react";

const Welcome = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-luxury-emerald/5 to-luxury-navy/5 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8 text-center">
        {/* Logo */}
        <div className="flex justify-center mb-8 animate-in fade-in zoom-in duration-700">
          <div className="relative">
            <div className="absolute inset-0 bg-white/10 blur-2xl rounded-full" />
            <Sparkles
              size={192}
              strokeWidth={1.5}
              style={{ color: '#6BDFA8', filter: 'drop-shadow(0 0 8px rgba(255, 255, 255, 0.3))' }}
              className="relative z-10"
            />
          </div>
        </div>

        {/* Title */}
        <div className="space-y-4 animate-in slide-in-from-bottom duration-700 delay-300">
          <h1 className="text-5xl font-bold text-luxury-emerald">
            VYV
          </h1>
          <p className="text-2xl font-semibold text-luxury-emerald/90">
            Visualize Your Vibe
          </p>
          <p className="text-muted-foreground max-w-sm mx-auto">
            Una app de bienestar que te devuelve el tiempo. Mezcla y relaja tu vida con un solo hecho: que estás disfrutando lo mejor de ti.
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="space-y-3 pt-8 animate-in slide-in-from-bottom duration-700 delay-500">
          <Button
            onClick={() => navigate("/auth")}
            size="lg"
            className="w-full bg-gradient-to-r from-primary to-luxury-emerald hover:opacity-90 transition-opacity"
          >
            Comenzar
          </Button>
          
          <p className="text-xs text-muted-foreground">
            Captura momentos • Planifica tu día • Vive mejor
          </p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-3 gap-4 pt-8 animate-in fade-in duration-700 delay-700">
          <div className="space-y-2">
            <div className="text-3xl">📸</div>
            <p className="text-xs text-muted-foreground">Quick Capture</p>
          </div>
          <div className="space-y-2">
            <div className="text-3xl">⏰</div>
            <p className="text-xs text-muted-foreground">Focus Mode</p>
          </div>
          <div className="space-y-2">
            <div className="text-3xl">🌿</div>
            <p className="text-xs text-muted-foreground">Wellness</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Welcome;
