import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Settings, Sun, Moon, LogOut, FileText, Scale, ChevronRight, Activity, Lock, Globe } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/components/ThemeProvider";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useNavigate } from "react-router-dom";
import { Separator } from "@/components/ui/separator";
import { DailyActivityModal } from "@/components/DailyActivityModal";
import { EditProfileDialog } from "@/components/EditProfileDialog";
import { subDays, format, isSameDay, parseISO } from "date-fns";
import { useProfile, useUpdateProfile, useProfileStats } from "@/hooks/use-profile";
import { useUserEntries } from "@/hooks/use-entries";

const Profile = () => {
  const { signOut, user } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [activityModalOpen, setActivityModalOpen] = useState(false);

  // Use centralized hooks
  const { data: entries = [] } = useUserEntries();
  const { data: profile } = useProfile();
  const { data: stats } = useProfileStats();
  const updateProfileMutation = useUpdateProfile();

  const healthData = {
    steps: { value: 8432, goal: 10000, label: 'Steps' },
    workout: { value: 45, goal: 60, label: 'Workout (min)' },
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

  const handlePrivacyChange = (isPrivate: boolean) => {
    updateProfileMutation.mutate({ is_private: isPrivate });
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="mx-auto max-w-2xl p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-foreground">Profile</h1>
          <Button variant="ghost" size="icon" onClick={() => setSettingsOpen(true)}>
            <Settings className="h-5 w-5" />
          </Button>
        </div>

        {/* Profile Card */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-3xl overflow-hidden">
                {profile?.photo_url ? (
                  <img src={profile.photo_url} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  "🌿"
                )}
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold">@{profile?.handle || 'user'}</h2>
                <p className="text-sm text-muted-foreground">{profile?.bio || 'Finding balance through movement'}</p>
                <div className="flex gap-4 mt-2 text-sm">
                  <span><strong>{stats?.postsCount || 0}</strong> posts</span>
                  <span><strong>{stats?.followersCount || 0}</strong> seguidores</span>
                  <span><strong>{stats?.followingCount || 0}</strong> siguiendo</span>
                </div>
              </div>
            </div>
            <Button className="w-full" variant="outline" onClick={() => setEditProfileOpen(true)}>
              Editar Perfil
            </Button>
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
              <span>Menos</span>
              <div className="flex gap-1">
                <div className="w-3 h-3 rounded-sm intensity-none" />
                <div className="w-3 h-3 rounded-sm intensity-low" />
                <div className="w-3 h-3 rounded-sm intensity-medium" />
                <div className="w-3 h-3 rounded-sm intensity-high" />
              </div>
              <span>Más</span>
            </div>
          </CardContent>
        </Card>

        {/* Latest Posts - Show real entries */}
        <div className="space-y-3">
          <h2 className="font-semibold">Mis Capturas</h2>
          
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
                <p>No hay capturas aún</p>
                <p className="text-sm">Usa la cámara rápida para empezar</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Settings Dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Settings</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Theme Toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {theme === "dark" ? (
                  <Moon className="h-5 w-5 text-primary" />
                ) : (
                  <Sun className="h-5 w-5 text-primary" />
                )}
                <div>
                  <Label className="text-base">Modo Oscuro</Label>
                  <p className="text-sm text-muted-foreground">
                    {theme === "dark" ? "Modo noche activo" : "Modo día activo"}
                  </p>
                </div>
              </div>
              <Switch
                checked={theme === "dark"}
                onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
              />
            </div>

            <Separator />

            {/* Privacy Toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {profile?.is_private ? (
                  <Lock className="h-5 w-5 text-primary" />
                ) : (
                  <Globe className="h-5 w-5 text-primary" />
                )}
                <div>
                  <Label className="text-base">Perfil Privado</Label>
                  <p className="text-sm text-muted-foreground">
                    {profile?.is_private 
                      ? "Solo tus seguidores pueden ver tu contenido" 
                      : "Cualquiera puede ver tu perfil"}
                  </p>
                </div>
              </div>
              <Switch
                checked={profile?.is_private ?? false}
                onCheckedChange={handlePrivacyChange}
                disabled={updateProfileMutation.isPending}
              />
            </div>

            <Separator />

            {/* Health Devices */}
            <Button
              variant="ghost"
              className="w-full justify-between h-auto py-3"
              onClick={() => {
                setSettingsOpen(false);
                navigate("/device-settings");
              }}
            >
              <div className="flex items-center gap-3">
                <Activity className="h-5 w-5 text-primary" />
                <div className="text-left">
                  <div className="text-base">Dispositivos de Salud</div>
                  <div className="text-sm text-muted-foreground">Conecta relojes, anillos y apps</div>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </Button>

            <Separator />

            {/* Legal Section */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground">Legal</h3>
              <div className="space-y-1">
                <Button
                  variant="ghost"
                  className="w-full justify-between h-auto py-3"
                  onClick={() => {
                    setSettingsOpen(false);
                    navigate("/privacy-policy");
                  }}
                >
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-primary" />
                    <div className="text-left">
                      <div className="text-base">Privacy Policy</div>
                      <div className="text-sm text-muted-foreground">Política de Privacidad</div>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </Button>

                <Button
                  variant="ghost"
                  className="w-full justify-between h-auto py-3"
                  onClick={() => {
                    setSettingsOpen(false);
                    navigate("/terms-of-use");
                  }}
                >
                  <div className="flex items-center gap-3">
                    <Scale className="h-5 w-5 text-primary" />
                    <div className="text-left">
                      <div className="text-base">Terms of Use</div>
                      <div className="text-sm text-muted-foreground">Términos de Uso</div>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </Button>
              </div>
            </div>

            <Separator />

            {/* Sign Out */}
            <Button 
              variant="destructive" 
              className="w-full"
              onClick={signOut}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Cerrar Sesión
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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

      <BottomNav />
    </div>
  );
};

export default Profile;
