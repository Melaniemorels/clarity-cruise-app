import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/components/ThemeProvider";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage, SUPPORTED_LANGUAGES } from "@/hooks/use-language";
import { useProfile, useUpdateProfile } from "@/hooks/use-profile";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { SectionVisibilitySettings } from "@/components/SectionVisibilitySettings";
import { SocialBudgetSettings } from "@/components/SocialBudgetSettings";
import { toast } from "sonner";
import {
  Sun,
  Moon,
  Languages,
  Lock,
  Globe,
  Activity,
  ChevronRight,
  FileText,
  Scale,
  LogOut,
  Bell,
  BellOff,
  User,
  Mail,
  KeyRound,
  Shield,
  Smartphone,
  Users,
  Trash2,
  Sparkles,
  Lightbulb,
  SlidersHorizontal,
  HelpCircle,
  MessageCircle,
  AlertTriangle,
  Send,
  Music,
  Download,
  Plane,
} from "lucide-react";
import { getAutoSavePreference, setAutoSavePreference } from "@/components/QuickCamera";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEditProfile: () => void;
}

export function SettingsDialog({ open, onOpenChange, onEditProfile }: SettingsDialogProps) {
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();
  const { signOut, signOutAll } = useAuth();
  const { currentLanguage, changeLanguage } = useLanguage();
  const { data: profile } = useProfile();
  const updateProfileMutation = useUpdateProfile();
  const navigate = useNavigate();

  // Local state for toggles (these would connect to real settings in production)
  const [pushNotifications, setPushNotifications] = useState(true);
  const [activityNotifications, setActivityNotifications] = useState(true);
  const [requestsNotifications, setRequestsNotifications] = useState(true);
  const [aiSuggestions, setAiSuggestions] = useState(true);
  const [quietMode, setQuietMode] = useState(false);
  const [enableAI, setEnableAI] = useState(true);
  const [routineRecommendations, setRoutineRecommendations] = useState(true);
  const [reflectionPrompts, setReflectionPrompts] = useState(true);
  const [personalizationLevel, setPersonalizationLevel] = useState<"minimal" | "balanced" | "guided">("balanced");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [autoSaveCaptures, setAutoSaveCaptures] = useState(() => getAutoSavePreference());

  const currentTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const handleTravelToggle = (isTraveling: boolean) => {
    const updates: Record<string, any> = { is_traveling: isTraveling };
    if (isTraveling) {
      updates.current_timezone = currentTimezone;
      updates.travel_detected_reason = "manual";
      updates.travel_mode_status = "on";
      if (!profile?.home_timezone) {
        updates.home_timezone = currentTimezone;
      }
    } else {
      updates.current_timezone = null;
      updates.travel_detected_reason = null;
      updates.travel_mode_status = profile?.travel_mode_status === "on" ? "auto" : profile?.travel_mode_status;
    }
    updateProfileMutation.mutate(updates);
    toast.success(isTraveling ? t("travelMode.activated") : t("travelMode.deactivated"));
  };

  // Auto-detect timezone on mount and save home_timezone if not set
  useEffect(() => {
    if (profile && !profile.home_timezone && open) {
      updateProfileMutation.mutate({ home_timezone: currentTimezone });
    }
  }, [profile?.home_timezone, open]);

  const markAutoSavePrompted = () => {
    try { localStorage.setItem("vyv-auto-save-prompted", "true"); } catch { /* ignore */ }
  };

  const handlePrivacyChange = (isPrivate: boolean) => {
    updateProfileMutation.mutate({ is_private: isPrivate });
  };

  const handleNavigate = (path: string) => {
    onOpenChange(false);
    navigate(path);
  };

  const handleComingSoon = () => {
    toast.info(t("settings.comingSoon"));
  };

  const handleDeleteAccount = () => {
    setDeleteDialogOpen(false);
    toast.info(t("settings.deleteAccountRequested"));
  };

  const SectionHeader = ({ children }: { children: React.ReactNode }) => (
    <h3 className="text-sm font-medium text-muted-foreground mb-3">{children}</h3>
  );

  const SettingRow = ({ 
    icon: Icon, 
    label, 
    description, 
    action 
  }: { 
    icon: React.ElementType;
    label: string; 
    description?: string; 
    action: React.ReactNode;
  }) => (
    <div className="flex items-center justify-between py-1">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <Icon className="h-5 w-5 text-primary flex-shrink-0" />
        <div className="min-w-0">
          <Label className="text-base">{label}</Label>
          {description && (
            <p className="text-sm text-muted-foreground truncate">{description}</p>
          )}
        </div>
      </div>
      <div className="flex-shrink-0 ml-3">{action}</div>
    </div>
  );

  const LinkButton = ({ 
    icon: Icon, 
    label, 
    description, 
    onClick 
  }: { 
    icon: React.ElementType;
    label: string; 
    description?: string; 
    onClick: () => void;
  }) => (
    <Button
      variant="ghost"
      className="w-full justify-between h-auto py-3 px-0"
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        <Icon className="h-5 w-5 text-primary" />
        <div className="text-left">
          <div className="text-base font-normal">{label}</div>
          {description && (
            <div className="text-sm text-muted-foreground font-normal">{description}</div>
          )}
        </div>
      </div>
      <ChevronRight className="h-5 w-5 text-muted-foreground" />
    </Button>
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md max-h-[85vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-2 flex-shrink-0">
            <DialogTitle>{t("settings.title")}</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 pb-6">
            <div className="space-y-6 py-4 pr-4">
              {/* Appearance */}
              <div>
                <SectionHeader>{t("settings.appearance")}</SectionHeader>
                <div className="space-y-4">
                  <SettingRow
                    icon={theme === "dark" ? Moon : Sun}
                    label={t("settings.darkMode")}
                    description={theme === "dark" ? t("settings.nightModeActive") : t("settings.dayModeActive")}
                    action={
                      <Switch
                        checked={theme === "dark"}
                        onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
                      />
                    }
                  />
                  <SettingRow
                    icon={Languages}
                    label={t("settings.language")}
                    action={
                      <Select value={currentLanguage} onValueChange={changeLanguage}>
                        <SelectTrigger className="w-28">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SUPPORTED_LANGUAGES.map((lang) => (
                            <SelectItem key={lang.code} value={lang.code}>
                              {lang.nativeName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    }
                  />
                </div>
              </div>

              <Separator />

              {/* Notifications */}
              <div>
                <SectionHeader>{t("settings.notificationsSection")}</SectionHeader>
                <div className="space-y-4">
                  <SettingRow
                    icon={pushNotifications ? Bell : BellOff}
                    label={t("settings.pushNotifications")}
                    action={
                      <Switch
                        checked={pushNotifications}
                        onCheckedChange={setPushNotifications}
                      />
                    }
                  />
                  <SettingRow
                    icon={Activity}
                    label={t("settings.activityNotifications")}
                    action={
                      <Switch
                        checked={activityNotifications}
                        onCheckedChange={setActivityNotifications}
                      />
                    }
                  />
                  <SettingRow
                    icon={Users}
                    label={t("settings.requestsNotifications")}
                    action={
                      <Switch
                        checked={requestsNotifications}
                        onCheckedChange={setRequestsNotifications}
                      />
                    }
                  />
                  <SettingRow
                    icon={Sparkles}
                    label={t("settings.aiNotifications")}
                    action={
                      <Switch
                        checked={aiSuggestions}
                        onCheckedChange={setAiSuggestions}
                      />
                    }
                  />
                  <SettingRow
                    icon={Moon}
                    label={t("settings.quietMode")}
                    description={t("settings.quietModeDesc")}
                    action={
                      <Switch
                        checked={quietMode}
                        onCheckedChange={setQuietMode}
                      />
                    }
                  />
                </div>
              </div>

              <Separator />

              {/* Account */}
              <div>
                <SectionHeader>{t("settings.account")}</SectionHeader>
                <div className="space-y-1">
                  <LinkButton
                    icon={User}
                    label={t("settings.editProfile")}
                    onClick={() => {
                      onOpenChange(false);
                      onEditProfile();
                    }}
                  />
                  <LinkButton
                    icon={Mail}
                    label={t("settings.changeEmail")}
                    onClick={handleComingSoon}
                  />
                  <LinkButton
                    icon={KeyRound}
                    label={t("settings.changePassword")}
                    onClick={handleComingSoon}
                  />
                </div>
              </div>

              <Separator />

              {/* Privacy */}
              <div>
                <SectionHeader>{t("settings.privacy")}</SectionHeader>
                <div className="space-y-4">
                  <SettingRow
                    icon={profile?.is_private ? Lock : Globe}
                    label={t("settings.privateProfile")}
                    description={
                      profile?.is_private
                        ? t("settings.privateProfileDesc")
                        : t("settings.publicProfileDesc")
                    }
                    action={
                      <Switch
                        checked={profile?.is_private ?? false}
                        onCheckedChange={handlePrivacyChange}
                        disabled={updateProfileMutation.isPending}
                      />
                    }
                  />
                </div>
                <div className="mt-4">
                  <SectionVisibilitySettings />
                </div>
              </div>

              <Separator />

              {/* Social Budget */}
              <SocialBudgetSettings />

              <Separator />

              {/* Travel Mode */}
              <div>
                <SettingRow
                  icon={Plane}
                  label={t("travelMode.title")}
                  description={
                    profile?.is_traveling
                      ? t("travelMode.active")
                      : t("travelMode.description")
                  }
                  action={
                    <Switch
                      checked={profile?.is_traveling ?? false}
                      onCheckedChange={handleTravelToggle}
                      disabled={updateProfileMutation.isPending}
                    />
                  }
                />

                {/* Travel Mode Status Selector */}
                <div className="ml-8 mt-3">
                  <Label className="text-xs text-muted-foreground mb-1.5 block">
                    {t("travelMode.status.label")}
                  </Label>
                  <Select
                    value={profile?.travel_mode_status ?? "auto"}
                    onValueChange={(value: "off" | "auto" | "on") => {
                      const updates: Record<string, any> = { travel_mode_status: value };
                      if (value === "on") {
                        updates.is_traveling = true;
                        updates.travel_detected_reason = "manual";
                        updates.current_timezone = currentTimezone;
                        if (!profile?.home_timezone) updates.home_timezone = currentTimezone;
                      } else if (value === "off") {
                        updates.is_traveling = false;
                        updates.travel_detected_reason = null;
                        updates.current_timezone = null;
                      }
                      updateProfileMutation.mutate(updates);
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="off">{t("travelMode.status.off")}</SelectItem>
                      <SelectItem value="auto">{t("travelMode.status.auto")}</SelectItem>
                      <SelectItem value="on">{t("travelMode.status.on")}</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("travelMode.status.description")}
                  </p>
                </div>

                {/* Auto timezone shift toggle */}
                <div className="ml-8 mt-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground">
                      {t("travelMode.autoTimezone.label")}
                    </Label>
                    <Switch
                      checked={profile?.allow_auto_timezone_shift ?? true}
                      onCheckedChange={(checked) => {
                        updateProfileMutation.mutate({ allow_auto_timezone_shift: checked });
                      }}
                      disabled={updateProfileMutation.isPending}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t("travelMode.autoTimezone.description")}
                  </p>
                </div>

                {profile?.is_traveling && profile?.home_timezone && currentTimezone !== profile.home_timezone && (
                  <p className="text-xs text-muted-foreground ml-8 mt-2">
                    {t("travelMode.differentTimezone", {
                      current: currentTimezone.split("/").pop()?.replace("_", " "),
                      home: profile.home_timezone.split("/").pop()?.replace("_", " "),
                    })}
                  </p>
                )}

                {/* Detection reason badge */}
                {profile?.is_traveling && profile?.travel_detected_reason && (
                  <p className="text-xs text-muted-foreground ml-8 mt-1 italic">
                    {t(`travelMode.detectedBy.${profile.travel_detected_reason}`)}
                  </p>
                )}

                {profile?.is_traveling && (
                  <div className="ml-8 mt-3">
                    <Label className="text-xs text-muted-foreground mb-1.5 block">
                      {t("travelMode.intensity.label")}
                    </Label>
                    <Select
                      value={profile?.travel_intensity ?? "medium"}
                      onValueChange={(value: "low" | "medium" | "high") => {
                        updateProfileMutation.mutate({ travel_intensity: value });
                      }}
                    >
                      <SelectTrigger className="h-8 text-xs w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">{t("travelMode.intensity.low")}</SelectItem>
                        <SelectItem value="medium">{t("travelMode.intensity.medium")}</SelectItem>
                        <SelectItem value="high">{t("travelMode.intensity.high")}</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t("travelMode.intensity.description")}
                    </p>
                  </div>
                )}
              </div>

              <Separator />

              {/* Devices */}
              <LinkButton
                icon={Activity}
                label={t("settings.healthDevices")}
                description={t("settings.healthDevicesDesc")}
                onClick={() => handleNavigate("/device-settings")}
              />

              {/* Media Connections */}
              <LinkButton
                icon={Music}
                label={t("mediaConnections.connectionsSettings")}
                description={t("mediaConnections.connectionsSettingsDesc")}
                onClick={() => handleNavigate("/media-connections")}
              />

              <Separator />

              {/* AI & Experience */}
              <div>
                <SectionHeader>{t("settings.aiExperience")}</SectionHeader>
                <div className="space-y-4">
                  <SettingRow
                    icon={Sparkles}
                    label={t("settings.enableAI")}
                    description={t("settings.enableAIDesc")}
                    action={
                      <Switch
                        checked={enableAI}
                        onCheckedChange={setEnableAI}
                      />
                    }
                  />
                  <SettingRow
                    icon={Lightbulb}
                    label={t("settings.routineRecommendations")}
                    action={
                      <Switch
                        checked={routineRecommendations}
                        onCheckedChange={setRoutineRecommendations}
                        disabled={!enableAI}
                      />
                    }
                  />
                  <SettingRow
                    icon={MessageCircle}
                    label={t("settings.reflectionPrompts")}
                    action={
                      <Switch
                        checked={reflectionPrompts}
                        onCheckedChange={setReflectionPrompts}
                        disabled={!enableAI}
                      />
                    }
                  />
                  <SettingRow
                    icon={SlidersHorizontal}
                    label={t("settings.personalizationLevel")}
                    action={
                      <Select
                        value={personalizationLevel}
                        onValueChange={(v) => setPersonalizationLevel(v as typeof personalizationLevel)}
                        disabled={!enableAI}
                      >
                        <SelectTrigger className="w-28">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="minimal">{t("settings.minimal")}</SelectItem>
                          <SelectItem value="balanced">{t("settings.balanced")}</SelectItem>
                          <SelectItem value="guided">{t("settings.guided")}</SelectItem>
                        </SelectContent>
                      </Select>
                    }
                  />
                </div>
              </div>

              <Separator />

              {/* Privacy & Legal */}
              <div>
                <SectionHeader>{t("settings.legal")}</SectionHeader>
                <div className="space-y-1">
                  <LinkButton
                    icon={FileText}
                    label={t("auth.privacyPolicy")}
                    onClick={() => handleNavigate("/privacy-policy")}
                  />
                  <LinkButton
                    icon={Scale}
                    label={t("auth.termsOfUse")}
                    onClick={() => handleNavigate("/terms-of-use")}
                  />
                  <LinkButton
                    icon={Shield}
                    label={t("settings.communityGuidelines")}
                    onClick={handleComingSoon}
                  />
                </div>
              </div>

              <Separator />

              {/* Data & Permissions */}
              <div>
                <SectionHeader>{t("settings.dataPermissions")}</SectionHeader>
                <div className="space-y-4">
                  <SettingRow
                    icon={Download}
                    label={t("settings.autoSaveCaptures")}
                    description={t("settings.autoSaveCapturesDesc")}
                    action={
                      <Switch
                        checked={autoSaveCaptures}
                        onCheckedChange={(checked) => {
                          setAutoSaveCaptures(checked);
                          setAutoSavePreference(checked);
                          markAutoSavePrompted();
                        }}
                      />
                    }
                  />
                </div>
                <Button
                  variant="ghost"
                  className="w-full justify-start h-auto py-3 px-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  <Trash2 className="h-5 w-5 mr-3" />
                  <span className="text-base font-normal">{t("settings.deleteAccount")}</span>
                </Button>
              </div>

              <Separator />

              {/* Support */}
              <div>
                <SectionHeader>{t("settings.support")}</SectionHeader>
                <div className="space-y-1">
                  <LinkButton
                    icon={HelpCircle}
                    label={t("settings.helpFaq")}
                    onClick={handleComingSoon}
                  />
                  <LinkButton
                    icon={MessageCircle}
                    label={t("settings.contactSupport")}
                    onClick={handleComingSoon}
                  />
                  <LinkButton
                    icon={AlertTriangle}
                    label={t("settings.reportProblem")}
                    onClick={handleComingSoon}
                  />
                  <LinkButton
                    icon={Send}
                    label={t("settings.sendFeedback")}
                    onClick={handleComingSoon}
                  />
                </div>
              </div>

              <Separator />

              {/* Security */}
              <div>
                <SectionHeader>{t("settings.security")}</SectionHeader>
                <div className="space-y-1">
                  <LinkButton
                    icon={Smartphone}
                    label={t("settings.logOutAllDevices")}
                    description={t("settings.logOutAllDevicesDesc")}
                    onClick={async () => {
                      await signOutAll();
                      toast.success(t("settings.loggedOutAllDevices"));
                    }}
                  />
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
                {t("auth.signOut")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Account Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("settings.deleteAccountTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("settings.deleteAccountDesc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("settings.deleteAccount")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}