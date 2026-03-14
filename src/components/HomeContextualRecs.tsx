import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useDevice } from "@/hooks/use-device";
import { useHomeContextualRecs, type ContextualRec } from "@/hooks/use-contextual-recommendations";
import { openContent } from "@/lib/open-content";
import { detectProvider, PROVIDER_LABEL_KEYS } from "@/lib/external-link";
import { ArrowUpRight, Brain, Calendar, Clock } from "lucide-react";

const MOOD_COLORS: Record<string, string> = {
  calm: "bg-green-500/10 text-green-600 dark:text-green-400",
  energizing: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  focused: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  uplifting: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  relaxing: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
};

function QuickRecCard({ rec }: { rec: ContextualRec }) {
  const { t } = useTranslation();
  const provider = rec.url ? detectProvider(rec.url) : "other";

  const handleClick = async () => {
    if (rec.url) {
      await openContent({ url: rec.url, provider: provider.toString(), title: rec.title }, t);
    }
  };

  return (
    <Card
      className="cursor-pointer transition-all hover:shadow-md border-border/50 hover:border-border"
      onClick={handleClick}
    >
      <CardContent className="p-4 flex items-start gap-3">
        <div className={cn("p-2 rounded-xl flex-shrink-0", MOOD_COLORS[rec.mood] ?? "bg-primary/10 text-primary")}>
          <Brain className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0 space-y-1">
          <h4 className="text-sm font-semibold text-foreground leading-snug line-clamp-1">
            {rec.title}
          </h4>
          <p className="text-[11px] text-muted-foreground line-clamp-2">
            {rec.reason}
          </p>
          <div className="flex items-center gap-2 pt-0.5">
            <Badge variant="outline" className="text-[9px] capitalize px-1.5 py-0 font-normal">
              {rec.category}
            </Badge>
            {rec.duration_min && (
              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                <Clock className="h-2.5 w-2.5" />
                {rec.duration_min} {t('calendar.minShort')}
              </span>
            )}
            {rec.url && (
              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                <ArrowUpRight className="h-2.5 w-2.5" />
                {t(PROVIDER_LABEL_KEYS[provider])}
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function HomeContextualRecs() {
  const { t } = useTranslation();
  const device = useDevice();
  const { data, isLoading, error } = useHomeContextualRecs();

  const recs = data?.recommendations?.home ?? [];
  const hasCalendar = !!(data?.signals as any)?.calendar?.next_event_title;

  if (!isLoading && recs.length === 0) return null;
  if (error) return null; // Don't block home on error

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h2 className={cn("font-semibold text-foreground flex items-center gap-2", device.isMobile ? "text-base" : "text-lg")}>
          <span>🧠</span>
          {t("contextualRecs.homeTitle")}
        </h2>
        {hasCalendar && (
          <Badge variant="secondary" className="text-[9px] gap-0.5 px-1.5 py-0">
            <Calendar className="h-2.5 w-2.5" />
          </Badge>
        )}
      </div>

      <div className="space-y-2">
        {isLoading
          ? [...Array(2)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4 flex items-start gap-3">
                  <Skeleton className="h-9 w-9 rounded-xl flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </CardContent>
              </Card>
            ))
          : recs.map((rec, idx) => <QuickRecCard key={idx} rec={rec} />)}
      </div>
    </div>
  );
}
