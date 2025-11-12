import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";

interface CalendarEvent {
  id: string;
  title: string;
  category: string;
  starts_at: string;
  ends_at: string;
  notes: string | null;
}

interface EventModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: CalendarEvent | null;
  timezone: string;
}

const CATEGORIES = [
  { value: "trabajo", label: "💼 Trabajo" },
  { value: "deporte", label: "⚽ Deporte" },
  { value: "salud", label: "🏥 Salud" },
  { value: "estudio", label: "📚 Estudio" },
  { value: "otros", label: "✨ Otros" },
];

export const EventModal = ({ open, onOpenChange, event, timezone }: EventModalProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (event) {
      const startZoned = toZonedTime(new Date(event.starts_at), timezone);
      const endZoned = toZonedTime(new Date(event.ends_at), timezone);

      setTitle(event.title);
      setCategory(event.category);
      setStartDate(format(startZoned, "yyyy-MM-dd"));
      setStartTime(format(startZoned, "HH:mm"));
      setEndDate(format(endZoned, "yyyy-MM-dd"));
      setEndTime(format(endZoned, "HH:mm"));
      setNotes(event.notes || "");
    } else {
      const now = new Date();
      setTitle("");
      setCategory("");
      setStartDate(format(now, "yyyy-MM-dd"));
      setStartTime(format(now, "HH:mm"));
      setEndDate(format(now, "yyyy-MM-dd"));
      setEndTime(format(now, "HH:mm"));
      setNotes("");
    }
  }, [event, timezone]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Usuario no autenticado");

      // Combine date and time, then convert to UTC for storage
      const startLocal = new Date(`${startDate}T${startTime}`);
      const endLocal = new Date(`${endDate}T${endTime}`);

      // Convert from user's timezone to UTC
      const startsAtUTC = fromZonedTime(startLocal, timezone);
      const endsAtUTC = fromZonedTime(endLocal, timezone);

      // Validate dates
      if (endsAtUTC < startsAtUTC) {
        throw new Error("La fecha de fin debe ser posterior a la fecha de inicio");
      }

      const eventData = {
        user_id: user.id,
        title: title.trim(),
        category,
        starts_at: startsAtUTC.toISOString(),
        ends_at: endsAtUTC.toISOString(),
        notes: notes.trim() || null,
      };

      if (event) {
        const { error } = await supabase
          .from("calendar_events")
          .update(eventData)
          .eq("id", event.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("calendar_events")
          .insert(eventData);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
      toast.success(event ? "Evento actualizado" : "Evento creado");
      handleClose();
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Error al guardar evento";
      toast.error(message);
    },
  });

  const handleClose = () => {
    if (!mutation.isPending) {
      onOpenChange(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error("El título es requerido");
      return;
    }

    if (!category) {
      toast.error("La categoría es requerida");
      return;
    }

    if (!startDate || !startTime || !endDate || !endTime) {
      toast.error("Completa todas las fechas y horas");
      return;
    }

    mutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{event ? "Editar Evento" : "Crear Evento"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">
              Título <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Título del evento"
              disabled={mutation.isPending}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">
              Categoría <span className="text-destructive">*</span>
            </Label>
            <Select
              value={category}
              onValueChange={setCategory}
              disabled={mutation.isPending}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona una categoría" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-date">
                Fecha inicio <span className="text-destructive">*</span>
              </Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={mutation.isPending}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="start-time">
                Hora inicio <span className="text-destructive">*</span>
              </Label>
              <Input
                id="start-time"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                disabled={mutation.isPending}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="end-date">
                Fecha fin <span className="text-destructive">*</span>
              </Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                disabled={mutation.isPending}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-time">
                Hora fin <span className="text-destructive">*</span>
              </Label>
              <Input
                id="end-time"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                disabled={mutation.isPending}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notas</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notas adicionales (opcional)"
              rows={3}
              disabled={mutation.isPending}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={mutation.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : event ? (
                "Actualizar"
              ) : (
                "Crear"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
