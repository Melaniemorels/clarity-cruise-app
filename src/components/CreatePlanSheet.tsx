import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Check, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCreateNotification } from "@/hooks/use-notifications";

interface CreatePlanSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  friends: { id?: string; name: string; avatar?: string }[];
  startMinute: number;
  endMinute: number;
}

export const CreatePlanSheet = ({
  open,
  onOpenChange,
  friends,
  startMinute,
  endMinute,
}: CreatePlanSheetProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const createNotification = useCreateNotification();
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [selectedFriends, setSelectedFriends] = useState<string[]>(
    friends.map((f) => f.name)
  );

  const formatMinute = (min: number) => {
    const h = Math.floor(min / 60);
    const m = min % 60;
    const suffix = h >= 12 ? "PM" : "AM";
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return m === 0 ? `${h12} ${suffix}` : `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
  };

  const toggleFriend = (name: string) => {
    setSelectedFriends((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );
  };

  const handleCreate = async () => {
    if (!title.trim()) {
      toast.error(t("calendar.createPlan.titleRequired"));
      return;
    }

    if (!user) {
      toast.error(t("common.loginRequired"));
      return;
    }

    setSaving(true);

    try {
      // 1. Create the plan
      const { data: plan, error: planError } = await supabase
        .from("social_plans" as any)
        .insert({
          creator_id: user.id,
          title: title.trim(),
          note: note.trim() || null,
          plan_date: new Date().toISOString().split("T")[0],
          start_minute: startMinute,
          end_minute: endMinute,
        })
        .select("id")
        .single();

      if (planError) throw planError;

      const planId = (plan as any)?.id;

      // 2. Create invites and notifications for friends with real IDs
      const invitedFriends = friends.filter(
        (f) => f.id && selectedFriends.includes(f.name)
      );

      if (invitedFriends.length > 0 && planId) {
        // Insert invites
        const invites = invitedFriends.map((f) => ({
          plan_id: planId,
          invitee_id: f.id!,
        }));

        await supabase.from("social_plan_invites" as any).insert(invites);

        // Send notifications to each invited friend
        for (const friend of invitedFriends) {
          await createNotification.mutateAsync({
            user_id: friend.id!,
            type: "plan_invite",
            actor_id: user.id,
            reference_id: planId,
            message: title.trim(),
          });
        }
      }

      toast.success(t("calendar.createPlan.created"), { duration: 2500 });
      setTitle("");
      setNote("");
      onOpenChange(false);
    } catch (error) {
      console.error("Error creating plan:", error);
      toast.error(t("calendar.createPlan.error"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[80dvh]">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-base font-semibold text-foreground">
            {t("calendar.createPlan.title")}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4 pb-6">
          {/* Plan title */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              {t("calendar.createPlan.planName")}
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("calendar.createPlan.planNamePlaceholder")}
              className="h-9 text-sm"
            />
          </div>

          {/* Time */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              {t("calendar.createPlan.time")}
            </label>
            <div className="text-sm text-foreground bg-secondary rounded-lg px-3 py-2">
              {formatMinute(startMinute)} – {formatMinute(endMinute)}
            </div>
          </div>

          {/* Friends */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              {t("calendar.createPlan.friends")}
            </label>
            <div className="flex flex-wrap gap-2">
              {friends.map((f) => {
                const selected = selectedFriends.includes(f.name);
                return (
                  <button
                    key={f.name}
                    onClick={() => toggleFriend(f.name)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors flex items-center gap-1.5
                      ${
                        selected
                          ? "bg-primary/10 border-primary/30 text-primary"
                          : "bg-background border-border text-muted-foreground"
                      }`}
                  >
                    {selected && <Check className="h-3 w-3" />}
                    {f.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Note */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              {t("calendar.createPlan.note")}{" "}
              <span className="text-muted-foreground/50">
                ({t("common.optional")})
              </span>
            </label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t("calendar.createPlan.notePlaceholder")}
              className="min-h-[60px] text-sm resize-none"
              rows={2}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              {t("common.cancel")}
            </Button>
            <Button className="flex-1" onClick={handleCreate} disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              {t("calendar.createPlan.create")}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
