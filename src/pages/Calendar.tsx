import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Calendar = () => {
  const [view, setView] = useState<"day" | "week" | "month">("day");
  
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const events = [
    { time: 7, duration: 1, title: 'Morning Yoga', color: 'bg-primary/20 border-primary' },
    { time: 9, duration: 3, title: 'Work', color: 'bg-blue-500/20 border-blue-500' },
    { time: 12, duration: 0.5, title: 'Lunch', color: 'bg-amber-500/20 border-amber-500' },
    { time: 14, duration: 2, title: 'Work', color: 'bg-blue-500/20 border-blue-500' },
    { time: 18, duration: 1, title: 'Evening Run', color: 'bg-green-500/20 border-green-500' },
    { time: 20, duration: 0.5, title: 'Meditation', color: 'bg-purple-500/20 border-purple-500' },
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Calendar</h1>
            <p className="text-sm text-muted-foreground">January 11, 2025</p>
          </div>
          <Button size="icon">
            <Plus className="h-5 w-5" />
          </Button>
        </div>

        {/* View Tabs */}
        <Tabs value={view} onValueChange={(v) => setView(v as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="day">Day</TabsTrigger>
            <TabsTrigger value="week">Week</TabsTrigger>
            <TabsTrigger value="month">Month</TabsTrigger>
          </TabsList>

          {/* Day View */}
          <TabsContent value="day" className="space-y-4">
            <div className="flex items-center justify-between">
              <Button variant="outline" size="icon">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="font-semibold">Today</span>
              <Button variant="outline" size="icon">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <Card>
              <CardContent className="p-0">
                <div className="max-h-[60vh] overflow-y-auto">
                  {hours.map((hour) => {
                    const event = events.find(e => e.time === hour);
                    return (
                      <div key={hour} className="flex border-b border-border">
                        <div className="w-16 flex-shrink-0 p-2 text-xs text-muted-foreground text-right">
                          {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
                        </div>
                        <div className="flex-1 min-h-[60px] p-2 relative">
                          {event && (
                            <div
                              className={`${event.color} border-l-4 rounded p-2`}
                              style={{
                                height: `${event.duration * 60}px`,
                              }}
                            >
                              <div className="text-sm font-medium">{event.title}</div>
                              <div className="text-xs text-muted-foreground">
                                {event.duration * 60} min
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
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
              <Button variant="outline" size="icon">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="font-semibold">Week of Jan 6</span>
              <Button variant="outline" size="icon">
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
              <Button variant="outline" size="icon">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="font-semibold">January 2025</span>
              <Button variant="outline" size="icon">
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
        <Button className="w-full" size="lg">
          <Plus className="h-5 w-5 mr-2" />
          Quick Add
        </Button>
      </div>

      <BottomNav />
    </div>
  );
};

export default Calendar;
