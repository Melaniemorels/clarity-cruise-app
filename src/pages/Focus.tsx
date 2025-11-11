import { Card, CardContent } from "@/components/ui/card";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Lock, Plus } from "lucide-react";
import { Progress } from "@/components/ui/progress";

const Focus = () => {
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

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="mx-auto max-w-2xl p-4 space-y-4">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <Lock className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Focus Mode</h1>
          <p className="text-sm text-muted-foreground">Time well spent</p>
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
          <h2 className="font-semibold">Module Time</h2>
          
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
            <h2 className="font-semibold mb-4">Time Saved This Week</h2>
            
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

      <BottomNav />
    </div>
  );
};

export default Focus;
