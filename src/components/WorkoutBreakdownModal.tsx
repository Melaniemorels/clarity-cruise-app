import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Dumbbell, Clock, Flame, Activity, Bike, Footprints, Waves } from "lucide-react";
import { useTranslation } from "react-i18next";
import { format, parseISO } from "date-fns";
import { Progress } from "@/components/ui/progress";
import type { WorkoutBreakdown } from "@/hooks/use-workout-sessions";

interface WorkoutBreakdownModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: WorkoutBreakdown;
  goal: number;
}

const typeIcons: Record<string, typeof Dumbbell> = {
  strength: Dumbbell,
  cardio: Activity,
  running: Footprints,
  cycling: Bike,
  swimming: Waves,
  general: Dumbbell,
};

const typeColors: Record<string, string> = {
  strength: "text-orange-500",
  cardio: "text-red-500",
  running: "text-green-500",
  cycling: "text-blue-500",
  swimming: "text-cyan-500",
  general: "text-primary",
};

const typeBgColors: Record<string, string> = {
  strength: "bg-orange-500",
  cardio: "bg-red-500",
  running: "bg-green-500",
  cycling: "bg-blue-500",
  swimming: "bg-cyan-500",
  general: "bg-primary",
};

function capitalizeFirst(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export const WorkoutBreakdownModal = ({ open, onOpenChange, data, goal }: WorkoutBreakdownModalProps) => {
  const { t } = useTranslation();
  const progress = goal > 0 ? Math.min(100, (data.totalMinutes / goal) * 100) : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Dumbbell className="h-5 w-5 text-category-sport" />
            {t('calendar.workout')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Total progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t('dailyActivity.totalActiveTime')}</span>
              <span className="font-semibold">
                {data.totalMinutes} / {goal} {t('calendar.minShort')}
              </span>
            </div>
            <Progress value={progress} className="h-2.5" />
          </div>

          {/* Breakdown by type */}
          {data.byType.length > 0 ? (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground">
                {t('workout.breakdown', 'Desglose')}
              </h4>
              {data.byType.map(({ type, minutes, count }) => {
                const Icon = typeIcons[type] || Dumbbell;
                const colorClass = typeColors[type] || "text-primary";
                const bgColor = typeBgColors[type] || "bg-primary";
                const typeProgress = goal > 0 ? Math.min(100, (minutes / goal) * 100) : 0;

                return (
                  <div key={type} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className={`h-4 w-4 ${colorClass}`} />
                        <span className="text-sm font-medium">{capitalizeFirst(type)}</span>
                        <span className="text-xs text-muted-foreground">
                          ({count} {count === 1 ? 'sesión' : 'sesiones'})
                        </span>
                      </div>
                      <span className="text-sm font-semibold">{minutes} {t('calendar.minShort')}</span>
                    </div>
                    <div className="relative h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full ${bgColor} rounded-full transition-all duration-300`}
                        style={{ width: `${typeProgress}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <Dumbbell className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">{t('workout.noSessions', 'Sin sesiones de entrenamiento hoy')}</p>
            </div>
          )}

          {/* Individual sessions timeline */}
          {data.sessions.length > 0 && (
            <div className="space-y-2 pt-2 border-t">
              <h4 className="text-sm font-medium text-muted-foreground">
                {t('workout.timeline', 'Sesiones')}
              </h4>
              {data.sessions.map((session) => {
                const Icon = typeIcons[session.type] || Dumbbell;
                const colorClass = typeColors[session.type] || "text-primary";

                return (
                  <div key={session.id} className="flex items-center gap-3 py-1.5">
                    <Icon className={`h-4 w-4 flex-shrink-0 ${colorClass}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{capitalizeFirst(session.type)}</span>
                        <span className="text-sm text-muted-foreground">{session.minutes} {t('calendar.minShort')}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {format(parseISO(session.started_at), "HH:mm")}
                        {session.rpe && (
                          <span className="flex items-center gap-0.5">
                            <Flame className="h-3 w-3" /> RPE {session.rpe}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
