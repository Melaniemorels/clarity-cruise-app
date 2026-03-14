import { useTranslation } from "react-i18next";
import { ResponsiveNav, useNavStyle } from "@/components/ResponsiveNav";
import { AdaptiveHeading } from "@/components/AdaptiveLayout";
import { useDevice } from "@/hooks/use-device";
import { MediaConnectionsSettings } from "@/components/explore/MediaConnectionsSettings";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

export default function MediaConnectionsPage() {
  const { t } = useTranslation();
  const device = useDevice();
  const navStyle = useNavStyle();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-theme-bg transition-all duration-300" style={navStyle}>
      <div className={cn(
        "mx-auto transition-all duration-300",
        device.isDesktop ? "max-w-2xl" : device.isTablet ? "max-w-xl" : "max-w-full"
      )}>
        {/* Header */}
        <div className="sticky top-0 z-10 backdrop-blur bg-theme-bgElevated/80 border-b border-theme-borderSubtle">
          <div className={cn(
            "flex items-center gap-3 transition-all",
            device.isMobile ? "p-4" : "p-5"
          )}>
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <AdaptiveHeading level={1}>
              {t("mediaConnections.connectionsSettings")}
            </AdaptiveHeading>
          </div>
        </div>

        <div className="p-4 space-y-6">
          <MediaConnectionsSettings />
        </div>
      </div>
      <ResponsiveNav />
    </div>
  );
}
