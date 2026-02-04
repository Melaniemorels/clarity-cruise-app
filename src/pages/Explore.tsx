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

  const handleContentClick = async (item: { url?: string; comingSoon?: boolean }) => {
    if (item.comingSoon) {
      return; // Don't open anything for coming soon items
    }
    if (item.url) {
      await openInAppBrowser(item.url);
    }
  };

  const categories = [
    {
      title: t('explore.categories.music'),
      icon: "🎵",
      items: [
        { title: "Lofi Girl", duration: "24/7", color: "from-purple-500/20 to-pink-500/20", url: "https://open.spotify.com/playlist/0vvXsWCC9xrXsKd4FyS8kM" },
        { title: t('explore.items.natureSounds'), duration: "10h", color: "from-green-500/20 to-teal-500/20", url: "https://www.youtube.com/watch?v=L8t9D9N4L08" },
        { title: t('explore.items.meditationMusic'), duration: "∞", color: "from-blue-500/20 to-indigo-500/20", url: "https://open.spotify.com/playlist/37i9dQZF1DWWQRwui0ExPn" },
      ],
    },
    {
      title: t('explore.categories.audiobooks'),
      icon: "🎧",
      items: [
        { title: "The Power of Now", duration: t('explore.comingSoon'), color: "from-amber-500/20 to-orange-500/20", comingSoon: true },
        { title: "Atomic Habits", duration: t('explore.comingSoon'), color: "from-red-500/20 to-rose-500/20", comingSoon: true },
        { title: t('explore.items.mindfulness'), duration: t('explore.comingSoon'), color: "from-cyan-500/20 to-sky-500/20", comingSoon: true },
      ],
    },
    {
      title: t('explore.categories.podcasts'),
      icon: "🎙️",
      items: [
        { title: "Huberman Lab", duration: "2h", color: "from-emerald-500/20 to-green-500/20", url: "https://www.hubermanlab.com/podcast" },
        { title: t('explore.items.healthHabits'), duration: t('explore.comingSoon'), color: "from-violet-500/20 to-purple-500/20", comingSoon: true },
        { title: t('explore.items.mindfulLiving'), duration: t('explore.comingSoon'), color: "from-fuchsia-500/20 to-pink-500/20", comingSoon: true },
      ],
    },
    {
      title: t('explore.categories.yoga'),
      icon: "🧘",
      items: [
        { title: "Yoga With Adriene", duration: "∞", color: "from-primary/20 to-primary/10", url: "https://www.youtube.com/@yogawithadriene" },
        { title: "Yoga With Tim", duration: "∞", color: "from-primary/20 to-primary/10", url: "https://www.youtube.com/@YogaWithTim" },
        { title: t('explore.items.yogaBeginners'), duration: "∞", color: "from-primary/20 to-primary/10", url: "https://www.youtube.com/playlist?list=PLui6Eyny-UzzWwB4h9y7jAzLbeuCUczAl" },
      ],
    },
    {
      title: t('explore.categories.pilates'),
      icon: "🤸",
      items: [
        { title: "Move With Nicole", duration: "25 min", color: "from-secondary/20 to-secondary/10", url: "https://www.youtube.com/@MoveWithNicole" },
        { title: t('explore.items.coreStrength'), duration: t('explore.comingSoon'), color: "from-secondary/20 to-secondary/10", comingSoon: true },
        { title: t('explore.items.fullBody'), duration: t('explore.comingSoon'), color: "from-secondary/20 to-secondary/10", comingSoon: true },
      ],
    },
    {
      title: t('explore.categories.meditation'),
      icon: "🧘‍♀️",
      items: [
        { title: "Great Meditation", duration: "10 min", color: "from-accent/20 to-accent/10", url: "https://www.youtube.com/@GreatMeditation" },
        { title: t('explore.items.sleepMeditation'), duration: t('explore.comingSoon'), color: "from-accent/20 to-accent/10", comingSoon: true },
        { title: t('explore.items.stressRelief'), duration: t('explore.comingSoon'), color: "from-accent/20 to-accent/10", comingSoon: true },
      ],
    },
    {
      title: t('explore.categories.nutrition'),
      icon: "🥗",
      items: [
        { title: "Pick Up Limes", duration: "∞", color: "from-lime-500/20 to-green-500/20", url: "https://www.youtube.com/@PickUpLimes" },
        { title: t('explore.items.healthyRecipes'), duration: t('explore.comingSoon'), color: "from-orange-500/20 to-amber-500/20", comingSoon: true },
        { title: t('explore.items.quickMeals'), duration: t('explore.comingSoon'), color: "from-pink-500/20 to-rose-500/20", comingSoon: true },
      ],
    },
    {
      title: t('explore.categories.mealPlans'),
      icon: "📋",
      items: [
        { title: t('explore.items.mealPrep'), duration: t('explore.comingSoon'), color: "from-teal-500/20 to-cyan-500/20", comingSoon: true },
        { title: t('explore.items.caloricDeficit'), duration: t('explore.comingSoon'), color: "from-red-500/20 to-orange-500/20", comingSoon: true },
        { title: t('explore.items.highProtein'), duration: t('explore.comingSoon'), color: "from-violet-500/20 to-indigo-500/20", comingSoon: true },
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
                      "flex-shrink-0 overflow-hidden transition-all bg-theme-cardBg",
                      device.isMobile ? "w-40" : device.isTablet ? "w-48" : "w-56",
                      item.comingSoon ? "opacity-60 cursor-default" : "cursor-pointer hover:scale-[1.02]"
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
