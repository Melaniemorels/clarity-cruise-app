import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";
import vyvIcon from "@/assets/vyv-icon.jpeg";

const Welcome = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();

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
            <div className="absolute inset-0 bg-luxury-emerald/20 blur-3xl rounded-full" />
            <img
              src={vyvIcon}
              alt="VYV Logo"
              className="relative z-10 w-48 h-48 object-contain"
              style={{ filter: 'drop-shadow(0 0 12px rgba(107, 223, 168, 0.4))' }}
            />
          </div>
        </div>

        {/* Title */}
        <div className="space-y-4 animate-in slide-in-from-bottom duration-700 delay-300">
          <h1 className="text-5xl font-bold text-luxury-emerald">
            VYV
          </h1>
          <p className="text-2xl font-semibold text-luxury-emerald/90">
            {t('welcome.tagline')}
          </p>
          <p className="text-muted-foreground max-w-sm mx-auto">
            {t('welcome.description')}
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="space-y-3 pt-8 animate-in slide-in-from-bottom duration-700 delay-500">
          <Button
            onClick={() => navigate("/auth")}
            size="lg"
            className="w-full bg-gradient-to-r from-primary to-luxury-emerald hover:opacity-90 transition-opacity"
          >
            {t('welcome.getStarted')}
          </Button>
          
          <p className="text-xs text-muted-foreground">
            {t('welcome.footerHint')}
          </p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-3 gap-4 pt-8 animate-in fade-in duration-700 delay-700">
          <div className="space-y-2">
            <div className="text-3xl">📸</div>
            <p className="text-xs text-muted-foreground">{t('welcome.features.quickCapture')}</p>
          </div>
          <div className="space-y-2">
            <div className="text-3xl">⏰</div>
            <p className="text-xs text-muted-foreground">{t('welcome.features.focusMode')}</p>
          </div>
          <div className="space-y-2">
            <div className="text-3xl">🌿</div>
            <p className="text-xs text-muted-foreground">{t('welcome.features.wellness')}</p>
          </div>
        </div>

        {/* Public footer — crawlable links for search engines */}
        <nav className="pt-8 animate-in fade-in duration-700 delay-700">
          <ul className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <li><Link to="/members" className="hover:text-foreground transition-colors">Members</Link></li>
            <li><Link to="/sign-in" className="hover:text-foreground transition-colors">Sign In</Link></li>
            <li><Link to="/sign-up" className="hover:text-foreground transition-colors">Sign Up</Link></li>
            <li><Link to="/privacy-policy" className="hover:text-foreground transition-colors">Privacy Policy</Link></li>
            <li><Link to="/terms-of-use" className="hover:text-foreground transition-colors">Terms of Use</Link></li>
          </ul>
        </nav>
      </div>
    </div>
  );
};

export default Welcome;
