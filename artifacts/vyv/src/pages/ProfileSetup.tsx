import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { useUser } from "@clerk/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, UserRound, ImagePlus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useOnboardingStep } from "@/hooks/use-onboarding-step";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import {
  useUpdateCurrentUserProfile,
  useUpdateAvatar,
  validateHandle,
  normalizeHandle,
} from "@/hooks/use-profile-update";
import VyvLogo from "@/components/VyvLogo";

interface ProfileRow {
  handle: string;
  name: string | null;
  photo_url: string | null;
}

const ProfileSetup = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { user: clerkUser } = useUser();
  const { completeProfileStep } = useOnboardingStep();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateProfile = useUpdateCurrentUserProfile();
  const updateAvatar = useUpdateAvatar();

  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [handleError, setHandleError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile-setup", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("handle, name, photo_url")
        .eq("user_id", user.id)
        .single();
      if (error) throw error;
      return data as unknown as ProfileRow;
    },
    enabled: !!user,
  });

  // Prefill from the existing profile row and from the Google/Apple account
  useEffect(() => {
    if (initialized || isLoading || !profile) return;
    setHandle(profile.handle || "");
    setName(profile.name || clerkUser?.fullName || "");
    if (profile.photo_url) {
      setPhotoUrl(profile.photo_url);
    } else if (clerkUser?.hasImage && clerkUser.imageUrl) {
      setPhotoUrl(clerkUser.imageUrl);
    }
    setInitialized(true);
  }, [initialized, isLoading, profile, clerkUser]);

  const handleHandleChange = (value: string) => {
    const normalized = normalizeHandle(value);
    setHandle(normalized);
    if (normalized) {
      const validation = validateHandle(normalized, t);
      setHandleError(validation.isValid ? null : validation.error || null);
    } else {
      setHandleError(null);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const newUrl = await updateAvatar.mutateAsync(file);
      setPhotoUrl(newUrl);
    } catch {
      // Error is handled by the mutation
    }
  };

  const submit = async () => {
    if (!user) return;

    const validation = validateHandle(handle, t);
    if (!validation.isValid) {
      setHandleError(validation.error || null);
      return;
    }

    setIsSubmitting(true);
    try {
      await updateProfile.mutateAsync({
        handle: handle !== profile?.handle ? handle : undefined,
        name: name.trim() || undefined,
        photo_url: photoUrl || undefined,
      });

      const success = await completeProfileStep();
      if (success) {
        window.location.href = "/personalization";
      } else {
        toast.error(t("onboarding.profile.saveError"));
        setIsSubmitting(false);
      }
    } catch {
      // Error toast is handled by the mutation (e.g. username taken)
      setIsSubmitting(false);
    }
  };

  const skip = async () => {
    setIsSubmitting(true);
    const success = await completeProfileStep();
    if (success) {
      window.location.href = "/personalization";
    } else {
      toast.error(t("onboarding.profile.saveError"));
      setIsSubmitting(false);
    }
  };

  const isUploading = updateAvatar.isPending;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Brand header */}
        <div className="flex items-center gap-3 px-1">
          <VyvLogo className="h-9 w-9" withShadow />
          <div>
            <div className="text-sm font-bold tracking-wide text-foreground">VYV</div>
            <div className="text-xs text-muted-foreground">{t("brand.tagline")}</div>
          </div>
        </div>

        {/* Glass card */}
        <div className="rounded-[20px] border border-border/40 bg-card/80 backdrop-blur-[18px] shadow-[0_18px_40px_rgba(0,0,0,0.08)] dark:shadow-[0_18px_40px_rgba(0,0,0,0.45)] p-5 space-y-5">
          <div className="text-center space-y-3">
            <div className="mx-auto w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center">
              <UserRound className="w-7 h-7 text-primary" />
            </div>
            <h1 className="text-lg font-semibold tracking-tight text-foreground">
              {t("onboarding.profile.title")}
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t("onboarding.profile.description")}
            </p>
          </div>

          {isLoading || !initialized ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* Photo */}
              <div className="flex flex-col items-center gap-3">
                <div className="relative">
                  <ProfileAvatar
                    photoUrl={photoUrl}
                    handle={handle}
                    name={name}
                    size="xl"
                    className="ring-2 ring-border"
                  />
                  {isUploading && (
                    <div className="absolute inset-0 rounded-full bg-foreground/50 flex items-center justify-center">
                      <Loader2 className="h-6 w-6 text-background animate-spin" />
                    </div>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handlePhotoUpload}
                  disabled={isUploading}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-primary font-semibold hover:text-primary/80 hover:bg-transparent"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  <ImagePlus className="mr-2 h-4 w-4" />
                  {isUploading
                    ? t("editProfile.uploading")
                    : photoUrl
                      ? t("onboarding.profile.changePhoto")
                      : t("onboarding.profile.addPhoto")}
                </Button>
              </div>

              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="profile-name">{t("editProfile.name")}</Label>
                <Input
                  id="profile-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t("editProfile.namePlaceholder")}
                  maxLength={50}
                />
              </div>

              {/* Handle */}
              <div className="space-y-2">
                <Label htmlFor="profile-handle">{t("editProfile.username")}</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
                  <Input
                    id="profile-handle"
                    value={handle}
                    onChange={(e) => handleHandleChange(e.target.value)}
                    placeholder="username"
                    className="pl-8"
                    maxLength={20}
                  />
                </div>
                {handleError ? (
                  <p className="text-sm text-destructive">{handleError}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {t("onboarding.profile.usernameHint")}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="space-y-2 pt-1">
                <Button
                  className="w-full"
                  onClick={submit}
                  disabled={isSubmitting || isUploading || !!handleError || !handle}
                >
                  {isSubmitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  {t("onboarding.profile.continue")}
                </Button>
                <Button
                  variant="ghost"
                  className="w-full text-muted-foreground"
                  onClick={skip}
                  disabled={isSubmitting || isUploading}
                >
                  {t("onboarding.profile.skip")}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileSetup;
