import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { X, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface CreatePlanSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  friends: { name: string; avatar?: string }[];
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
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
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

  const handleCreate = () => {
    if (!title.trim()) {
      toast.error(t("calendar.createPlan.titleRequired"));
      return;
    }
    toast.success(t("calendar.createPlan.created"), { duration: 2500 });
    setTitle("");
    setNote("");
    onOpenChange(false);
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
            >
              {t("common.cancel")}
            </Button>
            <Button className="flex-1" onClick={handleCreate}>
              {t("calendar.createPlan.create")}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
