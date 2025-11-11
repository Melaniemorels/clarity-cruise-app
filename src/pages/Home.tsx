import { Card, CardContent } from "@/components/ui/card";
import { BottomNav } from "@/components/BottomNav";
import { Calendar as CalendarIcon, Users, Heart, Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

const Home = () => {
  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="mx-auto max-w-2xl p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-foreground">VYV</h1>
          <div className="text-sm text-muted-foreground">Today</div>
        </div>

        {/* Top Cards */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="p-6">
              <div className="flex flex-col items-center text-center space-y-2">
                <div className="text-3xl">🧘</div>
                <h3 className="font-semibold text-foreground">Online Class</h3>
                <p className="text-xs text-muted-foreground">Yoga • Pilates • Meditation</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-secondary/10 to-secondary/5 border-secondary/20">
            <CardContent className="p-6">
              <div className="flex flex-col items-center text-center space-y-2">
                <div className="text-3xl">🎵</div>
                <h3 className="font-semibold text-foreground">Listen</h3>
                <p className="text-xs text-muted-foreground">Music • Audiobooks • Podcasts</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Monthly Calendar Widget */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2">
                <CalendarIcon className="h-4 w-4" />
                January 2025
              </h3>
              <Button variant="ghost" size="sm">View All</Button>
            </div>
            
            <div className="grid grid-cols-7 gap-1 text-center text-xs">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                <div key={i} className="text-muted-foreground font-medium py-2">{day}</div>
              ))}
              {Array.from({ length: 35 }, (_, i) => i + 1).map((day) => (
                <div
                  key={day}
                  className={`aspect-square flex items-center justify-center rounded-md ${
                    day === 11
                      ? 'bg-primary text-primary-foreground font-semibold'
                      : day > 31
                      ? 'text-muted-foreground/30'
                      : day % 3 === 0
                      ? 'bg-accent/20'
                      : ''
                  }`}
                >
                  {day <= 31 ? day : ''}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Large Photo Post */}
        <Card className="overflow-hidden">
          <div className="aspect-[4/3] bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
            <div className="text-6xl">🌿</div>
          </div>
          <CardContent className="p-4">
            <p className="text-sm mb-2">Morning meditation by the lake. Finding peace in the simple moments. #mindfulness #wellness</p>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>2 hours ago</span>
              <div className="flex gap-4">
                <button className="flex items-center gap-1 hover:text-primary transition-colors">
                  <Heart className="h-4 w-4" />
                  <span>24</span>
                </button>
                <button className="flex items-center gap-1 hover:text-secondary transition-colors">
                  <Bookmark className="h-4 w-4" />
                  <span>8</span>
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Friends Tile */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-primary" />
                <div>
                  <h3 className="font-semibold">Friends</h3>
                  <p className="text-sm text-muted-foreground">42 connections</p>
                </div>
              </div>
              <Button variant="outline" size="sm">View All</Button>
            </div>
          </CardContent>
        </Card>

        {/* Day Agenda */}
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold mb-4">Today's Agenda</h3>
            <div className="space-y-3">
              {[
                { time: '7:00 AM', title: 'Morning Yoga', icon: '🧘', calories: '150 cal' },
                { time: '12:30 PM', title: 'Lunch Break', icon: '🍽️', calories: '20 min' },
                { time: '6:00 PM', title: 'Evening Run', icon: '🏃', calories: '300 cal' },
                { time: '8:00 PM', title: 'Meditation', icon: '🧘‍♀️', calories: '15 min' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                  <Checkbox />
                  <div className="text-2xl">{item.icon}</div>
                  <div className="flex-1">
                    <div className="font-medium">{item.title}</div>
                    <div className="text-xs text-muted-foreground">{item.time}</div>
                  </div>
                  <div className="text-xs text-muted-foreground">{item.calories}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <BottomNav />
    </div>
  );
};

export default Home;
