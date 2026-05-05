import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { ChevronRight, NotebookPen } from "lucide-react";

interface NotesSummaryCardProps {
  date: Date;
}

export const NotesSummaryCard = ({ date }: NotesSummaryCardProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const dateStr = format(date, "yyyy-MM-dd");

  const { data: counts = { today: 0, total: 0 } } = useQuery({
    queryKey: ["notes-summary", user?.id, dateStr],
    queryFn: async () => {
      if (!user) return { today: 0, total: 0 };
      const [todayRes, totalRes] = await Promise.all([
        (supabase as any)
          .from("notes")
          .select("id", { count: "exact", head: true })
          .eq("linked_date", dateStr),
        (supabase as any)
          .from("notes")
          .select("id", { count: "exact", head: true }),
      ]);
      return {
        today: todayRes.count ?? 0,
        total: totalRes.count ?? 0,
      };
    },
    enabled: !!user,
  });

  const summary =
    counts.today > 0
      ? t("notes.summaryToday", { count: counts.today, defaultValue: "{{count}} notes today" })
      : counts.total > 0
        ? t("notes.summaryQuiet", "Nothing today")
        : t("notes.summaryEmpty", "Capture your first thought");

  return (
    <Card
      onClick={() => navigate(`/notes?date=${dateStr}`)}
      className="cursor-pointer hover:bg-muted/30 transition-colors"
    >
      <button
        type="button"
        className="w-full flex items-center justify-between gap-3 p-4 text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-9 w-9 rounded-full bg-muted/60 flex items-center justify-center flex-shrink-0">
            <NotebookPen className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium">{t("notes.title", "Notes")}</p>
            <p className="text-xs text-muted-foreground truncate">{summary}</p>
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      </button>
    </Card>
  );
};
