import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

// Goal keys must match the backend's GOAL_CATEGORIES registry.
const GOAL_KEYS = [
  "sleep",
  "stress",
  "energy",
  "focus",
  "movement",
  "nutrition",
  "growth",
] as const;

// Interest options are the catalogue's internal category keys.
const INTEREST_OPTIONS: { key: string; labelKey: string }[] = [
  { key: "Yoga", labelKey: "explore.categories.yoga" },
  { key: "Pilates", labelKey: "explore.categories.pilates" },
  { key: "Meditación", labelKey: "explore.categories.meditation" },
  { key: "Calma", labelKey: "explore.categories.calm" },
  { key: "Energía", labelKey: "explore.categories.energy" },
  { key: "Ejercicios", labelKey: "explore.categories.exercises" },
  { key: "Nutrición", labelKey: "explore.categories.nutrition" },
  { key: "PlanesDeComida", labelKey: "explore.categories.mealPlans" },
  { key: "Motivacional", labelKey: "explore.categories.motivational" },
  { key: "Podcasts", labelKey: "explore.categories.podcasts" },
  { key: "Música", labelKey: "explore.categories.music" },
  { key: "Audiolibros", labelKey: "explore.categories.audiobooks" },
];

const DURATION_OPTIONS: (number | null)[] = [null, 15, 30, 60];

interface PrefsRow {
  goals?: string[];
  preferred_tags?: string[];
  preferred_duration_min?: number | null;
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1.5 text-xs transition-colors",
        active
          ? "border-primary bg-primary/10 text-primary font-medium"
          : "border-border/60 bg-card/50 text-muted-foreground hover:border-border",
      )}
    >
      {children}
    </button>
  );
}

export function ExplorePersonalizeDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: prefs } = useQuery({
    queryKey: ["explore-personalization", user?.id],
    enabled: !!user && open,
    queryFn: async (): Promise<PrefsRow | null> => {
      const { data, error } = await supabase
        .from("user_explore_preferences")
        .select("goals, preferred_tags, preferred_duration_min")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data as PrefsRow | null;
    },
  });

  const [goals, setGoals] = useState<string[]>([]);
  const [interests, setInterests] = useState<string[]>([]);
  const [duration, setDuration] = useState<number | null>(null);

  // Seed local state from the persisted row whenever the dialog opens.
  useEffect(() => {
    if (!open) return;
    setGoals(prefs?.goals ?? []);
    setInterests(prefs?.preferred_tags ?? []);
    setDuration(prefs?.preferred_duration_min ?? null);
  }, [open, prefs]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("user_explore_preferences").upsert(
        {
          user_id: user!.id,
          goals,
          preferred_tags: interests,
          preferred_duration_min: duration,
        },
        { onConflict: "user_id" },
      );
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["explore-personalization"] });
      queryClient.invalidateQueries({ queryKey: ["explore-feed"] });
      queryClient.invalidateQueries({ queryKey: ["contextual-recs"] });
      toast.success(t("explore.personalize.saved"));
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const toggle = (list: string[], set: (v: string[]) => void, key: string) =>
    set(list.includes(key) ? list.filter((k) => k !== key) : [...list, key]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("explore.personalize.title")}</DialogTitle>
          <DialogDescription>
            {t("explore.personalize.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-foreground">
              {t("explore.personalize.goals")}
            </h4>
            <div className="flex flex-wrap gap-2">
              {GOAL_KEYS.map((g) => (
                <Chip
                  key={g}
                  active={goals.includes(g)}
                  onClick={() => toggle(goals, setGoals, g)}
                >
                  {t(`explore.personalize.goalLabels.${g}`)}
                </Chip>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-medium text-foreground">
              {t("explore.personalize.interests")}
            </h4>
            <div className="flex flex-wrap gap-2">
              {INTEREST_OPTIONS.map((opt) => (
                <Chip
                  key={opt.key}
                  active={interests.includes(opt.key)}
                  onClick={() => toggle(interests, setInterests, opt.key)}
                >
                  {t(opt.labelKey)}
                </Chip>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-medium text-foreground">
              {t("explore.personalize.duration")}
            </h4>
            <div className="flex flex-wrap gap-2">
              {DURATION_OPTIONS.map((d) => (
                <Chip
                  key={d ?? "any"}
                  active={duration === d}
                  onClick={() => setDuration(d)}
                >
                  {d == null
                    ? t("explore.personalize.durationAny")
                    : t("explore.personalize.durationMin", { minutes: d })}
                </Chip>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !user}
            className="w-full"
          >
            {t("explore.personalize.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
