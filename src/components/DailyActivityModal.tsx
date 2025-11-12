import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Briefcase, Dumbbell, Footprints, Headphones, BookOpen, Users } from "lucide-react";

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

const activityConfig = [
  { key: 'work', label: 'Trabajo', icon: Briefcase, color: 'bg-blue-500', max: 480 }, // 8 hours
  { key: 'workout', label: 'Ejercicio', icon: Dumbbell, color: 'bg-green-500', max: 120 }, // 2 hours
  { key: 'steps', label: 'Pasos', icon: Footprints, color: 'bg-primary', max: 10000 }, // 10k steps
  { key: 'audiobooks', label: 'Audiolibros', icon: Headphones, color: 'bg-purple-500', max: 180 }, // 3 hours
  { key: 'reading', label: 'Lectura', icon: BookOpen, color: 'bg-orange-500', max: 120 }, // 2 hours
  { key: 'social', label: 'Amigos', icon: Users, color: 'bg-pink-500', max: 240 }, // 4 hours
];

export const DailyActivityModal = ({ open, onOpenChange, date, activities }: DailyActivityModalProps) => {
  if (!date) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Actividades - {format(date, "d 'de' MMMM", { locale: es })}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {activityConfig.map(({ key, label, icon: Icon, color, max }) => {
            const value = activities[key as keyof ActivityData] || 0;
            const percentage = Math.min((value / max) * 100, 100);
            const displayValue = key === 'steps' 
              ? value.toLocaleString() 
              : `${Math.floor(value)} min`;

            return (
              <div key={key} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${color.replace('bg-', 'text-')}`} />
                    <span className="font-medium text-sm">{label}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {displayValue}
                  </span>
                </div>
                <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full ${color} transition-all duration-300`}
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
            <span className="font-medium">Tiempo total activo</span>
            <span className="text-muted-foreground">
              {Math.floor((activities.work + activities.workout + activities.audiobooks + activities.reading + activities.social) / 60)}h {(activities.work + activities.workout + activities.audiobooks + activities.reading + activities.social) % 60}m
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
