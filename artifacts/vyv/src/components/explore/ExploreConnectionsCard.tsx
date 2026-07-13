import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useMediaConnections } from "@/hooks/use-media-connections";
import { Music, Youtube, CheckCircle2, SlidersHorizontal } from "lucide-react";
import { ExplorePersonalizeDialog } from "./ExplorePersonalizeDialog";

const PROVIDERS = [
  { id: "spotify", nameKey: "explore.providers.spotify", icon: Music },
  { id: "youtube", nameKey: "explore.providers.youtube", icon: Youtube },
];

/**
 * Compact connections + personalization card. Replaces the old full-size
 * connection banner: one row of provider status chips plus actions to manage
 * connections or personalize recommendations manually.
 */
export function ExploreConnectionsCard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: connections = [] } = useMediaConnections();
  const [personalizeOpen, setPersonalizeOpen] = useState(false);

  const connectedProviders = connections.map((c) => c.provider);
  const allConnected = PROVIDERS.every((p) =>
    connectedProviders.includes(p.id),
  );

  return (
    <>
      <Card className="border-border/50 bg-card/50">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-foreground">
                {t("explore.connections.title")}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t("explore.connections.subtitle")}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {PROVIDERS.map((p) => {
                const isConnected = connectedProviders.includes(p.id);
                const Icon = p.icon;
                return (
                  <span
                    key={p.id}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px]",
                      isConnected
                        ? "border-primary/30 bg-primary/5 text-primary"
                        : "border-border/60 text-muted-foreground",
                    )}
                  >
                    <Icon className="h-3 w-3" />
                    {t(p.nameKey)}
                    {isConnected && <CheckCircle2 className="h-3 w-3" />}
                  </span>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={allConnected ? "ghost" : "outline"}
              className="text-xs h-8"
              onClick={() => navigate("/media-connections")}
            >
              {allConnected
                ? t("explore.connections.manage")
                : t("mediaConnections.connect")}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-xs h-8 gap-1.5"
              onClick={() => setPersonalizeOpen(true)}
            >
              <SlidersHorizontal className="h-3 w-3" />
              {t("explore.personalize.button")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <ExplorePersonalizeDialog
        open={personalizeOpen}
        onOpenChange={setPersonalizeOpen}
      />
    </>
  );
}
