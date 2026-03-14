import { useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { CaptureDetailModal } from "@/components/CaptureDetailModal";
import { ResponsiveNav } from "@/components/ResponsiveNav";
import { Button } from "@/components/ui/button";
import { Settings, Share2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { DailyActivityModal } from "@/components/DailyActivityModal";
import { EditProfileDialog } from "@/components/EditProfileDialog";
import { SettingsDialog } from "@/components/SettingsDialog";
import { FollowListModal } from "@/components/FollowListModal";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { ProfileShareSheet } from "@/components/ProfileShareSheet";
import { Progress } from "@/components/ui/progress";
import { subDays, format, isSameDay, parseISO } from "date-fns";
import { useProfile, useProfileStats } from "@/hooks/use-profile";
import { useUserEntries } from "@/hooks/use-entries";
import { useTranslation } from "react-i18next";
import { useFocusMetrics, useTodayAllModulesUsage } from "@/hooks/use-focus-metrics";
import { useTodayWorkoutSessions } from "@/hooks/use-workout-sessions";
import { WorkoutBreakdownModal } from "@/components/WorkoutBreakdownModal";
import { FirstTapTooltip } from "@/components/FirstTapTooltip";
import { ContextHelpTooltip } from "@/components/ContextHelpTooltip";
import { ScreenTimeModal } from "@/components/ScreenTimeModal";
import { useGuide } from "@/contexts/GuideContext";
import { useDevice } from "@/hooks/use-device";
import { useNavStyle } from "@/components/ResponsiveNav";
import { cn } from "@/lib/utils";

const Profile = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [editProfileTapped, setEditProfileTapped] = useState(false);
  const editProfileRef = useRef<HTMLButtonElement>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [activityModalOpen, setActivityModalOpen] = useState(false);
  const [followListType, setFollowListType] = useState<"followers" | "following" | null>(null);
  const [captureDetailIndex, setCaptureDetailIndex] = useState<number | null>(null);
  const [workoutModalOpen, setWorkoutModalOpen] = useState(false);
  const [screenTimeModalOpen, setScreenTimeModalOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareTapped, setShareTapped] = useState(false);
  const shareRef = useRef<HTMLButtonElement>(null);
  const profileHeaderRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const { isFirstTap, markFirstTap } = useGuide();
  // Use centralized hooks
  const { data: entries = [] } = useUserEntries();
  const { data: profile } = useProfile();
  const { data: stats } = useProfileStats();
  const { health, isHealthLoading } = useFocusMetrics();
  const { data: workoutBreakdown } = useTodayWorkoutSessions();
  const { data: todayModuleUsage = [] } = useTodayAllModulesUsage();

  // Use workout_sessions total if available, otherwise fall back to health_daily
  const workoutValue = workoutBreakdown && workoutBreakdown.totalMinutes > 0
    ? workoutBreakdown.totalMinutes
    : health.workout.value;

  // Screen time from time_usage
  const screenTimeSeconds = todayModuleUsage.reduce((acc, u) => acc + u.seconds_used, 0);
  const screenTimeMinutes = Math.floor(screenTimeSeconds / 60);
  const moduleUsageForModal = todayModuleUsage
    .filter((u) => u.seconds_used > 0)
    .sort((a, b) => b.seconds_used - a.seconds_used)
    .map((u) => ({ module: u.module, seconds: u.seconds_used }));

  // Sleep: robust parsing from health_daily sleep_minutes
  const rawSleepMin = health.sleep.value;
  const sleepH = Number.isFinite(rawSleepMin) && rawSleepMin > 0
    ? Math.round((rawSleepMin / 60) * 10) / 10
    : 0;
  const sleepGoalH = Number.isFinite(health.sleep.goal) && health.sleep.goal > 0
    ? Math.round((health.sleep.goal / 60) * 10) / 10
    : 8;

  const healthData = [
    { key: 'steps', label: t('calendar.steps'), value: health.steps.value, goal: health.steps.goal, unit: '', tappable: false, format: 'number' as const },
    { key: 'workout', label: `${t('calendar.workout')} (${t('calendar.minShort')})`, value: workoutValue, goal: health.workout.goal, unit: '', tappable: true, format: 'number' as const },
    { key: 'sleep', label: `${t('devices.dataTypes.sleep')} (h)`, value: sleepH, goal: sleepGoalH, unit: 'h', tappable: false, format: 'decimal' as const },
    { key: 'screenTime', label: t('profile.screenTime'), value: screenTimeMinutes, goal: 0, unit: t('calendar.minShort'), tappable: true, format: 'number' as const },
  ];

  // Calculate activity based on real entries for each day
  const getActivityData = (dayIndex: number) => {
    const date = subDays(new Date(), 27 - dayIndex);
    const dayEntries = entries.filter(entry => 
      isSameDay(parseISO(entry.occurred_at), date)
    );
    
    return {
      work: 0,
      workout: 0,
      steps: 0,
      audiobooks: 0,
      reading: 0,
      social: 0,
      photos: dayEntries.length,
      entries: dayEntries,
    };
  };

  const handleDayClick = (dayIndex: number) => {
    const date = subDays(new Date(), 27 - dayIndex);
    setSelectedDate(date);
    setActivityModalOpen(true);
  };

  const device = useDevice();
  const navStyle = useNavStyle();
  const isLandscape = device.isLandscape;

  return (
    <div className={cn("min-h-screen bg-background")} style={navStyle}>
      <div className={cn("mx-auto p-4 space-y-4", isLandscape ? "max-w-5xl" : "max-w-2xl")}>
        {/* Header */}
        <div ref={profileHeaderRef} className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-foreground">{t('profile.title')}</h1>
          <div className="flex items-center gap-1">
            <Button
              ref={shareRef}
              variant="ghost"
              size="icon"
              onClick={() => {
                setShareTapped(true);
                setShareOpen(true);
              }}
            >
              <Share2 className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setSettingsOpen(true)}>
              <Settings className="h-5 w-5" />
            </Button>
          </div>
          <FirstTapTooltip
            tapId="profileShare"
            pageKey="profile-share"
            title={t("guide.tips.profileShareTitle")}
            body={t("guide.tips.profileShareBody")}
            anchorRef={shareRef}
            show={shareTapped}
          />
        </div>

        {/* Profile Card */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start gap-4 mb-4">
              <ProfileAvatar
                photoUrl={profile?.photo_url}
                handle={profile?.handle}
                name={profile?.name}
                size="xl"
                className="ring-2 ring-border"
              />
              <div className="flex-1">
                <h2 className="text-xl font-bold">@{profile?.handle || 'user'}</h2>
                <p className="text-sm text-muted-foreground">{profile?.bio || t('profile.defaultBio')}</p>
                <div className="flex gap-4 mt-2 text-sm">
                  <span><strong>{stats?.postsCount || 0}</strong> {t('profile.posts')}</span>
                  <button 
                    onClick={() => setFollowListType("followers")}
                    className="hover:underline"
                  >
                    <strong>{stats?.followersCount || 0}</strong> {t('profile.followers')}
                  </button>
                  <button 
                    onClick={() => setFollowListType("following")}
                    className="hover:underline"
                  >
                    <strong>{stats?.followingCount || 0}</strong> {t('profile.following')}
                  </button>
                </div>
              </div>
            </div>
            <Button
              ref={editProfileRef}
              className="w-full"
              variant="outline"
              onClick={() => {
                setEditProfileTapped(true);
                setEditProfileOpen(true);
              }}
            >
              {t('profile.editProfile')}
            </Button>
            <FirstTapTooltip
              tapId="editProfileBtn"
              pageKey="profile"
              title={t("guide.tips.profileEditTitle")}
              body={t("guide.tips.profileEditBody")}
              anchorRef={editProfileRef}
              show={editProfileTapped}
            />
          </CardContent>
        </Card>

        {/* Two-column layout in landscape */}
        <div className={cn(isLandscape ? "grid grid-cols-2 gap-6" : "space-y-4")}>
          {/* Left column: Stats + Calendar */}
          <div className="space-y-4">
            {/* Today's Stats */}
            <div ref={statsRef} className="space-y-3">
              <h2 className="font-semibold">{t('profile.todayStats')}</h2>
              {healthData.map((data) => {
                const isScreenTime = data.key === 'screenTime';
                const progress = !isScreenTime && data.goal > 0 ? Math.min(100, (data.value / data.goal) * 100) : 0;
                const displayValue = data.format === 'decimal' 
                  ? data.value.toFixed(1)
                  : data.value.toLocaleString();
                const displayGoal = data.format === 'decimal'
                  ? data.goal.toFixed(1)
                  : data.goal.toLocaleString();

                return (
                  <Card
                    key={data.key}
                    className={data.tappable ? "cursor-pointer hover:ring-1 hover:ring-primary/30 transition-all" : ""}
                    onClick={() => {
                      if (data.key === 'workout') setWorkoutModalOpen(true);
                      if (data.key === 'screenTime') setScreenTimeModalOpen(true);
                    }}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{data.label}</span>
                        <span className="text-sm text-muted-foreground">
                          {isScreenTime
                            ? `${displayValue} ${data.unit}`
                            : `${displayValue} / ${displayGoal}`
                          }
                        </span>
                      </div>
                      {!isScreenTime && <Progress value={progress} className="h-2" />}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Mini Calendar */}
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-4">{t('profile.activityCalendar')}</h3>
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: 28 }, (_, i) => {
                    const activities = getActivityData(i);
                    const hasPhotos = activities.photos > 0;
                    const intensity = hasPhotos 
                      ? activities.photos >= 3 ? 2 : activities.photos >= 2 ? 1 : 0
                      : -1;
                    
                    return (
                      <button
                        key={i}
                        onClick={() => handleDayClick(i)}
                        className={`aspect-square rounded-sm transition-all hover:ring-2 hover:ring-primary/50 cursor-pointer ${
                          hasPhotos
                            ? intensity === 0
                              ? 'intensity-low'
                              : intensity === 1
                              ? 'intensity-medium'
                              : 'intensity-high'
                            : 'intensity-none'
                        }`}
                      />
                    );
                  })}
                </div>
                <div className="flex justify-end gap-2 mt-3 text-xs text-muted-foreground">
                  <span>{t('common.less')}</span>
                  <div className="flex gap-1">
                    <div className="w-3 h-3 rounded-sm intensity-none" />
                    <div className="w-3 h-3 rounded-sm intensity-low" />
                    <div className="w-3 h-3 rounded-sm intensity-medium" />
                    <div className="w-3 h-3 rounded-sm intensity-high" />
                  </div>
                  <span>{t('common.more')}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right column: Captures */}
          <div className="space-y-3">
            <h2 className="font-semibold">{t('profile.myCaptures')}</h2>
            <div className={cn("grid gap-2", isLandscape ? "grid-cols-4" : "grid-cols-3")}>
              {entries.length > 0 ? (
                entries.slice(0, isLandscape ? 12 : 9).map((entry, idx) => (
                  <div
                    key={entry.id}
                    onClick={() => setCaptureDetailIndex(idx)}
                    className="aspect-square rounded-lg bg-muted relative overflow-hidden group cursor-pointer"
                  >
                    {entry.photo_url ? (
                      <img 
                        src={entry.photo_url} 
                        alt="Capture" 
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl bg-gradient-to-br from-primary/10 to-secondary/10">
                        📸
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-foreground/70 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="text-background text-xs">
                        {format(parseISO(entry.occurred_at), "d MMM, HH:mm")}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-3 text-center py-8 text-muted-foreground">
                  <p>{t('profile.noCapturesYet')}</p>
                  <p className="text-sm">{t('profile.useQuickCamera')}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Settings Dialog */}
      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        onEditProfile={() => setEditProfileOpen(true)}
      />

      <DailyActivityModal 
        open={activityModalOpen}
        onOpenChange={setActivityModalOpen}
        date={selectedDate}
        activities={selectedDate ? getActivityData(Math.floor((new Date().getTime() - selectedDate.getTime()) / (1000 * 60 * 60 * 24))) : {
          work: 0,
          workout: 0,
          steps: 0,
          audiobooks: 0,
          reading: 0,
          social: 0,
        }}
      />

      <EditProfileDialog
        open={editProfileOpen}
        onOpenChange={setEditProfileOpen}
        profile={profile}
      />

      {user && (
        <FollowListModal
          open={followListType !== null}
          onOpenChange={(open) => !open && setFollowListType(null)}
          userId={user.id}
          type={followListType || "followers"}
        />
      )}

      {captureDetailIndex !== null && (
        <CaptureDetailModal
          open={captureDetailIndex !== null}
          onOpenChange={(open) => !open && setCaptureDetailIndex(null)}
          entries={entries}
          initialIndex={captureDetailIndex}
        />
      )}

      {workoutBreakdown && (
        <WorkoutBreakdownModal
          open={workoutModalOpen}
          onOpenChange={setWorkoutModalOpen}
          data={workoutBreakdown}
          goal={health.workout.goal}
        />
      )}

      <ScreenTimeModal
        open={screenTimeModalOpen}
        onOpenChange={setScreenTimeModalOpen}
        moduleUsage={moduleUsageForModal}
        totalSeconds={screenTimeSeconds}
      />

      <ProfileShareSheet
        open={shareOpen}
        onOpenChange={setShareOpen}
        handle={profile?.handle || "user"}
      />

      <ContextHelpTooltip
        helpKey="profile:header"
        title={t("contextHelp.profileTitle")}
        body={t("contextHelp.profileBody")}
        anchorRef={profileHeaderRef}
        placement="bottom"
      />

      <ContextHelpTooltip
        helpKey="profile:stats"
        title={t("contextHelp.profileStatsTitle")}
        body={t("contextHelp.profileStatsBody")}
        anchorRef={statsRef}
        placement="bottom"
        delayMs={9500}
      />

      <BottomNav />
    </div>
  );
};

export default Profile;