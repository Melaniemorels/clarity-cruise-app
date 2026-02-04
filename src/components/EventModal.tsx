import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface EventModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: {
    id?: string;
    title: string;
    category: string;
    starts_at: Date;
    ends_at: Date;
    notes: string;
  } | null;
  onSave: (event: any) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

const categories = [
  { value: "trabajo", label: "Trabajo", colorClass: "bg-category-work" },
  { value: "deporte", label: "Deporte", colorClass: "bg-category-sport" },
  { value: "salud", label: "Salud", colorClass: "bg-primary" },
  { value: "estudio", label: "Estudio", colorClass: "bg-category-study" },
  { value: "otros", label: "Otros", colorClass: "bg-secondary" },
];

export const EventModal = ({ open, onOpenChange, event, onSave, onDelete }: EventModalProps) => {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("otros");
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [notes, setNotes] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (event) {
      setTitle(event.title);
      setCategory(event.category);
      setStartDate(new Date(event.starts_at));
      setEndDate(new Date(event.ends_at));
      setStartTime(format(new Date(event.starts_at), "HH:mm"));
      setEndTime(format(new Date(event.ends_at), "HH:mm"));
      setNotes(event.notes || "");
    } else {
      // Reset form
      setTitle("");
      setCategory("otros");
      const now = new Date();
      setStartDate(now);
      setEndDate(now);
      setStartTime(format(now, "HH:mm"));
      const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
      setEndTime(format(oneHourLater, "HH:mm"));
      setNotes("");
    }
  }, [event, open]);

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error("El título es obligatorio");
      return;
    }

    const [startHour, startMinute] = startTime.split(":").map(Number);
    const [endHour, endMinute] = endTime.split(":").map(Number);

    const starts_at = new Date(startDate);
    starts_at.setHours(startHour, startMinute, 0, 0);

    const ends_at = new Date(endDate);
    ends_at.setHours(endHour, endMinute, 0, 0);

    if (ends_at < starts_at) {
      toast.error("La fecha de fin debe ser posterior a la fecha de inicio");
      return;
    }

    await onSave({
      id: event?.id,
      title: title.trim(),
      category,
      starts_at: starts_at.toISOString(),
      ends_at: ends_at.toISOString(),
      notes: notes.trim(),
    });
  };

  const handleDelete = async () => {
    if (!event?.id || !onDelete) return;
    
    setIsDeleting(true);
    try {
      await onDelete(event.id);
      onOpenChange(false);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{event?.id ? "Editar Evento" : "Nuevo Evento"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Reunión de equipo"
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label>Categoría</Label>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <Badge
                  key={cat.value}
                  variant={category === cat.value ? "default" : "outline"}
                  className={cn(
                    "cursor-pointer",
                    category === cat.value && cat.colorClass
                  )}
                  onClick={() => setCategory(cat.value)}
                >
                  {cat.label}
                </Badge>
              ))}
            </div>
          </div>

          {/* Start Date & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Fecha inicio</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(startDate, "dd/MM/yyyy")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={(date) => date && setStartDate(date)}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Hora inicio</Label>
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
          </div>

          {/* End Date & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Fecha fin</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(endDate, "dd/MM/yyyy")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={(date) => date && setEndDate(date)}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Hora fin</Label>
              <Input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notas</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Detalles adicionales..."
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            {event?.id && onDelete && (
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {isDeleting ? "Eliminando..." : "Eliminar"}
              </Button>
            )}
            <Button onClick={handleSave} className="flex-1">
              {event?.id ? "Actualizar" : "Crear"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};