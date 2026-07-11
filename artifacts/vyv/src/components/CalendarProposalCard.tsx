import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, X, Calendar as CalendarIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export type CalendarProposal = {
  action: "create" | "update" | "delete";
  title?: string;
  starts_at?: string;
  ends_at?: string;
  category?: string;
  notes?: string;
  event_id?: string;
};

function fmtRange(starts_at?: string, ends_at?: string) {
  if (!starts_at) return "";
  try {
    const s = new Date(starts_at);
    const e = ends_at ? new Date(ends_at) : null;
    const date = s.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    const t1 = s.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
    const t2 = e
      ? e.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
      : "";
    return e ? `${date} · ${t1} – ${t2}` : `${date} · ${t1}`;
  } catch {
    return starts_at;
  }
}

interface Props {
  proposal: CalendarProposal;
  prompt?: string;
}

export function CalendarProposalCard({ proposal, prompt }: Props) {
  const { t } = useTranslation();
  const [state, setState] = useState<"idle" | "loading" | "done" | "cancelled" | "error">(
    "idle"
  );

  const label =
    proposal.action === "create"
      ? t("assistant.proposal.addToCalendar")
      : proposal.action === "update"
      ? t("assistant.proposal.updateEvent")
      : t("assistant.proposal.deleteEvent");

  const confirm = async () => {
    setState("loading");
    try {
      const { data, error } = await supabase.functions.invoke(
        "vyv-calendar-action",
        {
          body: {
            action: proposal.action,
            payload: {
              event_id: proposal.event_id,
              title: proposal.title,
              starts_at: proposal.starts_at,
              ends_at: proposal.ends_at,
              category: proposal.category,
              notes: proposal.notes,
            },
            prompt,
          },
        }
      );
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setState("done");
      toast({ title: t("assistant.proposal.calendarUpdated") });
    } catch (e: any) {
      setState("error");
      toast({
        title: t("assistant.proposal.couldNotUpdate"),
        description: e?.message || t("assistant.proposal.tryAgain"),
        variant: "destructive",
      });
    }
  };

  return (
    <div
      className={cn(
        "mt-2 rounded-2xl border border-border/60 bg-card/80 backdrop-blur-md",
        "p-3.5 max-w-[85%] mr-auto"
      )}
    >
      <div className="flex items-start gap-2.5">
        <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <CalendarIcon className="h-3.5 w-3.5 text-primary" strokeWidth={1.75} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
            {label}
          </div>
          {proposal.title && (
            <div className="text-[14px] font-medium text-foreground mt-0.5 truncate">
              {proposal.title}
            </div>
          )}
          {(proposal.starts_at || proposal.ends_at) && (
            <div className="text-[12px] text-foreground/70 tabular-nums">
              {fmtRange(proposal.starts_at, proposal.ends_at)}
            </div>
          )}
          {proposal.category && (
            <div className="text-[11px] text-muted-foreground mt-0.5 capitalize">
              {proposal.category}
            </div>
          )}
        </div>
      </div>

      {state === "idle" && (
        <div className="flex gap-2 mt-3">
          <button
            onClick={confirm}
            className={cn(
              "flex-1 h-9 rounded-lg bg-primary text-primary-foreground",
              "text-[13px] font-medium",
              "active:scale-[0.98] transition"
            )}
          >
            {t("assistant.proposal.confirm")}
          </button>
          <button
            onClick={() => setState("cancelled")}
            className={cn(
              "h-9 px-4 rounded-lg border border-border/60",
              "text-[13px] text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition"
            )}
          >
            {t("assistant.proposal.cancel")}
          </button>
        </div>
      )}
      {state === "loading" && (
        <div className="flex items-center justify-center mt-3 h-9 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
        </div>
      )}
      {state === "done" && (
        <div className="flex items-center gap-1.5 mt-3 text-[12px] text-primary">
          <Check className="h-3.5 w-3.5" /> {t("assistant.proposal.done")}
        </div>
      )}
      {state === "cancelled" && (
        <div className="flex items-center gap-1.5 mt-3 text-[12px] text-muted-foreground">
          <X className="h-3.5 w-3.5" /> {t("assistant.proposal.cancelled")}
        </div>
      )}
      {state === "error" && (
        <button
          onClick={confirm}
          className="mt-3 text-[12px] text-destructive underline"
        >
          {t("assistant.proposal.retry")}
        </button>
      )}
    </div>
  );
}