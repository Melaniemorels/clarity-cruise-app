import { Card, CardContent } from "@/components/ui/card";
import { ResponsiveNav, useNavPadding } from "@/components/ResponsiveNav";
import { AdaptiveHeading, AdaptiveText } from "@/components/AdaptiveLayout";
import { useDevice, useResponsiveFontSize } from "@/hooks/use-device";
import { Button } from "@/components/ui/button";
import { Bookmark } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { ContentPlayer } from "@/components/ContentPlayer";
import { useState } from "react";
import { openInAppBrowser } from "@/lib/browser";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

const Explore = () => {
  const { t } = useTranslation();
  const [selectedContent, setSelectedContent] = useState<{
    title: string;
    category: string;
    icon: string;
    duration: string;
    color: string;
  } | null>(null);
  const [playerOpen, setPlayerOpen] = useState(false);
  const device = useDevice();
  const navPadding = useNavPadding();
  const fonts = useResponsiveFontSize();

  const handleContentClick = async (item: { url?: string }) => {
    if (item.url) {
      await openInAppBrowser(item.url);
    }
  };

  const categories = [
    {
      title: t('explore.categories.music'),
      icon: "🎵",
      items: [
        { title: "Lo-Fi Beats", duration: "60 min", color: "from-purple-500/20 to-pink-500/20", url: "https://open.spotify.com/playlist/XXXX" },
        { title: "Nature Sounds", duration: "45 min", color: "from-green-500/20 to-teal-500/20", url: "https://www.youtube.com/watch?v=XXXX" },
        { title: "Meditation Music", duration: "30 min", color: "from-blue-500/20 to-indigo-500/20", url: "https://open.spotify.com/playlist/XXXX" },
      ],
    },
    {
      title: t('explore.categories.audiobooks'),
      icon: "🎧",
      items: [
        { title: "The Power of Now", duration: "7h 37m", color: "from-amber-500/20 to-orange-500/20", url: "https://open.spotify.com/show/XXXX" },
        { title: "Atomic Habits", duration: "5h 35m", color: "from-red-500/20 to-rose-500/20", url: "https://www.audible.com/pd/XXXX" },
        { title: "Mindfulness", duration: "4h 20m", color: "from-cyan-500/20 to-sky-500/20", url: "https://www.audible.com/pd/XXXX" },
      ],
    },
    {
      title: t('explore.categories.podcasts'),
      icon: "🎙️",
      items: [
        { title: "Wellness Daily", duration: "25 min", color: "from-emerald-500/20 to-green-500/20", url: "https://open.spotify.com/show/XXXX" },
        { title: "Mindful Living", duration: "35 min", color: "from-violet-500/20 to-purple-500/20", url: "https://open.spotify.com/show/XXXX" },
        { title: "Health & Habits", duration: "40 min", color: "from-fuchsia-500/20 to-pink-500/20", url: "https://open.spotify.com/show/XXXX" },
      ],
    },
    {
      title: t('explore.categories.yoga'),
      icon: "🧘",
      items: [
        { title: "Morning Flow", duration: "30 min", color: "from-primary/20 to-primary/10", url: "https://www.youtube.com/watch?v=XXXX" },
        { title: "Power Yoga", duration: "45 min", color: "from-primary/20 to-primary/10", url: "https://www.youtube.com/watch?v=XXXX" },
        { title: "Gentle Stretch", duration: "20 min", color: "from-primary/20 to-primary/10", url: "https://www.youtube.com/watch?v=XXXX" },
      ],
    },
    {
      title: t('explore.categories.pilates'),
      icon: "🤸",
      items: [
        { title: "Core Strength", duration: "25 min", color: "from-secondary/20 to-secondary/10", url: "https://www.youtube.com/watch?v=XXXX" },
        { title: "Full Body", duration: "40 min", color: "from-secondary/20 to-secondary/10", url: "https://www.youtube.com/watch?v=XXXX" },
        { title: "Beginner Flow", duration: "15 min", color: "from-secondary/20 to-secondary/10", url: "https://www.youtube.com/watch?v=XXXX" },
      ],
    },
    {
      title: t('explore.categories.meditation'),
      icon: "🧘‍♀️",
      items: [
        { title: "Morning Calm", duration: "10 min", color: "from-accent/20 to-accent/10", url: "https://www.youtube.com/watch?v=XXXX" },
        { title: "Sleep Meditation", duration: "20 min", color: "from-accent/20 to-accent/10", url: "https://www.youtube.com/watch?v=XXXX" },
        { title: "Stress Relief", duration: "15 min", color: "from-accent/20 to-accent/10", url: "https://www.youtube.com/watch?v=XXXX" },
      ],
    },
    {
      title: t('explore.categories.nutrition'),
      icon: "🥗",
      items: [
        { title: "Healthy Recipes", duration: "15 min", color: "from-lime-500/20 to-green-500/20", url: "https://www.youtube.com/watch?v=XXXX" },
        { title: "Weekly Meal Prep", duration: "30 min", color: "from-orange-500/20 to-amber-500/20", url: "https://www.youtube.com/watch?v=XXXX" },
        { title: "Energy Smoothies", duration: "10 min", color: "from-pink-500/20 to-rose-500/20", url: "https://www.youtube.com/watch?v=XXXX" },
      ],
    },
    {
      title: t('explore.categories.mealPlans'),
      icon: "📋",
      items: [
        { title: "Caloric Deficit", duration: "Guide", color: "from-teal-500/20 to-cyan-500/20", url: "https://www.youtube.com/watch?v=XXXX" },
        { title: "High Protein", duration: "Guide", color: "from-red-500/20 to-orange-500/20", url: "https://www.youtube.com/watch?v=XXXX" },
        { title: "Intuitive Eating", duration: "Guide", color: "from-violet-500/20 to-indigo-500/20", url: "https://www.youtube.com/watch?v=XXXX" },
      ],
    },
  ];

  return (
    <div className={cn("min-h-screen bg-theme-bg transition-all duration-300", navPadding)}>
      <div className={cn(
        "space-y-6 transition-all",
        device.isMobile ? "p-4" : device.isTablet ? "p-6" : "p-8 max-w-7xl mx-auto"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <AdaptiveHeading level={1}>{t('explore.title')}</AdaptiveHeading>
            <AdaptiveText variant="small">{t('explore.subtitle')}</AdaptiveText>
          </div>
        </div>

        {/* Categories */}
        {categories.map((category, idx) => (
          <div key={idx} className={cn("space-y-3", device.isTablet && "space-y-4")}>
            <div className="flex items-center justify-between">
              <h2 className={cn(
                "font-semibold flex items-center gap-2 text-theme-textPrimary",
                fonts.heading3
              )}>
                <span className={device.isMobile ? "text-xl" : "text-2xl"}>{category.icon}</span>
                {category.title}
              </h2>
              <Button variant="ghost" size="sm">{t('common.viewAll')}</Button>
            </div>
            
            <ScrollArea className="w-full whitespace-nowrap">
              <div className={cn("flex pb-4", device.isMobile ? "gap-3" : "gap-4")}>
                {category.items.map((item, i) => (
                  <Card 
                    key={i} 
                    className={cn(
                      "flex-shrink-0 overflow-hidden cursor-pointer transition-all hover:scale-[1.02] bg-theme-cardBg",
                      device.isMobile ? "w-40" : device.isTablet ? "w-48" : "w-56"
                    )}
                    style={{
                      borderRadius: '18px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
                    }}
                    onClick={() => handleContentClick(item)}
                  >
                    <div className={cn(
                      "bg-gradient-to-br flex items-center justify-center",
                      item.color,
                      device.isMobile ? "h-28" : device.isTablet ? "h-32" : "h-36"
                    )}>
                      <div className={device.isMobile ? "text-3xl" : "text-4xl"}>{category.icon}</div>
                    </div>
                    <CardContent className={device.isMobile ? "p-3" : "p-4"}>
                      <h3 className={cn(
                        "font-medium mb-1 truncate text-theme-textPrimary",
                        fonts.small
                      )}>{item.title}</h3>
                      <div className="flex items-center justify-between">
                        <span className={cn("text-theme-textSecondary", device.isMobile ? "text-[10px]" : "text-xs")}>{item.duration}</span>
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
        <Card className="bg-gradient-to-br from-primary/10 to-secondary/10 border-primary/20 bg-theme-cardBg">
          <CardContent className="p-6 text-center">
            <h3 className="font-semibold mb-2 text-theme-textPrimary">{t('explore.createTemplateTitle')}</h3>
            <p className="text-sm text-theme-textSecondary mb-4">
              {t('explore.createTemplateDescription')}
            </p>
            <Button>{t('explore.createTemplate')}</Button>
          </CardContent>
        </Card>
      </div>

      <ContentPlayer
        open={playerOpen}
        onOpenChange={setPlayerOpen}
        content={selectedContent}
      />

      <ResponsiveNav />
    </div>
  );
};

export default Explore;
