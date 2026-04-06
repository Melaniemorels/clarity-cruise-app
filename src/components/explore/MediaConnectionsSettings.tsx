import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  useMediaConnections,
  useDisconnectMedia,
} from "@/hooks/use-media-connections";
import { useMediaConsent, useUpdateMediaConsent } from "@/hooks/use-recommendations";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Music,
  Youtube,
  Unplug,
  Shield,
  Eye,
  Calendar,
  Activity,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  buildSpotifyAuthorizeUrl,
  buildGoogleYouTubeAuthorizeUrl,
} from "@/lib/media-oauth";

const PROVIDER_META: Record<
  string,
  { name: string; icon: React.ElementType; dataAccessKey: string }
> = {
  spotify: {
    name: "Spotify",
    icon: Music,
    dataAccessKey: "mediaConnections.spotifyDataAccess",
  },
  youtube: {
    name: "YouTube",
    icon: Youtube,
    dataAccessKey: "mediaConnections.youtubeDataAccess",
  },
};

export function MediaConnectionsSettings() {
  const { t } = useTranslation();
  const { data: connections = [], isLoading } = useMediaConnections();
  const disconnectMutation = useDisconnectMedia();
  const { data: consent } = useMediaConsent();
  const updateConsent = useUpdateMediaConsent();

  const handleDisconnect = (provider: string) => {
    disconnectMutation.mutate(provider, {
      onSuccess: () =>
        toast.success(
          t("mediaConnections.disconnected", {
            provider: PROVIDER_META[provider]?.name || provider,
          })
        ),
      onError: () => toast.error(t("errors.generic")),
    });
  };

  const handleConsentToggle = (
    key: "share_media_preferences" | "share_health_data" | "share_calendar_patterns",
    value: boolean
  ) => {
    updateConsent.mutate(
      { [key]: value },
      { onError: () => toast.error(t("errors.generic")) }
    );
  };

  return (
    <div className="space-y-6">
      {/* Connected Services */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">
              {t("mediaConnections.settingsTitle")}
            </CardTitle>
          </div>
          <CardDescription className="text-sm">
            {t("mediaConnections.settingsDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Spotify */}
          <ConnectionRow
            provider="spotify"
            isConnected={connections.some((c) => c.provider === "spotify")}
            onDisconnect={() => handleDisconnect("spotify")}
            isDisconnecting={disconnectMutation.isPending}
            t={t}
          />
          {/* YouTube */}
          <ConnectionRow
            provider="youtube"
            isConnected={connections.some((c) => c.provider === "youtube")}
            onDisconnect={() => handleDisconnect("youtube")}
            isDisconnecting={disconnectMutation.isPending}
            t={t}
          />
        </CardContent>
      </Card>

      {/* Data Access Controls */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">
              {t("mediaConnections.dataAccessTitle")}
            </CardTitle>
          </div>
          <CardDescription className="text-sm">
            {t("mediaConnections.dataAccessDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Music className="h-4 w-4 text-muted-foreground" />
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">
                  {t("recommendations.mediaPreferences")}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {t("mediaConnections.mediaDataDesc")}
                </p>
              </div>
            </div>
            <Switch
              checked={consent?.share_media_preferences || false}
              onCheckedChange={(checked) =>
                handleConsentToggle("share_media_preferences", checked)
              }
              disabled={updateConsent.isPending}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">
                  {t("recommendations.healthData")}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {t("recommendations.healthDataDescription")}
                </p>
              </div>
            </div>
            <Switch
              checked={consent?.share_health_data || false}
              onCheckedChange={(checked) =>
                handleConsentToggle("share_health_data", checked)
              }
              disabled={updateConsent.isPending}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">
                  {t("recommendations.calendarData")}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {t("recommendations.calendarDataDescription")}
                </p>
              </div>
            </div>
            <Switch
              checked={consent?.share_calendar_patterns || false}
              onCheckedChange={(checked) =>
                handleConsentToggle("share_calendar_patterns", checked)
              }
              disabled={updateConsent.isPending}
            />
          </div>
        </CardContent>
      </Card>

      {/* Privacy Summary */}
      <p className="text-xs text-center text-muted-foreground px-4">
        {t("recommendations.privacyNotice")}
      </p>
    </div>
  );
}

function ConnectionRow({
  provider,
  isConnected,
  onDisconnect,
  isDisconnecting,
  t,
}: {
  provider: string;
  isConnected: boolean;
  onDisconnect: () => void;
  isDisconnecting: boolean;
  t: (key: string) => string;
}) {
  const meta = PROVIDER_META[provider];
  if (!meta) return null;
  const Icon = meta.icon;

  const handleConnect = () => {
    const url =
      provider === "spotify"
        ? buildSpotifyAuthorizeUrl()
        : buildGoogleYouTubeAuthorizeUrl();
    if (!url) {
      toast.error(t("mediaConnections.credentialsNeeded"));
      if (import.meta.env.DEV) {
        console.warn(
          `[media OAuth] Missing VITE_${provider === "spotify" ? "SPOTIFY_CLIENT_ID" : "GOOGLE_CLIENT_ID"} — add to .env and register redirect URI:`,
          `${typeof window !== "undefined" ? window.location.origin : ""}/media-connections`
        );
      }
      return;
    }
    window.location.assign(url);
  };

  return (
    <div
      className={cn(
        "flex items-center justify-between p-3 rounded-xl border",
        isConnected ? "bg-primary/5 border-primary/15" : "bg-muted/30 border-border/50"
      )}
    >
      <div className="flex items-center gap-3">
        <div className={cn("p-2 rounded-lg", isConnected ? "bg-primary/10" : "bg-muted")}>
          <Icon className={cn("h-4 w-4", isConnected ? "text-primary" : "text-muted-foreground")} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{meta.name}</span>
            {isConnected && (
              <Badge variant="success" className="text-[10px] px-1.5 py-0">
                <CheckCircle2 className="h-3 w-3 mr-0.5" />
                {t("mediaConnections.connected")}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {isConnected
              ? t("mediaConnections.readOnlyAccess")
              : t("mediaConnections.notConnected")}
          </p>
        </div>
      </div>

      {isConnected ? (
        <Button
          size="sm"
          variant="ghost"
          className="text-destructive hover:text-destructive hover:bg-destructive/10 text-xs gap-1"
          onClick={onDisconnect}
          disabled={isDisconnecting}
        >
          <Unplug className="h-3 w-3" />
          {t("mediaConnections.disconnect")}
        </Button>
      ) : (
        <Button
          size="sm"
          variant="outline"
          className="text-xs gap-1 rounded-full border-primary/40 text-primary hover:bg-primary/10"
          onClick={handleConnect}
        >
          {t("mediaConnections.connect")}
        </Button>
      )}
    </div>
  );
}
