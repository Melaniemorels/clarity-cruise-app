import { Card, CardContent } from "@/components/ui/card";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Settings, Heart, Bookmark } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const Profile = () => {
  const { signOut } = useAuth();
  
  const healthData = {
    steps: { value: 8432, goal: 10000, label: 'Steps' },
    workout: { value: 45, goal: 60, label: 'Workout (min)' },
    resistance: { value: 3, goal: 4, label: 'Resistance Sets' },
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="mx-auto max-w-2xl p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-foreground">Profile</h1>
          <Button variant="ghost" size="icon" onClick={signOut}>
            <Settings className="h-5 w-5" />
          </Button>
        </div>

        {/* Profile Card */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-3xl">
                🌿
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold">@wellness_vibes</h2>
                <p className="text-sm text-muted-foreground">Finding balance through movement</p>
                <div className="flex gap-4 mt-2 text-sm">
                  <span><strong>124</strong> posts</span>
                  <span><strong>42</strong> friends</span>
                </div>
              </div>
            </div>
            <Button className="w-full" variant="outline">Edit Profile</Button>
          </CardContent>
        </Card>

        {/* Today's Stats */}
        <div className="space-y-3">
          <h2 className="font-semibold">Today</h2>
          
          {Object.entries(healthData).map(([key, data]) => (
            <Card key={key}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{data.label}</span>
                  <span className="text-sm text-muted-foreground">
                    {data.value} / {data.goal}
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-primary/70 transition-all"
                    style={{ width: `${Math.min((data.value / data.goal) * 100, 100)}%` }}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Mini Calendar */}
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold mb-4">Activity Calendar</h3>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: 28 }, (_, i) => {
                const hasActivity = Math.random() > 0.3;
                const intensity = Math.floor(Math.random() * 3);
                return (
                  <div
                    key={i}
                    className={`aspect-square rounded ${
                      hasActivity
                        ? intensity === 0
                          ? 'bg-primary/20'
                          : intensity === 1
                          ? 'bg-primary/50'
                          : 'bg-primary'
                        : 'bg-muted'
                    }`}
                  />
                );
              })}
            </div>
            <div className="flex justify-end gap-2 mt-2 text-xs text-muted-foreground">
              <span>Less</span>
              <div className="flex gap-1">
                <div className="w-3 h-3 rounded bg-muted" />
                <div className="w-3 h-3 rounded bg-primary/20" />
                <div className="w-3 h-3 rounded bg-primary/50" />
                <div className="w-3 h-3 rounded bg-primary" />
              </div>
              <span>More</span>
            </div>
          </CardContent>
        </Card>

        {/* Latest Posts */}
        <div className="space-y-3">
          <h2 className="font-semibold">Latest Posts</h2>
          
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 9 }, (_, i) => (
              <div
                key={i}
                className="aspect-square rounded-lg bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center text-2xl relative overflow-hidden group cursor-pointer"
              >
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                  <div className="flex items-center gap-1 text-white text-xs">
                    <Heart className="h-3 w-3" />
                    <span>{Math.floor(Math.random() * 50)}</span>
                  </div>
                  <div className="flex items-center gap-1 text-white text-xs">
                    <Bookmark className="h-3 w-3" />
                    <span>{Math.floor(Math.random() * 20)}</span>
                  </div>
                </div>
                {['🧘', '🏃', '💪', '🥗', '🌅', '🧘‍♀️', '🚴', '🏊', '🌿'][i]}
              </div>
            ))}
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Profile;
