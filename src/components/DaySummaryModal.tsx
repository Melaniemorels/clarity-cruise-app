import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { format, isToday, isFuture } from "date-fns";
import { es } from "date-fns/locale";
import { Briefcase, Dumbbell, Footprints, Camera, CalendarPlus, Clock } from "lucide-react";

interface Event {
  id: string;
  title: string;
  category: string;
  starts_at: string;
  ends_at: string;
}

interface PhotoEntry {
  id: string;
  photo_url: string;
  occurred_at: string;
  caption?: string;
}

interface DaySummaryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: Date | null;
  events: Event[];
  photos: PhotoEntry[];
  onAddEvent?: () => void;
  onPhotoClick?: (photoUrl: string) => void;
}

const getCategoryColor = (category: string) => {
  const colors: Record<string, string> = {
    trabajo: 'bg-category-work',
    deporte: 'bg-category-sport',
    salud: 'bg-primary',
    estudio: 'bg-category-study',
    otros: 'bg-secondary',
  };
  return colors[category] || colors.otros;
};

export const DaySummaryModal = ({ 
  open, 
  onOpenChange, 
  date, 
  events, 
  photos,
  onAddEvent,
  onPhotoClick 
}: DaySummaryModalProps) => {
  if (!date) return null;

  const isPastDay = !isToday(date) && !isFuture(date);
  const canAddEvent = isToday(date) || isFuture(date);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {format(date, "EEEE d 'de' MMMM", { locale: es })}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Events Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Eventos ({events.length})
            </h3>
            
            {events.length > 0 ? (
              <div className="space-y-2">
                {events.map((event) => {
                  const start = new Date(event.starts_at);
                  const end = new Date(event.ends_at);
                  return (
                    <div
                      key={event.id}
                      className={`${getCategoryColor(event.category)} bg-opacity-20 border-l-4 rounded-lg p-3`}
                      style={{ borderColor: `hsl(var(--category-${event.category === 'salud' ? 'health' : event.category}))` }}
                    >
                      <div className="font-medium text-sm">{event.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {format(start, "HH:mm")} - {format(end, "HH:mm")}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-2">
                No hay eventos para este día
              </p>
            )}
          </div>

          {/* Photos Section */}
          {photos.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                <Camera className="h-4 w-4" />
                Capturas ({photos.length})
              </h3>
              
              <div className="grid grid-cols-3 gap-2">
                {photos.map((photo) => (
                  <button
                    key={photo.id}
                    onClick={() => onPhotoClick?.(photo.photo_url)}
                    className="aspect-square rounded-lg overflow-hidden bg-muted hover:opacity-80 transition-opacity"
                  >
                    <img 
                      src={photo.photo_url} 
                      alt="Captura"
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Empty state for past days */}
          {isPastDay && events.length === 0 && photos.length === 0 && (
            <div className="text-center py-6 text-muted-foreground">
              <p className="text-sm">No hay actividad registrada para este día</p>
            </div>
          )}

          {/* Add Event Button (only for today or future) */}
          {canAddEvent && (
            <Button 
              className="w-full" 
              onClick={() => {
                onOpenChange(false);
                onAddEvent?.();
              }}
            >
              <CalendarPlus className="h-4 w-4 mr-2" />
              Agregar Evento
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
