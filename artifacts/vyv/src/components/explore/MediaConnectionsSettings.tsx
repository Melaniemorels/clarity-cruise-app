import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  useMediaConnectionStatus,
  useDisconnectMedia,
  useSyncMedia,
  type MediaConnectionStatus,
} from "@/hooks/use-media-connections";
import { formatDistanceToNow } from "date-fns";
import { es as esLocale, enUS as enLocale } from "date-fns/locale";
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
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const PROVIDER_META: Record<
  string,
  { nameKey: string; icon: React.ElementType; dataAccessKey: string }
> = {
  spotify: {
    nameKey: "explore.providers.spotify",
    icon: Music,
    dataAccessKey: "mediaConnections.spotifyDataAccess",
  },
  youtube: {
    nameKey: "explore.providers.youtube",
    icon: Youtube,
    dataAccessKey: "mediaConnections.youtubeDataAccess",
  },
};

export function MediaConnectionsSettings() {
  const { t, i18n } = useTranslation();
  const { data: statuses = [] } = useMediaConnectionStatus();
  const disconnectMutation = useDisconnectMedia();
  const syncMutation = useSyncMedia();
  const { data: consent } = useMediaConsent();
  const updateConsent = useUpdateMediaConsent();

  const handleDisconnect = (provider: string) => {
    disconnectMutation.mutate(provider, {
      onSuccess: () =>
        toast.success(
          t("mediaConnections.disconnected", {
            provider: PROVIDER_META[provider]
              ? t(PROVIDER_META[provider].nameKey)
              : provider,
          })
        ),
      onError: () => toast.error(t("errors.generic")),
    });
  };

  const handleSyncNow = (provider: string) => {
    syncMutation.mutate(provider, {
      onSuccess: () => toast.success(t("mediaConnections.syncDone")),
      onError: () => toast.error(t("mediaConnections.syncError")),
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
            status={statuses.find((s) => s.provider === "spotify")}
            onDisconnect={() => handleDisconnect("spotify")}
            onSyncNow={() => handleSyncNow("spotify")}
            isDisconnecting={disconnectMutation.isPending}
            isSyncing={
              syncMutation.isPending && syncMutation.variables === "spotify"
            }
            language={i18n.language}
            t={t}
          />
          {/* YouTube */}
          <ConnectionRow
            provider="youtube"
            status={statuses.find((s) => s.provider === "youtube")}
            onDisconnect={() => handleDisconnect("youtube")}
            onSyncNow={() => handleSyncNow("youtube")}
            isDisconnecting={disconnectMutation.isPending}
            isSyncing={
              syncMutation.isPending && syncMutation.variables === "youtube"
            }
            language={i18n.language}
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
  status,
  onDisconnect,
  onSyncNow,
  isDisconnecting,
  isSyncing,
  language,
  t,
}: {
  provider: string;
  status?: MediaConnectionStatus;
  onDisconnect: () => void;
  onSyncNow: () => void;
  isDisconnecting: boolean;
  isSyncing: boolean;
  language: string;
  t: (key: string, options?: Record<string, unknown>) => string;
}) {
  const meta = PROVIDER_META[provider];
  if (!meta) return null;
  const Icon = meta.icon;

  const state = status?.status ?? "not_connected";
  const isConnected = state === "connected" || state === "sync_error";
  const needsReconnect = state === "token_expired";

  // OAuth is driven server-side (client_id/secret never reach the browser).
  // Top-level navigation carries the Clerk session cookie, so the API can
  // identify the user, sign the OAuth state and bounce through the provider.
  const CONNECT_PATHS: Record<string, string> = {
    youtube: `${import.meta.env.VITE_SUPABASE_URL}/media/youtube/connect`,
    spotify: `${import.meta.env.VITE_SUPABASE_URL}/media/spotify/connect`,
  };

  const handleConnect = () => {
    const path = CONNECT_PATHS[provider];
    if (!path) return; // provider not yet available
    window.location.href = path;
  };

  const dateLocale = language?.startsWith("es") ? esLocale : enLocale;
  const lastSyncLabel = status?.last_sync_at
    ? t("mediaConnections.lastSync", {
        time: formatDistanceToNow(new Date(status.last_sync_at), {
          addSuffix: true,
          locale: dateLocale,
        }),
      })
    : t("mediaConnections.neverSynced");

  const subtitle = needsReconnect
    ? t("mediaConnections.reconnectNeeded")
    : state === "sync_error"
      ? t("mediaConnections.syncError")
      : isConnected
        ? lastSyncLabel
        : t("mediaConnections.notConnected");

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2 p-3 rounded-xl border",
        isConnected ? "bg-primary/5 border-primary/15" : "bg-muted/30 border-border/50"
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className={cn("p-2 rounded-lg", isConnected ? "bg-primary/10" : "bg-muted")}>
          <Icon className={cn("h-4 w-4", isConnected ? "text-primary" : "text-muted-foreground")} />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium">{t(meta.nameKey)}</span>
            {state === "connected" && (
              <Badge variant="success" className="text-[10px] px-1.5 py-0">
                <CheckCircle2 className="h-3 w-3 mr-0.5" />
                {t("mediaConnections.connected")}
              </Badge>
            )}
            {(needsReconnect || state === "sync_error") && (
              <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                <AlertTriangle className="h-3 w-3 mr-0.5" />
                {needsReconnect
                  ? t("mediaConnections.reconnect")
                  : t("mediaConnections.syncError")}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {isConnected && (
          <Button
            size="sm"
            variant="ghost"
            className="text-xs gap-1"
            onClick={onSyncNow}
            disabled={isSyncing}
          >
            <RefreshCw className={cn("h-3 w-3", isSyncing && "animate-spin")} />
            {isSyncing
              ? t("mediaConnections.syncing")
              : t("mediaConnections.syncNow")}
          </Button>
        )}
        {isConnected && (
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
        )}
        {!isConnected && (
          <Button
            size="sm"
            variant="outline"
            className="text-xs gap-1 rounded-full border-primary/40 text-primary hover:bg-primary/10"
            onClick={handleConnect}
          >
            {needsReconnect
              ? t("mediaConnections.reconnect")
              : t("mediaConnections.connect")}
          </Button>
        )}
      </div>
    </div>
  );
}
