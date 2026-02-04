import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format } from "date-fns";
import { es, enUS } from "date-fns/locale";
import { Briefcase, Dumbbell, Footprints, Headphones, BookOpen, Users } from "lucide-react";
import { useTranslation } from "react-i18next";

interface ActivityData {
  work: number;
  workout: number;
  steps: number;
  audiobooks: number;
  reading: number;
  social: number;
}

interface DailyActivityModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: Date | null;
  activities: ActivityData;
}

export const DailyActivityModal = ({ open, onOpenChange, date, activities }: DailyActivityModalProps) => {
  const { t, i18n } = useTranslation();
  
  if (!date) return null;

  const lang = i18n.language.startsWith('es') ? 'es' : 'en';
  const dateLocale = lang === 'es' ? es : enUS;

  const activityConfig = [
    { key: 'work', label: t('dailyActivity.work'), icon: Briefcase, colorClass: 'bg-category-work', textClass: 'text-category-work', max: 480 },
    { key: 'workout', label: t('dailyActivity.workout'), icon: Dumbbell, colorClass: 'bg-category-sport', textClass: 'text-category-sport', max: 120 },
    { key: 'steps', label: t('dailyActivity.steps'), icon: Footprints, colorClass: 'bg-primary', textClass: 'text-primary', max: 10000 },
    { key: 'audiobooks', label: t('dailyActivity.audiobooks'), icon: Headphones, colorClass: 'bg-category-study', textClass: 'text-category-study', max: 180 },
    { key: 'reading', label: t('dailyActivity.reading'), icon: BookOpen, colorClass: 'bg-category-reading', textClass: 'text-category-reading', max: 120 },
    { key: 'social', label: t('dailyActivity.social'), icon: Users, colorClass: 'bg-category-social', textClass: 'text-category-social', max: 240 },
  ];

  const totalMinutes = activities.work + activities.workout + activities.audiobooks + activities.reading + activities.social;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {format(date, lang === 'es' ? "d 'de' MMMM" : "MMMM d", { locale: dateLocale })}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {activityConfig.map(({ key, label, icon: Icon, colorClass, textClass, max }) => {
            const value = activities[key as keyof ActivityData] || 0;
            const percentage = Math.min((value / max) * 100, 100);
            const displayValue = key === 'steps' 
              ? value.toLocaleString() 
              : `${Math.floor(value)} min`;

            return (
              <div key={key} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${textClass}`} />
                    <span className="font-medium text-sm">{label}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {displayValue}
                  </span>
                </div>
                <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full ${colorClass} transition-all duration-300`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Total summary */}
        <div className="pt-4 border-t">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">{t('dailyActivity.totalActiveTime')}</span>
            <span className="text-muted-foreground">
              {hours}h {minutes}m
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
