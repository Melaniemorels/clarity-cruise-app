import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { es, enUS } from "date-fns/locale";
import { Clock, CalendarIcon, Tag, FileText, Pencil, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

interface CalendarEvent {
  id: string;
  title: string;
  category: string;
  starts_at: string;
  ends_at: string;
  notes?: string;
}

interface EventDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: CalendarEvent | null;
  onEdit: (event: CalendarEvent) => void;
  onDelete: (id: string) => void;
}

const getCategoryLabel = (category: string, t: (key: string) => string) => {
  const map: Record<string, string> = {
    trabajo: t("event.categories.work"),
    deporte: t("event.categories.sport"),
    salud: t("event.categories.health"),
    estudio: t("event.categories.study"),
    otros: t("event.categories.other"),
  };
  return map[category] || map.otros;
};

const getCategoryColorClass = (category: string) => {
  const map: Record<string, string> = {
    trabajo: "bg-category-work",
    deporte: "bg-category-sport",
    salud: "bg-primary",
    estudio: "bg-category-study",
    otros: "bg-secondary",
  };
  return map[category] || map.otros;
};

export const EventDetailModal = ({
  open,
  onOpenChange,
  event,
  onEdit,
  onDelete,
}: EventDetailModalProps) => {
  const { t, i18n } = useTranslation();

  if (!event) return null;

  const lang = i18n.language.startsWith("es") ? "es" : "en";
  const dateLocale = lang === "es" ? es : enUS;

  const start = new Date(event.starts_at);
  const end = new Date(event.ends_at);
  const durationMin = Math.round((end.getTime() - start.getTime()) / 60000);
  const durationH = Math.floor(durationMin / 60);
  const durationM = durationMin % 60;

  const dateStr = format(
    start,
    lang === "es" ? "EEEE d 'de' MMMM, yyyy" : "EEEE, MMMM d, yyyy",
    { locale: dateLocale }
  );

  const timeStr = `${format(start, "h:mm a", { locale: dateLocale })} – ${format(end, "h:mm a", { locale: dateLocale })}`;

  const durationStr =
    durationH > 0
      ? `${durationH}h ${durationM > 0 ? `${durationM}min` : ""}`
      : `${durationM}min`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">{event.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Category badge */}
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-muted-foreground" />
            <Badge className={getCategoryColorClass(event.category)}>
              {getCategoryLabel(event.category, t)}
            </Badge>
          </div>

          <Separator />

          {/* Date */}
          <div className="flex items-start gap-3">
            <CalendarIcon className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm font-medium capitalize">{dateStr}</p>
            </div>
          </div>

          {/* Time range */}
          <div className="flex items-start gap-3">
            <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm font-medium">{timeStr}</p>
              <p className="text-xs text-muted-foreground">{durationStr}</p>
            </div>
          </div>

          {/* Notes */}
          {event.notes && (
            <>
              <Separator />
              <div className="flex items-start gap-3">
                <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {event.notes}
                </p>
              </div>
            </>
          )}

          <Separator />

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              variant="destructive"
              className="flex-1"
              onClick={() => {
                onDelete(event.id);
                onOpenChange(false);
              }}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {t("common.delete")}
            </Button>
            <Button
              className="flex-1"
              onClick={() => {
                onEdit(event);
                onOpenChange(false);
              }}
            >
              <Pencil className="h-4 w-4 mr-2" />
              {t("event.editEvent")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
