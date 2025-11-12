import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarUI } from "@/components/ui/calendar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarEventCard } from "@/components/CalendarEventCard";
import { EventModal } from "@/components/EventModal";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Calendar as CalendarIcon } from "lucide-react";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays } from "date-fns";
import { es } from "date-fns/locale";
import { toZonedTime } from "date-fns-tz";
import { toast } from "sonner";

interface CalendarEvent {
  id: string;
  user_id: string;
  title: string;
  category: string;
  starts_at: string;
  ends_at: string;
  notes: string | null;
  created_at: string;
}

const Calendar = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [view, setView] = useState<"month" | "week">("month");
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from("profiles")
        .select("timezone")
        .eq("user_id", user.id)
        .single();
      return data;
    },
    enabled: !!user,
  });

  const userTimezone = profile?.timezone || "America/Los_Angeles";

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["calendar-events", selectedDate, view],
    queryFn: async () => {
      if (!user) return [];

      const startDate = view === "month" 
        ? startOfMonth(selectedDate)
        : startOfWeek(selectedDate, { weekStartsOn: 1 });
      
      const endDate = view === "month"
        ? endOfMonth(selectedDate)
        : endOfWeek(selectedDate, { weekStartsOn: 1 });

      const { data, error } = await supabase
        .from("calendar_events")
        .select("*")
        .gte("starts_at", startDate.toISOString())
        .lte("starts_at", endDate.toISOString())
        .order("starts_at", { ascending: true });

      if (error) throw error;
      return data as CalendarEvent[];
    },
    enabled: !!user,
  });

  const deleteEventMutation = useMutation({
    mutationFn: async (eventId: string) => {
      const { error } = await supabase
        .from("calendar_events")
        .delete()
        .eq("id", eventId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
      toast.success("Evento eliminado");
    },
    onError: () => {
      toast.error("Error al eliminar evento");
    },
  });

  const handleCreateEvent = () => {
    setEditingEvent(null);
    setIsEventModalOpen(true);
  };

  const handleEditEvent = (event: CalendarEvent) => {
    setEditingEvent(event);
    setIsEventModalOpen(true);
  };

  const handleDeleteEvent = (eventId: string) => {
    if (confirm("¿Eliminar este evento?")) {
      deleteEventMutation.mutate(eventId);
    }
  };

  const getEventsForDate = (date: Date) => {
    return events.filter((event) => {
      const eventDate = toZonedTime(new Date(event.starts_at), userTimezone);
      return format(eventDate, "yyyy-MM-dd") === format(date, "yyyy-MM-dd");
    });
  };

  const getDatesInRange = () => {
    if (view === "month") {
      const start = startOfWeek(startOfMonth(selectedDate), { weekStartsOn: 1 });
      const end = endOfWeek(endOfMonth(selectedDate), { weekStartsOn: 1 });
      const dates = [];
      let current = start;
      while (current <= end) {
        dates.push(current);
        current = addDays(current, 1);
      }
      return dates;
    } else {
      const start = startOfWeek(selectedDate, { weekStartsOn: 1 });
      const dates = [];
      for (let i = 0; i < 7; i++) {
        dates.push(addDays(start, i));
      }
      return dates;
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="mx-auto max-w-4xl">
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold text-foreground">Calendario</h1>
            </div>
            <Button onClick={handleCreateEvent} size="icon" className="rounded-full">
              <Plus className="h-5 w-5" />
            </Button>
          </div>

          <Tabs value={view} onValueChange={(v) => setView(v as "month" | "week")} className="px-4 pb-2">
            <TabsList className="grid w-full max-w-[300px] grid-cols-2">
              <TabsTrigger value="month">Mes</TabsTrigger>
              <TabsTrigger value="week">Semana</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="p-4">
          <div className="mb-4">
            <CalendarUI
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              locale={es}
              className="rounded-lg border shadow-sm"
            />
          </div>

          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground mb-3">
              {view === "month" 
                ? format(selectedDate, "MMMM yyyy", { locale: es })
                : `Semana del ${format(startOfWeek(selectedDate, { weekStartsOn: 1 }), "d MMM", { locale: es })}`}
            </h2>

            {isLoading ? (
              <>
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="space-y-2 p-4 border border-border rounded-lg">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                ))}
              </>
            ) : view === "month" ? (
              <div className="grid gap-2">
                {getDatesInRange().map((date) => {
                  const dayEvents = getEventsForDate(date);
                  if (dayEvents.length === 0) return null;

                  return (
                    <div key={date.toISOString()} className="space-y-2">
                      <div className="text-sm font-medium text-muted-foreground">
                        {format(date, "EEEE, d 'de' MMMM", { locale: es })}
                      </div>
                      {dayEvents.map((event) => (
                        <CalendarEventCard
                          key={event.id}
                          event={event}
                          timezone={userTimezone}
                          onEdit={() => handleEditEvent(event)}
                          onDelete={() => handleDeleteEvent(event.id)}
                        />
                      ))}
                    </div>
                  );
                })}
                {events.length === 0 && (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">📅</div>
                    <p className="text-muted-foreground mb-2">No hay eventos este mes</p>
                    <Button onClick={handleCreateEvent}>
                      <Plus className="h-4 w-4 mr-2" />
                      Crear Evento
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid gap-2">
                {getDatesInRange().map((date) => (
                  <div key={date.toISOString()} className="border border-border rounded-lg p-3">
                    <div className="text-sm font-medium text-foreground mb-2">
                      {format(date, "EEEE, d 'de' MMMM", { locale: es })}
                    </div>
                    <div className="space-y-2">
                      {getEventsForDate(date).map((event) => (
                        <CalendarEventCard
                          key={event.id}
                          event={event}
                          timezone={userTimezone}
                          onEdit={() => handleEditEvent(event)}
                          onDelete={() => handleDeleteEvent(event.id)}
                        />
                      ))}
                      {getEventsForDate(date).length === 0 && (
                        <p className="text-xs text-muted-foreground">Sin eventos</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <EventModal
        open={isEventModalOpen}
        onOpenChange={setIsEventModalOpen}
        event={editingEvent}
        timezone={userTimezone}
      />

      <BottomNav />
    </div>
  );
};

export default Calendar;
