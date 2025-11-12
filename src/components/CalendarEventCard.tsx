import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { es } from "date-fns/locale";

interface CalendarEvent {
  id: string;
  title: string;
  category: string;
  starts_at: string;
  ends_at: string;
  notes: string | null;
}

interface CalendarEventCardProps {
  event: CalendarEvent;
  timezone: string;
  onEdit: () => void;
  onDelete: () => void;
}

const CATEGORY_CONFIG = {
  trabajo: { label: "💼 Trabajo", color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  deporte: { label: "⚽ Deporte", color: "bg-green-500/10 text-green-600 border-green-500/20" },
  salud: { label: "🏥 Salud", color: "bg-red-500/10 text-red-600 border-red-500/20" },
  estudio: { label: "📚 Estudio", color: "bg-purple-500/10 text-purple-600 border-purple-500/20" },
  otros: { label: "✨ Otros", color: "bg-gray-500/10 text-gray-600 border-gray-500/20" },
};

export const CalendarEventCard = ({ event, timezone, onEdit, onDelete }: CalendarEventCardProps) => {
  const startDate = toZonedTime(new Date(event.starts_at), timezone);
  const endDate = toZonedTime(new Date(event.ends_at), timezone);
  const categoryConfig = CATEGORY_CONFIG[event.category as keyof typeof CATEGORY_CONFIG] || CATEGORY_CONFIG.otros;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-foreground">{event.title}</h3>
              <Badge variant="outline" className={categoryConfig.color}>
                {categoryConfig.label}
              </Badge>
            </div>
            
            <div className="text-sm text-muted-foreground">
              {format(startDate, "HH:mm", { locale: es })} - {format(endDate, "HH:mm", { locale: es })}
            </div>
            
            {event.notes && (
              <p className="text-sm text-muted-foreground line-clamp-2">{event.notes}</p>
            )}
          </div>

          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={onEdit}
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onDelete}
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
