import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useMediaConnections } from "@/hooks/use-media-connections";
import { cn } from "@/lib/utils";
import { useDevice } from "@/hooks/use-device";
import { Music, Youtube, CheckCircle2, ExternalLink, Shield } from "lucide-react";

const PROVIDERS = [
  {
    id: "spotify",
    name: "Spotify",
    icon: Music,
    color: "from-[hsl(141,73%,42%)]/20 to-[hsl(141,73%,42%)]/5",
    borderColor: "border-[hsl(141,73%,42%)]/30",
    iconColor: "text-[hsl(141,73%,42%)]",
    scopes: ["user-top-read", "user-read-recently-played", "user-library-read"],
    description: "mediaConnections.spotifyDescription",
  },
  {
    id: "youtube",
    name: "YouTube",
    icon: Youtube,
    color: "from-[hsl(0,100%,50%)]/15 to-[hsl(0,100%,50%)]/5",
    borderColor: "border-[hsl(0,100%,50%)]/20",
    iconColor: "text-[hsl(0,100%,50%)]",
    scopes: ["https://www.googleapis.com/auth/youtube.readonly"],
    description: "mediaConnections.youtubeDescription",
  },
];

export function MediaConnectionBanner() {
  const { t } = useTranslation();
  const device = useDevice();
  const navigate = useNavigate();
  const { data: connections = [] } = useMediaConnections();

  const connectedProviders = connections.map((c) => c.provider);
  const unconnectedProviders = PROVIDERS.filter(
    (p) => !connectedProviders.includes(p.id)
  );

  if (unconnectedProviders.length === 0) return null;

  const handleConnect = () => {
    navigate("/media-connections");
  };

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent overflow-hidden">
      <CardContent className={cn("space-y-4", device.isMobile ? "p-4" : "p-5")}>
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-primary/10 flex-shrink-0">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-sm text-foreground">
              {t("mediaConnections.bannerTitle")}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t("mediaConnections.bannerDescription")}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          {PROVIDERS.map((provider) => {
            const isConnected = connectedProviders.includes(provider.id);
            const Icon = provider.icon;

            return (
              <div
                key={provider.id}
                className={cn(
                  "flex items-center justify-between p-3 rounded-xl border transition-all",
                  isConnected
                    ? "bg-primary/5 border-primary/20"
                    : "bg-card/50 border-border/50 hover:border-border"
                )}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "p-2 rounded-lg",
                      isConnected ? "bg-primary/10" : "bg-muted"
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-4 w-4",
                        isConnected ? "text-primary" : provider.iconColor
                      )}
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{provider.name}</span>
                      {isConnected && (
                        <Badge variant="success" className="text-[10px] px-1.5 py-0">
                          <CheckCircle2 className="h-3 w-3 mr-0.5" />
                          {t("mediaConnections.connected")}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t(provider.description)}
                    </p>
                  </div>
                </div>

                {!isConnected && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-full text-xs gap-1.5 border-primary/40 text-primary hover:bg-primary/10"
                    onClick={() => handleConnect()}
                  >
                    <ExternalLink className="h-3 w-3" />
                    {t("mediaConnections.connect")}
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
          {t("mediaConnections.readOnlyNotice")}
        </p>
      </CardContent>
    </Card>
  );
}
