import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

type AuditRow = {
  id: string;
  action: string;
  event_id: string | null;
  prompt: string | null;
  before: any;
  after: any;
  created_at: string;
};

function formatWhen(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function summarize(row: AuditRow, t: (key: string) => string) {
  const title =
    row.after?.title ||
    row.before?.title ||
    (row.event_id ? t("assistant.audit.event") : t("assistant.audit.calendarChange"));
  const action =
    row.action === "create"
      ? t("assistant.audit.created")
      : row.action === "update"
      ? t("assistant.audit.updated")
      : row.action === "delete"
      ? t("assistant.audit.removed")
      : row.action;
  return `${action} · ${title}`;
}

export function AICalendarAuditList() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["ai-calendar-audit"],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_calendar_audit" as any)
        .select("id, action, event_id, prompt, before, after, created_at")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data || []) as unknown as AuditRow[];
    },
    staleTime: 30_000,
  });

  return (
    <div className="mt-3 rounded-xl border border-border/50 bg-card/50 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "w-full flex items-center justify-between px-3.5 py-2.5",
          "text-[12px] text-muted-foreground hover:text-foreground transition-colors"
        )}
      >
        <span>{t("assistant.audit.viewLog")}</span>
        {open ? (
          <ChevronUp className="h-3.5 w-3.5" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5" />
        )}
      </button>

      {open && (
        <div className="border-t border-border/50 max-h-64 overflow-y-auto">
          {isLoading && (
            <div className="px-3.5 py-3 text-[12px] text-muted-foreground">
              {t("assistant.audit.loading")}
            </div>
          )}
          {!isLoading && (!data || data.length === 0) && (
            <div className="px-3.5 py-3 text-[12px] text-muted-foreground">
              {t("assistant.audit.noChanges")}
            </div>
          )}
          {!isLoading &&
            data &&
            data.map((row) => (
              <div
                key={row.id}
                className="px-3.5 py-2.5 border-b border-border/30 last:border-b-0"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-[12px] text-foreground/85 tracking-[-0.01em]">
                    {summarize(row, t)}
                  </span>
                  <span className="text-[10.5px] text-muted-foreground tabular-nums shrink-0">
                    {formatWhen(row.created_at)}
                  </span>
                </div>
                {row.prompt && (
                  <div className="mt-0.5 text-[11px] text-muted-foreground italic line-clamp-1">
                    “{row.prompt}”
                  </div>
                )}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}