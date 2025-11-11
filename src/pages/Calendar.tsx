import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Plus, ChevronLeft, ChevronRight, Lock, TrendingDown } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";

const Calendar = () => {
  const [view, setView] = useState<"day" | "week" | "month">("day");
  
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  // Focus Mode data
  const dailyMinutes = 45;
  const usedMinutes = 28;
  const feedMinutes = 10;
  const feedUsed = 7;
  const exploreMinutes = 15;
  const exploreUsed = 12;

  const weeklyData = [
    { day: 'Mon', saved: 15, goal: 45 },
    { day: 'Tue', saved: 22, goal: 45 },
    { day: 'Wed', saved: 18, goal: 45 },
    { day: 'Thu', saved: 25, goal: 45 },
    { day: 'Fri', saved: 20, goal: 45 },
    { day: 'Sat', saved: 17, goal: 45 },
    { day: 'Sun', saved: 0, goal: 45 },
  ];

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
