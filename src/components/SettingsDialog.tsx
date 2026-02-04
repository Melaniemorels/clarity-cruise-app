import { useState } from "react";
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
  Users,
  Trash2,
  Sparkles,
  Lightbulb,
  SlidersHorizontal,
  HelpCircle,
  MessageCircle,
  AlertTriangle,
  Send,
} from "lucide-react";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEditProfile: () => void;
}

export function SettingsDialog({ open, onOpenChange, onEditProfile }: SettingsDialogProps) {
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();
  const { signOut } = useAuth();
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
        <DialogContent className="max-w-md max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{t("settings.title")}</DialogTitle>
          </DialogHeader>

          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-6 py-4">
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

              {/* Devices */}
              <LinkButton
                icon={Activity}
                label={t("settings.healthDevices")}
                description={t("settings.healthDevicesDesc")}
                onClick={() => handleNavigate("/device-settings")}
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
          </ScrollArea>
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