import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { BottomNav } from "@/components/BottomNav";
import { useDevice } from "@/hooks/use-device";
import { useNavStyle } from "@/components/ResponsiveNav";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Plus, ChevronLeft, ChevronRight, Lock, Camera } from "lucide-react";
import { FirstTapTooltip } from "@/components/FirstTapTooltip";
import { ContextHelpTooltip } from "@/components/ContextHelpTooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { EventModal } from "@/components/EventModal";
import { EventDetailModal } from "@/components/EventDetailModal";
import { DaySummaryModal } from "@/components/DaySummaryModal";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format, addDays, addWeeks, addMonths, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isSameDay, parseISO, getDaysInMonth, getDay, setDate, isToday, isFuture } from "date-fns";
import { es, enUS } from "date-fns/locale";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";
import { useFocusMetrics, useUpdateTimeGoal } from "@/hooks/use-focus-metrics";

const Calendar = () => {
  const { t, i18n } = useTranslation();
  const [view, setView] = useState<"day" | "week" | "month">("day");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [detailEvent, setDetailEvent] = useState<any>(null);
  const [newEventDate, setNewEventDate] = useState<Date | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [daySummaryOpen, setDaySummaryOpen] = useState(false);
  const [summaryDate, setSummaryDate] = useState<Date | null>(null);
  const [addEventTapped, setAddEventTapped] = useState(false);
  const addEventRef = useRef<HTMLButtonElement>(null);
  const calendarHeaderRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  const lang = i18n.language.startsWith('es') ? 'es' : 'en';
  const dateLocale = lang === 'es' ? es : enUS;
  
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const PIXELS_PER_MINUTE = 1; // 1px per minute → 60px per hour slot
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
      if (!user) throw new Error(t('event.errors.notAuthenticated'));

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
    // Navigate to day view directly (like Google/Apple Calendar)
    setCurrentDate(clickedDate);
    setView("day");
  };

  // Navigate to a specific date in day view (like Google/Apple Calendar)
  const navigateToDay = (date: Date) => {
    setCurrentDate(date);
    setView("day");
  };

  // Week view: click a day column header to go to that day
  const handleWeekDayClick = (date: Date) => {
    navigateToDay(date);
  };

  const handleAddEventFromSummary = () => {
    if (summaryDate) {
      handleNewEvent(summaryDate);
    }
  };

  // Show read-only detail for an event (not Capture)
  const handleViewEvent = (event: any) => {
    setDetailEvent(event);
  };

  // Open edit modal from detail view
  const handleEditEvent = (event: any) => {
    setSelectedEvent({
      ...event,
      starts_at: new Date(event.starts_at),
      ends_at: new Date(event.ends_at),
    });
    setEventModalOpen(true);
  };

  // Focus Mode — real data from DB
  const {
    isLoading: focusLoading,
    isWeekLoading,
    isHealthLoading,
    dailyLimitMinutes,
    totalUsedMinutes,
    remainingMinutes,
    overallProgress,
    feed: feedMetrics,
    explore: exploreMetrics,
    weeklyData,
    totalWeeklySaved,
    health,
  } = useFocusMetrics();
  const updateGoalMutation = useUpdateTimeGoal();

  const handleExtendTime = () => {
    const newLimit = dailyLimitMinutes + 5;
    updateGoalMutation.mutate(
      { module: null, daily_minutes: newLimit },
      {
        onSuccess: () => toast.success(t('socialBudget.extended')),
        onError: (err) => toast.error(String(err)),
      }
    );
  };

  const dayEvents = getEventsForDate(currentDate);
  const dayPhotos = getPhotosForDate(currentDate);

  const device = useDevice();
  const navStyle = useNavStyle();
  const isLandscape = device.isLandscape;

  return (
    <div className={cn("min-h-screen bg-background")} style={navStyle}>
      <div className={cn("p-4 space-y-4", isLandscape && "max-w-5xl mx-auto")}>
        {/* Header */}
        <div ref={calendarHeaderRef} className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t('calendar.title')}</h1>
            <p className="text-sm text-muted-foreground">
              {format(currentDate, lang === 'es' ? "d 'de' MMMM, yyyy" : "MMMM d, yyyy", { locale: dateLocale })}
            </p>
          </div>
          <Button
            ref={addEventRef}
            size="icon"
            onClick={() => {
              setAddEventTapped(true);
              handleNewEvent(currentDate);
            }}
          >
            <Plus className="h-5 w-5" />
          </Button>
          <FirstTapTooltip
            tapId="addEventBtn"
            pageKey="calendar"
            title={t("guide.tips.calendarAddTitle")}
            body={t("guide.tips.calendarAddBody")}
            anchorRef={addEventRef}
            show={addEventTapped}
          />
        </div>

        {/* View Tabs */}
        <Tabs value={view} onValueChange={(v) => setView(v as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="day">{t('calendar.day')}</TabsTrigger>
            <TabsTrigger value="week">{t('calendar.week')}</TabsTrigger>
            <TabsTrigger value="month">{t('calendar.month')}</TabsTrigger>
          </TabsList>

          {/* Day View */}
          <TabsContent value="day" className="space-y-4">
            <div className="flex items-center justify-between">
              <Button variant="outline" size="icon" onClick={goToPrevious}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="ghost" onClick={goToToday} className="font-semibold">
                {isToday(currentDate)
                  ? t('common.today')
                  : format(currentDate, lang === 'es' ? "EEE d MMM" : "EEE, MMM d", { locale: dateLocale })}
              </Button>
              <Button variant="outline" size="icon" onClick={goToNext}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <Card>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="p-8 text-center text-muted-foreground">{t('common.loading')}</div>
                ) : (
                  <div className="max-h-[60vh] overflow-y-auto">
                    {/* Hour grid with absolutely-positioned events */}
                    <div className="flex">
                      {/* Hour labels column */}
                      <div className="w-16 flex-shrink-0">
                        {hours.map((hour) => (
                          <div key={hour} className="h-[60px] p-2 text-xs text-muted-foreground text-right border-b border-border">
                            {hour === 0 ? `12 ${t('time.am')}` : hour < 12 ? `${hour} ${t('time.am')}` : hour === 12 ? `12 ${t('time.pm')}` : `${hour - 12} ${t('time.pm')}`}
                          </div>
                        ))}
                      </div>

                      {/* Events column — relative container for absolute event blocks */}
                      <div className="flex-1 relative" style={{ height: `${24 * 60 * PIXELS_PER_MINUTE}px` }}>
                        {/* Hour grid lines */}
                        {hours.map((hour) => (
                          <div key={hour} className="absolute w-full border-b border-border" style={{ top: `${hour * 60 * PIXELS_PER_MINUTE}px`, height: `${60 * PIXELS_PER_MINUTE}px` }} />
                        ))}

                        {/* Timed events — sorted by start, positioned absolutely */}
                        {[...dayEvents]
                          .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())
                          .map((event) => {
                            const start = new Date(event.starts_at);
                            const end = new Date(event.ends_at);
                            const startMinutes = start.getHours() * 60 + start.getMinutes();
                            const durationMin = Math.max(15, (end.getTime() - start.getTime()) / 60000);
                            const topPx = startMinutes * PIXELS_PER_MINUTE;
                            const heightPx = Math.max(15, durationMin * PIXELS_PER_MINUTE);

                            return (
                              <div
                                key={event.id}
                                className={`${getCategoryColor(event.category)} border-l-4 rounded p-2 cursor-pointer hover:opacity-80 transition-opacity absolute left-1 right-1 z-10 overflow-hidden`}
                                style={{ top: `${topPx}px`, height: `${heightPx}px` }}
                                onClick={() => handleViewEvent(event)}
                              >
                                <div className="text-sm font-medium truncate">{event.title}</div>
                                <div className="text-xs text-muted-foreground">
                                  {format(start, "h:mm a")} - {format(end, "h:mm a")}
                                </div>
                              </div>
                            );
                          })}

                        {/* Captures — rendered inline at their hour position, NOT absolutely */}
                        {dayPhotos.map((photo) => {
                          const photoTime = new Date(photo.occurred_at);
                          const photoMinutes = photoTime.getHours() * 60 + photoTime.getMinutes();
                          const topPx = photoMinutes * PIXELS_PER_MINUTE;
                          const context = getNearbyContext(photoTime);

                          return (
                            <div
                              key={photo.id}
                              className="category-photo border-l-4 rounded p-2 cursor-pointer hover:opacity-80 transition-opacity flex gap-2 items-start absolute left-1 right-1 z-20"
                              style={{ top: `${topPx}px` }}
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
                                  {format(photoTime, "h:mm a")}
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
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Health Overlay */}
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-3">{t('calendar.todaysActivity')}</h3>
                {isHealthLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-muted-foreground">{t('calendar.steps')}</span>
                        <span className="font-semibold">{health.steps.value.toLocaleString()} / {health.steps.goal.toLocaleString()}</span>
                      </div>
                      <Progress value={Math.min(100, (health.steps.value / health.steps.goal) * 100)} className="h-2" />
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-muted-foreground">{t('calendar.workout')}</span>
                        <span className="font-semibold">{health.workout.value} / {health.workout.goal} {t('calendar.minShort')}</span>
                      </div>
                      <Progress value={Math.min(100, (health.workout.value / health.workout.goal) * 100)} className="h-2" />
                    </div>
                  </div>
                )}
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
                {t('calendar.weekOf', { date: format(startOfWeek(currentDate, { weekStartsOn: 1 }), lang === 'es' ? "d MMM" : "MMM d", { locale: dateLocale }) })}
              </span>
              <Button variant="outline" size="icon" onClick={goToNext}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <Card>
              <CardContent className="p-0">
                {(() => {
                  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
                  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

                  return (
                    <>
                      <div className="grid grid-cols-8 border-b border-border">
                        <div className="p-2" />
                        {weekDays.map((day, i) => {
                          const isCurrentDay = isToday(day);
                          const isSelected = isSameDay(day, currentDate);
                          return (
                            <button
                              key={i}
                              className={`p-2 text-center text-xs font-medium cursor-pointer hover:bg-muted/50 transition-colors ${isCurrentDay ? 'text-primary font-bold' : ''}`}
                              onClick={() => handleWeekDayClick(day)}
                            >
                              <div className="text-muted-foreground">{daysShort[i]}</div>
                              <div className={`mt-1 w-7 h-7 flex items-center justify-center mx-auto rounded-full ${
                                isSelected ? 'bg-primary text-primary-foreground' : isCurrentDay ? 'bg-primary/20' : ''
                              }`}>
                                {format(day, "d")}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                      
                      <div className="max-h-[50vh] overflow-y-auto">
                        <div className="grid grid-cols-8">
                          {/* Hour labels column */}
                          <div className="relative" style={{ height: `${16 * 60 * PIXELS_PER_MINUTE}px` }}>
                            {Array.from({ length: 16 }, (_, i) => i + 6).map((hour) => (
                              <div
                                key={hour}
                                className="absolute w-full p-1 text-xs text-muted-foreground text-right border-b border-border"
                                style={{ top: `${(hour - 6) * 60 * PIXELS_PER_MINUTE}px`, height: `${60 * PIXELS_PER_MINUTE}px` }}
                              >
                                {hour === 12 ? `12 ${t('time.pm')}` : hour > 12 ? `${hour - 12} ${t('time.pm')}` : `${hour} ${t('time.am')}`}
                              </div>
                            ))}
                          </div>

                          {/* Day columns with absolute event positioning */}
                          {weekDays.map((day, i) => {
                            const dayEvts = [...getEventsForDate(day)]
                              .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());

                            return (
                              <div
                                key={i}
                                className="border-l border-border relative"
                                style={{ height: `${16 * 60 * PIXELS_PER_MINUTE}px` }}
                                onClick={(e) => {
                                  // Calculate hour from click position
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  const y = e.clientY - rect.top;
                                  const clickMinute = Math.floor(y / PIXELS_PER_MINUTE) + 6 * 60;
                                  const clickHour = Math.floor(clickMinute / 60);
                                  const clickMin = clickMinute % 60;
                                  const newDate = new Date(day);
                                  newDate.setHours(clickHour, clickMin, 0, 0);
                                  handleNewEvent(newDate);
                                }}
                              >
                                {/* Grid lines */}
                                {Array.from({ length: 16 }, (_, h) => (
                                  <div
                                    key={h}
                                    className="absolute w-full border-b border-border"
                                    style={{ top: `${h * 60 * PIXELS_PER_MINUTE}px`, height: `${60 * PIXELS_PER_MINUTE}px` }}
                                  />
                                ))}

                                {/* Events positioned by minute */}
                                {dayEvts.map((event) => {
                                  const start = new Date(event.starts_at);
                                  const end = new Date(event.ends_at);
                                  const startMinutes = start.getHours() * 60 + start.getMinutes();
                                  const endMinutes = end.getHours() * 60 + end.getMinutes();
                                  const durationMin = Math.max(15, endMinutes - startMinutes);
                                  // Offset from grid start (6:00 AM = 360 min)
                                  const dayStartMinutes = 6 * 60;
                                  const topPx = Math.max(0, (startMinutes - dayStartMinutes) * PIXELS_PER_MINUTE);
                                  const heightPx = Math.max(15, durationMin * PIXELS_PER_MINUTE);

                                  return (
                                    <div
                                      key={event.id}
                                      className={`${getCategoryColor(event.category)} rounded text-[10px] p-0.5 leading-tight truncate cursor-pointer absolute left-0.5 right-0.5 z-10 overflow-hidden hover:opacity-80 transition-opacity`}
                                      style={{ top: `${topPx}px`, height: `${heightPx}px` }}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleViewEvent(event);
                                      }}
                                    >
                                      <div className="font-medium truncate">{event.title}</div>
                                      <div className="text-muted-foreground">
                                        {format(start, "h:mm a")}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  );
                })()}
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
                {format(currentDate, "MMMM yyyy", { locale: dateLocale })}
              </span>
              <Button variant="outline" size="icon" onClick={goToNext}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <Card>
              <CardContent className="p-4">
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {dayLetters.map((day, i) => (
                    <div key={i} className="text-center text-xs font-medium text-muted-foreground py-2">
                      {day}
                    </div>
                  ))}
                </div>
                
                <div className="grid grid-cols-7 gap-1">
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
                    
                    // Add actual days
                    for (let day = 1; day <= daysInMonth; day++) {
                      const dayDate = setDate(currentDate, day);
                      const dayEvents = getEventsForDate(dayDate);
                      const isToday = isCurrentMonth && day === today.getDate();
                      
                      slots.push(
                        <button
                          key={day}
                          onClick={() => handleDayClick(day)}
                          className={`aspect-square flex flex-col items-center justify-center rounded-md border transition-colors cursor-pointer ${
                            isToday
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'border-border hover:bg-muted/50 hover:border-primary/50'
                          }`}
                        >
                          <span className="text-sm">{day}</span>
                          {dayEvents.length > 0 && (
                            <div className="flex gap-0.5 mt-1">
                              {dayEvents.slice(0, 3).map((event, idx) => (
                                <div 
                                  key={idx} 
                                  className={`w-1 h-1 rounded-full ${
                                    event.category === 'trabajo' ? 'bg-category-work' :
                                    event.category === 'deporte' ? 'bg-category-sport' :
                                    event.category === 'salud' ? 'bg-primary' :
                                    event.category === 'estudio' ? 'bg-category-study' :
                                    'bg-secondary'
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

        {/* Quick Add Button */}
        <Button className="w-full" size="lg" onClick={() => handleNewEvent(currentDate)}>
          <Plus className="h-5 w-5 mr-2" />
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

        {/* Event Detail Modal (read-only, Apple-style) */}
        <EventDetailModal
          open={!!detailEvent}
          onOpenChange={(open) => { if (!open) setDetailEvent(null); }}
          event={detailEvent}
          onEdit={(ev) => handleEditEvent(ev)}
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

        {/* Focus Mode Section */}
        <div className="space-y-4 mt-8 pt-8 border-t border-border">
          <div className="flex items-center gap-3 mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
              <Lock className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">{t('calendar.focusMode')}</h2>
              <p className="text-xs text-muted-foreground">{t('calendar.timeWellSpent')}</p>
            </div>
          </div>

          {/* Daily Time Cap */}
          <Card>
            <CardContent className="p-6">
              {focusLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-10 w-24 mx-auto" />
                  <Skeleton className="h-2 w-full" />
                  <Skeleton className="h-4 w-full" />
                </div>
              ) : (
                <>
                  <div className="text-center mb-4">
                    <div className="text-4xl font-bold text-foreground mb-2">
                      {remainingMinutes} {t('calendar.minShort')}
                    </div>
                    <p className="text-sm text-muted-foreground">{t('calendar.remainingToday')}</p>
                  </div>
                  
                  <Progress value={overallProgress * 100} className="h-2 mb-2" />
                  
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{totalUsedMinutes} {t('calendar.minUsed')}</span>
                    <span>{dailyLimitMinutes} {t('calendar.minDaily')}</span>
                  </div>
                  
                  <Button
                    className="w-full mt-4"
                    variant="outline"
                    onClick={handleExtendTime}
                    disabled={updateGoalMutation.isPending}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {t('calendar.extendTime')}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {/* Module Breakdown */}
          <div className="space-y-3">
            <h3 className="font-semibold">{t('calendar.moduleTime')}</h3>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{t('nav.feed')}</span>
                  <span className="text-sm text-muted-foreground">{feedMetrics.usedMinutes}/{feedMetrics.limitMinutes} {t('calendar.minShort')}</span>
                </div>
                <Progress value={feedMetrics.progress * 100} className="h-2" />
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{t('nav.explore')}</span>
                  <span className="text-sm text-muted-foreground">{exploreMetrics.usedMinutes}/{exploreMetrics.limitMinutes} {t('calendar.minShort')}</span>
                </div>
                <Progress value={exploreMetrics.progress * 100} className="h-2" />
              </CardContent>
            </Card>
            
            <Card className="bg-muted/30">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{t('calendar.calendarAndProfile')}</span>
                  <span className="text-sm text-primary font-semibold">{t('calendar.unlimited')}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Weekly Time Saved */}
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold mb-4">{t('calendar.timeSavedThisWeek')}</h3>
              
              {isWeekLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-48 w-full" />
                  <Skeleton className="h-6 w-24 mx-auto" />
                </div>
              ) : (
                <>
                  <div className="flex items-end justify-between gap-2 h-48 mb-4">
                    {weeklyData.map((data, i) => {
                      const barHeight = data.goalMinutes > 0
                        ? Math.min(1, data.savedMinutes / data.goalMinutes) * 100
                        : 0;
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-2">
                          <div className="w-full bg-muted rounded-t-lg overflow-hidden relative" style={{ height: '100%' }}>
                            <div
                              className="absolute bottom-0 w-full bg-gradient-to-t from-primary to-primary/70 rounded-t-lg transition-all"
                              style={{ height: `${barHeight}%` }}
                            />
                          </div>
                          <div className="text-xs text-muted-foreground">{daysShort[i]}</div>
                        </div>
                      );
                    })}
                  </div>
                  
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary mb-1">
                      {totalWeeklySaved} {t('calendar.minShort')}
                    </div>
                    {totalWeeklySaved >= 60 && (
                      <p className="text-xs text-muted-foreground mb-1">
                        ≈ {Math.floor(totalWeeklySaved / 60)} {t('calendar.hShort')} {totalWeeklySaved % 60 > 0 ? `${totalWeeklySaved % 60} ${t('calendar.minShort')}` : ''}
                      </p>
                    )}
                    <p className="text-sm text-muted-foreground">{t('calendar.totalTimeSaved')}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Settings */}
          <Card>
            <CardContent className="p-4">
              <h3 className="text-xs font-medium text-muted-foreground tracking-wide uppercase mb-3">{t('calendar.chosenTime')}</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
                  <span>{t('calendar.dailyCap')}</span>
                  <span className="text-muted-foreground">{dailyLimitMinutes} {t('calendar.minShort')}</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
                  <span>{t('calendar.feedCap')}</span>
                  <span className="text-muted-foreground">{feedMetrics.limitMinutes} {t('calendar.minShort')}</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
                  <span>{t('calendar.exploreCap')}</span>
                  <span className="text-muted-foreground">{exploreMetrics.limitMinutes} {t('calendar.minShort')}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <ContextHelpTooltip
        helpKey="calendar:header"
        title={t("contextHelp.calendarTitle")}
        body={t("contextHelp.calendarBody")}
        anchorRef={calendarHeaderRef}
        placement="bottom"
      />

      <BottomNav />
    </div>
  );
};

export default Calendar;
