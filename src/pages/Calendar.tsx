import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Plus, ChevronLeft, ChevronRight, Lock, Camera } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { EventModal } from "@/components/EventModal";
import { DaySummaryModal } from "@/components/DaySummaryModal";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format, addDays, addWeeks, addMonths, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isSameDay, parseISO, getDaysInMonth, getDay, setDate, isToday, isFuture } from "date-fns";
import { es, enUS } from "date-fns/locale";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";

const Calendar = () => {
  const { t, i18n } = useTranslation();
  const [view, setView] = useState<"day" | "week" | "month">("day");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [newEventDate, setNewEventDate] = useState<Date | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [daySummaryOpen, setDaySummaryOpen] = useState(false);
  const [summaryDate, setSummaryDate] = useState<Date | null>(null);
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  const lang = i18n.language.startsWith('es') ? 'es' : 'en';
  const dateLocale = lang === 'es' ? es : enUS;
  
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const daysShort = lang === 'es' 
    ? ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
    : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const dayLetters = lang === 'es'
    ? ['D', 'L', 'M', 'M', 'J', 'V', 'S']
    : ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

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
      toast.success(selectedEvent ? t('event.eventUpdated') : t('event.eventCreated'));
    },
    onError: (error: any) => {
      toast.error(error.message || t('event.errors.saveError'));
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
      toast.success(t('event.eventDeleted'));
    },
    onError: (error: any) => {
      toast.error(error.message || t('event.errors.deleteError'));
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
      return { event, relation: t('calendar.during') };
    } else if (photoHour < eventStart) {
      return { event, relation: t('calendar.before') };
    } else {
      return { event, relation: t('calendar.after') };
    }
  };

  const handleNewEvent = (date?: Date) => {
    setSelectedEvent(null);
    setNewEventDate(date || null);
    setEventModalOpen(true);
  };

  const handleDayClick = (dayNumber: number) => {
    const clickedDate = setDate(currentDate, dayNumber);
    setSummaryDate(clickedDate);
    setDaySummaryOpen(true);
  };

  const handleAddEventFromSummary = () => {
    if (summaryDate) {
      handleNewEvent(summaryDate);
    }
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
    <div className="min-h-screen bg-theme-bg pb-24">
      <div className="px-5 py-6 space-y-6 max-w-lg mx-auto">
        {/* Header - Apple Style */}
        <div className="flex items-center justify-between pt-2">
          <div>
            <h1 className="text-[28px] font-semibold tracking-tight text-theme-textPrimary">{t('calendar.title')}</h1>
            <p className="text-[15px] text-theme-textSecondary mt-0.5 tracking-wide">
              {format(currentDate, lang === 'es' ? "d 'de' MMMM, yyyy" : "MMMM d, yyyy", { locale: dateLocale })}
            </p>
          </div>
          <Button 
            size="icon" 
            onClick={() => handleNewEvent()}
            className="h-10 w-10 rounded-full bg-theme-accentPrimary hover:bg-theme-accentHighlight text-primary-foreground shadow-sm"
          >
            <Plus className="h-5 w-5" strokeWidth={2} />
          </Button>
        </div>

        {/* View Tabs - Apple Segmented Control Style */}
        <Tabs value={view} onValueChange={(v) => setView(v as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-11 p-1 bg-theme-bgElevated/60 backdrop-blur-sm rounded-xl border border-theme-borderSubtle/50">
            <TabsTrigger 
              value="day" 
              className="rounded-lg text-[13px] font-medium data-[state=active]:bg-theme-cardBg data-[state=active]:shadow-sm data-[state=active]:text-theme-textPrimary text-theme-textSecondary transition-all"
            >
              {t('calendar.day')}
            </TabsTrigger>
            <TabsTrigger 
              value="week"
              className="rounded-lg text-[13px] font-medium data-[state=active]:bg-theme-cardBg data-[state=active]:shadow-sm data-[state=active]:text-theme-textPrimary text-theme-textSecondary transition-all"
            >
              {t('calendar.week')}
            </TabsTrigger>
            <TabsTrigger 
              value="month"
              className="rounded-lg text-[13px] font-medium data-[state=active]:bg-theme-cardBg data-[state=active]:shadow-sm data-[state=active]:text-theme-textPrimary text-theme-textSecondary transition-all"
            >
              {t('calendar.month')}
            </TabsTrigger>
          </TabsList>

          {/* Day View */}
          <TabsContent value="day" className="space-y-5 mt-5">
            <div className="flex items-center justify-between">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={goToPrevious}
                className="h-9 w-9 rounded-full hover:bg-theme-bgElevated text-theme-textSecondary"
              >
                <ChevronLeft className="h-5 w-5" strokeWidth={1.5} />
              </Button>
              <Button 
                variant="ghost" 
                onClick={goToToday} 
                className="text-[15px] font-medium text-theme-accentPrimary hover:bg-theme-accentPrimary/10 px-4 h-9 rounded-full"
              >
                {t('common.today')}
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={goToNext}
                className="h-9 w-9 rounded-full hover:bg-theme-bgElevated text-theme-textSecondary"
              >
                <ChevronRight className="h-5 w-5" strokeWidth={1.5} />
              </Button>
            </div>

            <Card className="overflow-hidden border-theme-borderSubtle/50 shadow-sm bg-theme-cardBg rounded-2xl">
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="p-10 text-center text-theme-textTertiary text-[15px]">{t('common.loading')}</div>
                ) : (
                  <div className="max-h-[55vh] overflow-y-auto">
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
                        <div key={hour} className="flex border-b border-theme-borderSubtle/30 last:border-b-0">
                          <div className="w-14 flex-shrink-0 py-3 pr-3 text-[11px] font-medium text-theme-textTertiary text-right tracking-wide">
                            {hour === 0 ? `12 ${t('time.am')}` : hour < 12 ? `${hour} ${t('time.am')}` : hour === 12 ? `12 ${t('time.pm')}` : `${hour - 12} ${t('time.pm')}`}
                          </div>
                          <div className="flex-1 min-h-[56px] py-2 px-3 relative space-y-1.5 border-l border-theme-borderSubtle/30">
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
                                      alt={t('calendar.capture')}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium flex items-center gap-1">
                                      <Camera className="h-3 w-3" />
                                      {t('calendar.instantCapture')}
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

            {/* Health Overlay - Apple Card Style */}
            <Card className="overflow-hidden border-theme-borderSubtle/50 shadow-sm bg-theme-cardBg rounded-2xl">
              <CardContent className="p-5">
                <h3 className="text-[17px] font-semibold text-theme-textPrimary tracking-tight mb-4">{t('calendar.todaysActivity')}</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[15px] text-theme-textSecondary">{t('calendar.steps')}</span>
                    <span className="text-[15px] font-semibold text-theme-textPrimary tabular-nums">8,432 / 10,000</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[15px] text-theme-textSecondary">{t('calendar.workout')}</span>
                    <span className="text-[15px] font-semibold text-theme-textPrimary tabular-nums">45 / 60 min</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Week View */}
          <TabsContent value="week" className="space-y-5 mt-5">
            <div className="flex items-center justify-between">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={goToPrevious}
                className="h-9 w-9 rounded-full hover:bg-theme-bgElevated text-theme-textSecondary"
              >
                <ChevronLeft className="h-5 w-5" strokeWidth={1.5} />
              </Button>
              <span className="text-[15px] font-semibold text-theme-textPrimary tracking-tight">
                {t('calendar.weekOf', { date: format(startOfWeek(currentDate, { weekStartsOn: 1 }), lang === 'es' ? "d MMM" : "MMM d", { locale: dateLocale }) })}
              </span>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={goToNext}
                className="h-9 w-9 rounded-full hover:bg-theme-bgElevated text-theme-textSecondary"
              >
                <ChevronRight className="h-5 w-5" strokeWidth={1.5} />
              </Button>
            </div>

            <Card className="overflow-hidden border-theme-borderSubtle/50 shadow-sm bg-theme-cardBg rounded-2xl">
              <CardContent className="p-0">
                <div className="grid grid-cols-8 border-b border-theme-borderSubtle/30 bg-theme-bgElevated/30">
                  <div className="p-3" />
                  {daysShort.map((day, i) => (
                    <div key={i} className="py-3 px-1 text-center">
                      <div className="text-[11px] font-medium text-theme-textTertiary uppercase tracking-wider">{day}</div>
                      <div className={`mt-1 text-[15px] font-medium ${i === 4 ? 'text-theme-accentPrimary' : 'text-theme-textPrimary'}`}>
                        {6 + i}
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="max-h-[48vh] overflow-y-auto">
                  {Array.from({ length: 12 }, (_, i) => i + 7).map((hour) => (
                    <div key={hour} className="grid grid-cols-8 border-b border-theme-borderSubtle/30 last:border-b-0 min-h-[52px]">
                      <div className="py-3 pr-2 text-[11px] font-medium text-theme-textTertiary text-right tracking-wide">
                        {hour === 12 ? `12 ${t('time.pm')}` : hour > 12 ? `${hour - 12} ${t('time.pm')}` : `${hour} ${t('time.am')}`}
                      </div>
                      {daysShort.map((_, i) => (
                        <div key={i} className="border-l border-theme-borderSubtle/30 p-1.5">
                          {i === 4 && hour === 7 && (
                            <div className="bg-theme-accentPrimary/15 border-l-2 border-theme-accentPrimary rounded-lg text-[11px] font-medium text-theme-accentPrimary p-1.5">
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

          {/* Month View - Apple Calendar Style */}
          <TabsContent value="month" className="space-y-5 mt-5">
            <div className="flex items-center justify-between">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={goToPrevious}
                className="h-9 w-9 rounded-full hover:bg-theme-bgElevated text-theme-textSecondary"
              >
                <ChevronLeft className="h-5 w-5" strokeWidth={1.5} />
              </Button>
              <span className="text-[17px] font-semibold text-theme-textPrimary tracking-tight capitalize">
                {format(currentDate, "MMMM yyyy", { locale: dateLocale })}
              </span>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={goToNext}
                className="h-9 w-9 rounded-full hover:bg-theme-bgElevated text-theme-textSecondary"
              >
                <ChevronRight className="h-5 w-5" strokeWidth={1.5} />
              </Button>
            </div>

            <Card className="overflow-hidden border-theme-borderSubtle/50 shadow-sm bg-theme-cardBg rounded-2xl">
              <CardContent className="p-5">
                <div className="grid grid-cols-7 gap-1 mb-3">
                  {dayLetters.map((day, i) => (
                    <div key={i} className="text-center text-[11px] font-semibold text-theme-textTertiary uppercase tracking-wider py-2">
                      {day}
                    </div>
                  ))}
                </div>
                
                <div className="grid grid-cols-7 gap-2">
                  {(() => {
                    const daysInMonth = getDaysInMonth(currentDate);
                    const firstDayOfMonth = getDay(startOfMonth(currentDate));
                    const today = new Date();
                    const isCurrentMonth = currentDate.getMonth() === today.getMonth() && currentDate.getFullYear() === today.getFullYear();
                    
                    // Create array with empty slots for days before the month starts
                    const slots = [];
                    
                    // Add empty slots for days before the 1st
                    for (let i = 0; i < firstDayOfMonth; i++) {
                      slots.push(
                        <div key={`empty-${i}`} className="aspect-square" />
                      );
                    }
                    
                    // Add actual days - Apple Calendar style
                    for (let day = 1; day <= daysInMonth; day++) {
                      const dayDate = setDate(currentDate, day);
                      const dayEvents = getEventsForDate(dayDate);
                      const isTodayDate = isCurrentMonth && day === today.getDate();
                      
                      slots.push(
                        <button
                          key={day}
                          onClick={() => handleDayClick(day)}
                          className={`aspect-square flex flex-col items-center justify-center rounded-xl transition-all duration-200 cursor-pointer ${
                            isTodayDate
                              ? 'bg-theme-accentPrimary text-primary-foreground shadow-sm'
                              : 'hover:bg-theme-bgElevated text-theme-textPrimary'
                          }`}
                        >
                          <span className={`text-[15px] font-medium ${isTodayDate ? 'text-white' : ''}`}>{day}</span>
                          {dayEvents.length > 0 && (
                            <div className="flex gap-0.5 mt-1">
                              {dayEvents.slice(0, 3).map((event, idx) => (
                                <div 
                                  key={idx} 
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    isTodayDate ? 'bg-white/70' :
                                    event.category === 'trabajo' ? 'bg-category-work' :
                                    event.category === 'deporte' ? 'bg-category-sport' :
                                    event.category === 'salud' ? 'bg-theme-accentPrimary' :
                                    event.category === 'estudio' ? 'bg-category-study' :
                                    'bg-theme-textTertiary'
                                  }`} 
                                />
                              ))}
                            </div>
                          )}
                        </button>
                      );
                    }
                    
                    return slots;
                  })()}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Quick Add Button - Apple Style */}
        <Button 
          className="w-full h-12 rounded-xl bg-theme-accentPrimary hover:bg-theme-accentHighlight text-white text-[15px] font-semibold shadow-sm" 
          size="lg" 
          onClick={() => handleNewEvent()}
        >
          <Plus className="h-5 w-5 mr-2" strokeWidth={2} />
          {t('daySummary.addEvent')}
        </Button>

        {/* Day Summary Modal */}
        <DaySummaryModal
          open={daySummaryOpen}
          onOpenChange={setDaySummaryOpen}
          date={summaryDate}
          events={summaryDate ? getEventsForDate(summaryDate) : []}
          photos={summaryDate ? getPhotosForDate(summaryDate) : []}
          onAddEvent={handleAddEventFromSummary}
          onPhotoClick={setSelectedPhoto}
        />

        {/* Event Modal */}
        <EventModal
          open={eventModalOpen}
          onOpenChange={(open) => {
            setEventModalOpen(open);
            if (!open) setNewEventDate(null);
          }}
          event={selectedEvent}
          initialDate={newEventDate}
          onSave={(event) => saveEventMutation.mutateAsync(event)}
          onDelete={(id) => deleteEventMutation.mutateAsync(id)}
        />

        {/* Photo Preview Modal */}
        <Dialog open={!!selectedPhoto} onOpenChange={(open) => !open && setSelectedPhoto(null)}>
          <DialogContent className="max-w-lg p-0 overflow-hidden">
            {selectedPhoto && (
              <img 
                src={selectedPhoto} 
                alt={t('calendar.instantCapture')}
                className="w-full h-auto max-h-[80vh] object-contain"
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Focus Mode Section - Apple Style */}
        <div className="space-y-5 mt-10 pt-8 border-t border-theme-borderSubtle/50">
          <div className="flex items-center gap-4 mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-theme-accentPrimary/10">
              <Lock className="h-7 w-7 text-theme-accentPrimary" strokeWidth={1.5} />
            </div>
            <div>
              <h2 className="text-[22px] font-semibold text-theme-textPrimary tracking-tight">{t('calendar.focusMode')}</h2>
              <p className="text-[13px] text-theme-textTertiary mt-0.5">{t('calendar.timeWellSpent')}</p>
            </div>
          </div>

          {/* Daily Time Cap - Apple Card */}
          <Card className="overflow-hidden border-theme-borderSubtle/50 shadow-sm bg-theme-cardBg rounded-2xl">
            <CardContent className="p-6">
              <div className="text-center mb-5">
                <div className="text-[44px] font-bold text-theme-textPrimary tracking-tight tabular-nums">
                  {dailyMinutes - usedMinutes} <span className="text-[22px] font-medium text-theme-textSecondary">min</span>
                </div>
                <p className="text-[15px] text-theme-textSecondary mt-1">{t('calendar.remainingToday')}</p>
              </div>
              
              <Progress value={(usedMinutes / dailyMinutes) * 100} className="h-2.5 mb-3 rounded-full" />
              
              <div className="flex justify-between text-[13px] text-theme-textTertiary">
                <span className="tabular-nums">{usedMinutes} {t('calendar.minUsed')}</span>
                <span className="tabular-nums">{dailyMinutes} {t('calendar.minDaily')}</span>
              </div>
              
              <Button 
                className="w-full mt-5 h-11 rounded-xl border-theme-borderSubtle text-theme-textPrimary hover:bg-theme-bgElevated" 
                variant="outline"
              >
                <Plus className="h-4 w-4 mr-2" strokeWidth={2} />
                {t('calendar.extendTime')}
              </Button>
            </CardContent>
          </Card>

          {/* Module Breakdown - Apple Style */}
          <div className="space-y-3">
            <h3 className="text-[17px] font-semibold text-theme-textPrimary tracking-tight">{t('calendar.moduleTime')}</h3>
            
            <Card className="overflow-hidden border-theme-borderSubtle/50 shadow-sm bg-theme-cardBg rounded-2xl">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[15px] font-medium text-theme-textPrimary">{t('nav.feed')}</span>
                  <span className="text-[13px] text-theme-textSecondary tabular-nums">{feedUsed}/{feedMinutes} min</span>
                </div>
                <Progress value={(feedUsed / feedMinutes) * 100} className="h-2 rounded-full" />
              </CardContent>
            </Card>
            
            <Card className="overflow-hidden border-theme-borderSubtle/50 shadow-sm bg-theme-cardBg rounded-2xl">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[15px] font-medium text-theme-textPrimary">{t('nav.explore')}</span>
                  <span className="text-[13px] text-theme-textSecondary tabular-nums">{exploreUsed}/{exploreMinutes} min</span>
                </div>
                <Progress value={(exploreUsed / exploreMinutes) * 100} className="h-2 rounded-full" />
              </CardContent>
            </Card>
            
            <Card className="overflow-hidden border-theme-borderSubtle/30 bg-theme-bgElevated/50 rounded-2xl">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-[15px] font-medium text-theme-textPrimary">{t('calendar.calendarAndProfile')}</span>
                  <span className="text-[13px] text-theme-accentPrimary font-semibold">{t('calendar.unlimited')}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Weekly Time Saved - Apple Style */}
          <Card className="overflow-hidden border-theme-borderSubtle/50 shadow-sm bg-theme-cardBg rounded-2xl">
            <CardContent className="p-6">
              <h3 className="text-[17px] font-semibold text-theme-textPrimary tracking-tight mb-5">{t('calendar.timeSavedThisWeek')}</h3>
              
              <div className="flex items-end justify-between gap-3 h-44 mb-5">
                {weeklyData.map((data, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2">
                    <div className="w-full bg-theme-bgElevated rounded-lg overflow-hidden relative" style={{ height: '100%' }}>
                      <div
                        className="absolute bottom-0 w-full bg-gradient-to-t from-theme-accentPrimary to-theme-accentHighlight rounded-lg transition-all duration-500"
                        style={{ height: `${(data.saved / data.goal) * 100}%` }}
                      />
                    </div>
                    <div className="text-[11px] font-medium text-theme-textTertiary uppercase tracking-wide">{daysShort[i]}</div>
                  </div>
                ))}
              </div>
              
              <div className="text-center pt-2 border-t border-theme-borderSubtle/30">
                <div className="text-[28px] font-bold text-theme-accentPrimary mt-3 tabular-nums">
                  {weeklyData.reduce((acc, d) => acc + d.saved, 0)} <span className="text-[17px] font-medium">min</span>
                </div>
                <p className="text-[13px] text-theme-textSecondary mt-1">{t('calendar.totalTimeSaved')}</p>
              </div>
            </CardContent>
          </Card>

          {/* Settings - Apple List Style */}
          <Card className="overflow-hidden border-theme-borderSubtle/50 shadow-sm bg-theme-cardBg rounded-2xl">
            <CardContent className="p-5">
              <h3 className="text-[17px] font-semibold text-theme-textPrimary tracking-tight mb-4">{t('settings.title')}</h3>
              <div className="space-y-1">
                <div className="flex items-center justify-between py-3 px-1 rounded-lg hover:bg-theme-bgElevated/50 transition-colors">
                  <span className="text-[15px] text-theme-textPrimary">{t('calendar.dailyCap')}</span>
                  <span className="text-[15px] text-theme-textSecondary tabular-nums">{dailyMinutes} {t('calendar.minutes')}</span>
                </div>
                <div className="flex items-center justify-between py-3 px-1 rounded-lg hover:bg-theme-bgElevated/50 transition-colors border-t border-theme-borderSubtle/30">
                  <span className="text-[15px] text-theme-textPrimary">{t('calendar.feedCap')}</span>
                  <span className="text-[15px] text-theme-textSecondary tabular-nums">{feedMinutes} {t('calendar.minutes')}</span>
                </div>
                <div className="flex items-center justify-between py-3 px-1 rounded-lg hover:bg-theme-bgElevated/50 transition-colors border-t border-theme-borderSubtle/30">
                  <span className="text-[15px] text-theme-textPrimary">{t('calendar.exploreCap')}</span>
                  <span className="text-[15px] text-theme-textSecondary tabular-nums">{exploreMinutes} {t('calendar.minutes')}</span>
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
