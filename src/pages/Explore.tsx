import { Card, CardContent } from "@/components/ui/card";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Bookmark } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { ContentPlayer } from "@/components/ContentPlayer";
import { useState } from "react";

const Explore = () => {
  const [selectedContent, setSelectedContent] = useState<{
    title: string;
    category: string;
    icon: string;
    duration: string;
    color: string;
  } | null>(null);
  const [playerOpen, setPlayerOpen] = useState(false);

  const handleContentClick = (item: any, category: any) => {
    setSelectedContent({
      ...item,
      category: category.title,
      icon: category.icon,
    });
    setPlayerOpen(true);
  };
  const categories = [
    {
      title: "Music",
      icon: "🎵",
      items: [
        { title: "Lo-Fi Beats", duration: "60 min", color: "from-purple-500/20 to-pink-500/20" },
        { title: "Nature Sounds", duration: "45 min", color: "from-green-500/20 to-teal-500/20" },
        { title: "Meditation Music", duration: "30 min", color: "from-blue-500/20 to-indigo-500/20" },
      ],
    },
    {
      title: "Audiobooks",
      icon: "🎧",
      items: [
        { title: "The Power of Now", duration: "7h 37m", color: "from-amber-500/20 to-orange-500/20" },
        { title: "Atomic Habits", duration: "5h 35m", color: "from-red-500/20 to-rose-500/20" },
        { title: "Mindfulness", duration: "4h 20m", color: "from-cyan-500/20 to-sky-500/20" },
      ],
    },
    {
      title: "Podcasts",
      icon: "🎙️",
      items: [
        { title: "Wellness Daily", duration: "25 min", color: "from-emerald-500/20 to-green-500/20" },
        { title: "Mindful Living", duration: "35 min", color: "from-violet-500/20 to-purple-500/20" },
        { title: "Health & Habits", duration: "40 min", color: "from-fuchsia-500/20 to-pink-500/20" },
      ],
    },
    {
      title: "Yoga Classes",
      icon: "🧘",
      items: [
        { title: "Morning Flow", duration: "30 min", color: "from-primary/20 to-primary/10" },
        { title: "Power Yoga", duration: "45 min", color: "from-primary/20 to-primary/10" },
        { title: "Gentle Stretch", duration: "20 min", color: "from-primary/20 to-primary/10" },
      ],
    },
    {
      title: "Pilates",
      icon: "🤸",
      items: [
        { title: "Core Strength", duration: "25 min", color: "from-secondary/20 to-secondary/10" },
        { title: "Full Body", duration: "40 min", color: "from-secondary/20 to-secondary/10" },
        { title: "Beginner Flow", duration: "15 min", color: "from-secondary/20 to-secondary/10" },
      ],
    },
    {
      title: "Meditation",
      icon: "🧘‍♀️",
      items: [
        { title: "Morning Calm", duration: "10 min", color: "from-accent/20 to-accent/10" },
        { title: "Sleep Meditation", duration: "20 min", color: "from-accent/20 to-accent/10" },
        { title: "Stress Relief", duration: "15 min", color: "from-accent/20 to-accent/10" },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Explore</h1>
            <p className="text-sm text-muted-foreground">Discover wellness content</p>
          </div>
        </div>

        {/* Categories */}
        {categories.map((category, idx) => (
          <div key={idx} className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <span className="text-2xl">{category.icon}</span>
                {category.title}
              </h2>
              <Button variant="ghost" size="sm">View All</Button>
            </div>
            
            <ScrollArea className="w-full whitespace-nowrap">
              <div className="flex gap-4 pb-4">
                {category.items.map((item, i) => (
                  <Card 
                    key={i} 
                    className="flex-shrink-0 w-48 overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => handleContentClick(item, category)}
                  >
                    <div className={`h-32 bg-gradient-to-br ${item.color} flex items-center justify-center`}>
                      <div className="text-4xl">{category.icon}</div>
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-medium text-sm mb-1 truncate">{item.title}</h3>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">{item.duration}</span>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-6 w-6"
                          onClick={(e) => {
                            e.stopPropagation();
                            // Handle bookmark
                          }}
                        >
                          <Bookmark className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </div>
        ))}

        {/* Save as Template CTA */}
        <Card className="bg-gradient-to-br from-primary/10 to-secondary/10 border-primary/20">
          <CardContent className="p-6 text-center">
            <h3 className="font-semibold mb-2">Create Your Perfect Day</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Save your favorite activities as a template and apply them to your calendar in one tap
            </p>
            <Button>Create Template</Button>
          </CardContent>
        </Card>
      </div>

      <ContentPlayer
        open={playerOpen}
        onOpenChange={setPlayerOpen}
        content={selectedContent}
      />

      <BottomNav />
    </div>
  );
};

export default Explore;
