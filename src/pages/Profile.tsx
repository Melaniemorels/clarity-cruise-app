import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { DailyActivityModal } from "@/components/DailyActivityModal";
import { EditProfileDialog } from "@/components/EditProfileDialog";
import { SettingsDialog } from "@/components/SettingsDialog";
import { FollowListModal } from "@/components/FollowListModal";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { subDays, format, isSameDay, parseISO } from "date-fns";
import { useProfile, useProfileStats } from "@/hooks/use-profile";
import { useUserEntries } from "@/hooks/use-entries";
import { useTranslation } from "react-i18next";

const Profile = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [activityModalOpen, setActivityModalOpen] = useState(false);
  const [followListType, setFollowListType] = useState<"followers" | "following" | null>(null);

  // Use centralized hooks
  const { data: entries = [] } = useUserEntries();
  const { data: profile } = useProfile();
  const { data: stats } = useProfileStats();

  const healthData = {
    steps: { value: 8432, goal: 10000, label: t('calendar.steps') },
    workout: { value: 45, goal: 60, label: `${t('calendar.workout')} (min)` },
    sleep: { value: 7.5, goal: 8, label: 'Sleep (hrs)' },
    screenTime: { value: 3.2, goal: 4, label: 'Screen Time (hrs)' },
  };

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

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="mx-auto max-w-2xl p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-foreground">{t('profile.title')}</h1>
          <Button variant="ghost" size="icon" onClick={() => setSettingsOpen(true)}>
            <Settings className="h-5 w-5" />
          </Button>
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
                    className="hover:underline min-h-[44px] flex items-center"
                  >
                    <strong>{stats?.followersCount || 0}</strong>&nbsp;{t('profile.followers')}
                  </button>
                  <button 
                    onClick={() => setFollowListType("following")}
                    className="hover:underline min-h-[44px] flex items-center"
                  >
                    <strong>{stats?.followingCount || 0}</strong>&nbsp;{t('profile.following')}
                  </button>
                </div>
              </div>
            </div>
            <Button className="w-full" variant="outline" onClick={() => setEditProfileOpen(true)}>
              {t('profile.editProfile')}
            </Button>
          </CardContent>
        </Card>

        {/* Today's Stats */}
        <div className="space-y-3">
          <h2 className="font-semibold">{t('profile.todayStats')}</h2>
          
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

        {/* Latest Posts - Show real entries */}
        <div className="space-y-3">
          <h2 className="font-semibold">{t('profile.myCaptures')}</h2>
          
          <div className="grid grid-cols-3 gap-2">
            {entries.length > 0 ? (
              entries.slice(0, 9).map((entry) => (
                <div
                  key={entry.id}
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

      <BottomNav />
    </div>
  );
};

export default Profile;