import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Plus, ChevronLeft, ChevronRight, Lock, Camera } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { EventModal } from "@/components/EventModal";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format, addDays, addWeeks, addMonths, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isSameDay, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { useAuth } from "@/contexts/AuthContext";

const Calendar = () => {
  const [view, setView] = useState<"day" | "week" | "month">("day");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const days = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  // Fetch events from database
  const { data: events = [], isLoading } = useQuery({
    queryKey: ['calendar-events'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('calendar_events')
        .select('*')
        .order('starts_at', { ascending: true });
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch photo entries from database
  const { data: photoEntries = [] } = useQuery({
    queryKey: ['calendar-photo-entries', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('entries')
        .select('*')
        .eq('user_id', user.id)
        .not('photo_url', 'is', null)
        .order('occurred_at', { ascending: true });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Create/Update event mutation
  const saveEventMutation = useMutation({
    mutationFn: async (event: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No autenticado");

      if (event.id) {
        const { error } = await (supabase as any)
          .from('calendar_events')
          .update({
            title: event.title,
            category: event.category,
            starts_at: event.starts_at,
            ends_at: event.ends_at,
            notes: event.notes,
          })
          .eq('id', event.id);
        
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from('calendar_events')
          .insert({
            user_id: user.id,
            title: event.title,
            category: event.category,
            starts_at: event.starts_at,
            ends_at: event.ends_at,
            notes: event.notes,
          });
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      setEventModalOpen(false);
      setSelectedEvent(null);
      toast.success(selectedEvent ? "Evento actualizado" : "Evento creado");
    },
    onError: (error: any) => {
      toast.error(error.message || "Error al guardar evento");
    },
  });

  // Delete event mutation
  const deleteEventMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('calendar_events')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      toast.success("Evento eliminado");
    },
    onError: (error: any) => {
      toast.error(error.message || "Error al eliminar evento");
    },
  });

  // Navigation handlers
  const goToPrevious = () => {
    if (view === 'day') setCurrentDate(addDays(currentDate, -1));
    else if (view === 'week') setCurrentDate(addWeeks(currentDate, -1));
    else setCurrentDate(addMonths(currentDate, -1));
  };

  const goToNext = () => {
    if (view === 'day') setCurrentDate(addDays(currentDate, 1));
    else if (view === 'week') setCurrentDate(addWeeks(currentDate, 1));
    else setCurrentDate(addMonths(currentDate, 1));
  };

  const goToToday = () => setCurrentDate(new Date());

  // Get events for current view
  const getEventsForDate = (date: Date) => {
    return events.filter(event => 
      isSameDay(parseISO(event.starts_at), date)
    );
  };

  // Get photo entries for a specific date
  const getPhotosForDate = (date: Date) => {
    return photoEntries.filter(entry => 
      entry.photo_url && isSameDay(parseISO(entry.occurred_at), date)
    );
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      trabajo: 'category-work border-l-4',
      deporte: 'category-sport border-l-4',
      salud: 'category-health border-l-4',
      estudio: 'category-study border-l-4',
      otros: 'category-other border-l-4',
    };
    return colors[category] || colors.otros;
  };

  // Find nearby events for a photo
  const getNearbyContext = (photoTime: Date) => {
    const photoHour = photoTime.getTime();
    const nearbyEvents = events.filter(event => {
      const start = new Date(event.starts_at).getTime();
      const end = new Date(event.ends_at).getTime();
      // Check if photo was during an event
      if (photoHour >= start && photoHour <= end) {
        return true;
      }
      // Check if photo was within 1 hour before or after an event
      const oneHour = 60 * 60 * 1000;
      if (Math.abs(photoHour - start) <= oneHour || Math.abs(photoHour - end) <= oneHour) {
        return true;
      }
      return false;
    });
    
    if (nearbyEvents.length === 0) return null;
    
    const event = nearbyEvents[0];
    const eventStart = new Date(event.starts_at).getTime();
    const eventEnd = new Date(event.ends_at).getTime();
    
    if (photoHour >= eventStart && photoHour <= eventEnd) {
      return { event, relation: 'durante' };
    } else if (photoHour < eventStart) {
      return { event, relation: 'antes de' };
    } else {
      return { event, relation: 'después de' };
    }
  };

  const handleNewEvent = () => {
    setSelectedEvent(null);
    setEventModalOpen(true);
  };

  const handleEditEvent = (event: any) => {
    setSelectedEvent({
      ...event,
      starts_at: parseISO(event.starts_at),
      ends_at: parseISO(event.ends_at),
    });
    setEventModalOpen(true);
  };

  // Focus Mode data
  const dailyMinutes = 45;
  const usedMinutes = 28;
  const feedMinutes = 10;
  const feedUsed = 7;
  const exploreMinutes = 15;
  const exploreUsed = 12;

  const weeklyData = [
    { day: 'Lun', saved: 15, goal: 45 },
    { day: 'Mar', saved: 22, goal: 45 },
    { day: 'Mié', saved: 18, goal: 45 },
    { day: 'Jue', saved: 25, goal: 45 },
    { day: 'Vie', saved: 20, goal: 45 },
    { day: 'Sáb', saved: 17, goal: 45 },
    { day: 'Dom', saved: 0, goal: 45 },
  ];

  const dayEvents = getEventsForDate(currentDate);
  const dayPhotos = getPhotosForDate(currentDate);

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Calendario</h1>
            <p className="text-sm text-muted-foreground">
              {format(currentDate, "d 'de' MMMM, yyyy", { locale: es })}
            </p>
          </div>
          <Button size="icon" onClick={handleNewEvent}>
            <Plus className="h-5 w-5" />
          </Button>
        </div>

        {/* View Tabs */}
        <Tabs value={view} onValueChange={(v) => setView(v as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="day">Día</TabsTrigger>
            <TabsTrigger value="week">Semana</TabsTrigger>
            <TabsTrigger value="month">Mes</TabsTrigger>
          </TabsList>

          {/* Day View */}
          <TabsContent value="day" className="space-y-4">
            <div className="flex items-center justify-between">
              <Button variant="outline" size="icon" onClick={goToPrevious}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="ghost" onClick={goToToday} className="font-semibold">
                Hoy
              </Button>
              <Button variant="outline" size="icon" onClick={goToNext}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <Card>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="p-8 text-center text-muted-foreground">Cargando...</div>
                ) : (
                  <div className="max-h-[60vh] overflow-y-auto">
                    {hours.map((hour) => {
                      const hourEvents = dayEvents.filter(e => {
                        const eventHour = new Date(e.starts_at).getHours();
                        return eventHour === hour;
                      });
                      
                      const hourPhotos = dayPhotos.filter(p => {
                        const photoHour = new Date(p.occurred_at).getHours();
                        return photoHour === hour;
                      });
                      
                      return (
                        <div key={hour} className="flex border-b border-border">
                          <div className="w-16 flex-shrink-0 p-2 text-xs text-muted-foreground text-right">
                            {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
                          </div>
                          <div className="flex-1 min-h-[60px] p-2 relative space-y-1">
                            {/* Regular events */}
                            {hourEvents.map((event) => {
                              const start = new Date(event.starts_at);
                              const end = new Date(event.ends_at);
                              const duration = (end.getTime() - start.getTime()) / 1000 / 60;
                              
                              return (
                                <div
                                  key={event.id}
                                  className={`${getCategoryColor(event.category)} border-l-4 rounded p-2 cursor-pointer hover:opacity-80 transition-opacity`}
                                  style={{
                                    minHeight: `${Math.max(duration, 30)}px`,
                                  }}
                                  onClick={() => handleEditEvent(event)}
                                >
                                  <div className="text-sm font-medium">{event.title}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {format(start, "HH:mm")} - {format(end, "HH:mm")}
                                  </div>
                                </div>
                              );
                            })}
                            
                            {/* Photo entries */}
                            {hourPhotos.map((photo) => {
                              const photoTime = new Date(photo.occurred_at);
                              const context = getNearbyContext(photoTime);
                              
                              return (
                                <div
                                  key={photo.id}
                                  className="category-photo border-l-4 rounded p-2 cursor-pointer hover:opacity-80 transition-opacity flex gap-2 items-start"
                                  onClick={() => setSelectedPhoto(photo.photo_url)}
                                >
                                  <div className="w-12 h-12 rounded overflow-hidden flex-shrink-0 bg-muted">
                                    <img 
                                      src={photo.photo_url} 
                                      alt="Captura"
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium flex items-center gap-1">
                                      <Camera className="h-3 w-3" />
                                      Captura instantánea
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      {format(photoTime, "HH:mm")}
                                      {context && (
                                        <span className="ml-1 text-category-photo">
                                          • {context.relation} {context.event.title}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Health Overlay */}
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-3">Today's Activity</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Steps</span>
                    <span className="font-semibold">8,432 / 10,000</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Workout</span>
                    <span className="font-semibold">45 / 60 min</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Week View */}
          <TabsContent value="week" className="space-y-4">
            <div className="flex items-center justify-between">
              <Button variant="outline" size="icon" onClick={goToPrevious}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="font-semibold">
                Semana del {format(startOfWeek(currentDate, { weekStartsOn: 1 }), "d MMM", { locale: es })}
              </span>
              <Button variant="outline" size="icon" onClick={goToNext}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <Card>
              <CardContent className="p-0">
                <div className="grid grid-cols-8 border-b border-border">
                  <div className="p-2" />
                  {days.map((day, i) => (
                    <div key={i} className="p-2 text-center text-xs font-medium">
                      <div className="text-muted-foreground">{day}</div>
                      <div className={`mt-1 ${i === 4 ? 'text-primary font-bold' : ''}`}>
                        {6 + i}
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="max-h-[50vh] overflow-y-auto">
                  {Array.from({ length: 12 }, (_, i) => i + 7).map((hour) => (
                    <div key={hour} className="grid grid-cols-8 border-b border-border min-h-[60px]">
                      <div className="p-2 text-xs text-muted-foreground text-right">
                        {hour === 12 ? '12 PM' : hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
                      </div>
                      {days.map((_, i) => (
                        <div key={i} className="border-l border-border p-1">
                          {i === 4 && hour === 7 && (
                            <div className="bg-primary/20 border-l-2 border-primary rounded text-xs p-1">
                              Yoga
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Month View */}
          <TabsContent value="month" className="space-y-4">
            <div className="flex items-center justify-between">
              <Button variant="outline" size="icon" onClick={goToPrevious}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="font-semibold">
                {format(currentDate, "MMMM yyyy", { locale: es })}
              </span>
              <Button variant="outline" size="icon" onClick={goToNext}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <Card>
              <CardContent className="p-4">
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                    <div key={i} className="text-center text-xs font-medium text-muted-foreground py-2">
                      {day}
                    </div>
                  ))}
                </div>
                
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: 35 }, (_, i) => i + 1).map((day) => (
                    <div
                      key={day}
                      className={`aspect-square flex flex-col items-center justify-center rounded-md border transition-colors ${
                        day === 11
                          ? 'bg-primary text-primary-foreground border-primary'
                          : day > 31
                          ? 'text-muted-foreground/30 border-transparent'
                          : 'border-border hover:bg-muted/50'
                      }`}
                    >
                      <span className="text-sm">{day <= 31 ? day : ''}</span>
                      {day <= 31 && day % 3 === 0 && (
                        <div className="flex gap-0.5 mt-1">
                          <div className="w-1 h-1 rounded-full bg-primary" />
                          <div className="w-1 h-1 rounded-full bg-secondary" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Quick Add Button */}
        <Button className="w-full" size="lg" onClick={handleNewEvent}>
          <Plus className="h-5 w-5 mr-2" />
          Agregar Evento
        </Button>

        {/* Event Modal */}
        <EventModal
          open={eventModalOpen}
          onOpenChange={setEventModalOpen}
          event={selectedEvent}
          onSave={(event) => saveEventMutation.mutateAsync(event)}
          onDelete={(id) => deleteEventMutation.mutateAsync(id)}
        />

        {/* Photo Preview Modal */}
        <Dialog open={!!selectedPhoto} onOpenChange={(open) => !open && setSelectedPhoto(null)}>
          <DialogContent className="max-w-lg p-0 overflow-hidden">
            {selectedPhoto && (
              <img 
                src={selectedPhoto} 
                alt="Captura instantánea"
                className="w-full h-auto max-h-[80vh] object-contain"
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Focus Mode Section */}
        <div className="space-y-4 mt-8 pt-8 border-t border-border">
          <div className="flex items-center gap-3 mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
              <Lock className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">Focus Mode</h2>
              <p className="text-xs text-muted-foreground">Time well spent</p>
            </div>
          </div>

          {/* Daily Time Cap */}
          <Card>
            <CardContent className="p-6">
              <div className="text-center mb-4">
                <div className="text-4xl font-bold text-foreground mb-2">
                  {dailyMinutes - usedMinutes} min
                </div>
                <p className="text-sm text-muted-foreground">Remaining today</p>
              </div>
              
              <Progress value={(usedMinutes / dailyMinutes) * 100} className="h-2 mb-2" />
              
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{usedMinutes} min used</span>
                <span>{dailyMinutes} min daily</span>
              </div>
              
              <Button className="w-full mt-4" variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Extend Time (+5 min)
              </Button>
            </CardContent>
          </Card>

          {/* Module Breakdown */}
          <div className="space-y-3">
            <h3 className="font-semibold">Module Time</h3>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">Feed</span>
                  <span className="text-sm text-muted-foreground">{feedUsed}/{feedMinutes} min</span>
                </div>
                <Progress value={(feedUsed / feedMinutes) * 100} className="h-2" />
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">Explore</span>
                  <span className="text-sm text-muted-foreground">{exploreUsed}/{exploreMinutes} min</span>
                </div>
                <Progress value={(exploreUsed / exploreMinutes) * 100} className="h-2" />
              </CardContent>
            </Card>
            
            <Card className="bg-muted/30">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Calendar & Profile</span>
                  <span className="text-sm text-primary font-semibold">Unlimited</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Weekly Time Saved */}
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold mb-4">Time Saved This Week</h3>
              
              <div className="flex items-end justify-between gap-2 h-48 mb-4">
                {weeklyData.map((data, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2">
                    <div className="w-full bg-muted rounded-t-lg overflow-hidden relative" style={{ height: '100%' }}>
                      <div
                        className="absolute bottom-0 w-full bg-gradient-to-t from-primary to-primary/70 rounded-t-lg transition-all"
                        style={{ height: `${(data.saved / data.goal) * 100}%` }}
                      />
                    </div>
                    <div className="text-xs text-muted-foreground">{data.day}</div>
                  </div>
                ))}
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-primary mb-1">
                  {weeklyData.reduce((acc, d) => acc + d.saved, 0)} min
                </div>
                <p className="text-sm text-muted-foreground">Total time saved</p>
              </div>
            </CardContent>
          </Card>

          {/* Settings */}
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold mb-3">Settings</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
                  <span>Daily Cap</span>
                  <span className="text-muted-foreground">{dailyMinutes} minutes</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
                  <span>Feed Cap</span>
                  <span className="text-muted-foreground">{feedMinutes} minutes</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
                  <span>Explore Cap</span>
                  <span className="text-muted-foreground">{exploreMinutes} minutes</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Calendar;
