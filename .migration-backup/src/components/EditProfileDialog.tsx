import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, AlertTriangle, Trash2, ImagePlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTranslation } from "react-i18next";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { moderateContent } from "@/lib/moderation";
import { 
  useUpdateCurrentUserProfile, 
  useUpdateAvatar, 
  useRemoveAvatar,
  validateHandle,
  normalizeHandle 
} from "@/hooks/use-profile-update";

interface EditProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: {
    handle: string;
    bio: string | null;
    photo_url: string | null;
    name: string | null;
  } | null;
}

export const EditProfileDialog = ({ open, onOpenChange, profile }: EditProfileDialogProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [handle, setHandle] = useState(profile?.handle || "");
  const [bio, setBio] = useState(profile?.bio || "");
  const [name, setName] = useState(profile?.name || "");
  const [photoUrl, setPhotoUrl] = useState(profile?.photo_url || "");
  const [handleError, setHandleError] = useState<string | null>(null);

  // Mutations
  const updateProfile = useUpdateCurrentUserProfile();
  const updateAvatar = useUpdateAvatar();
  const removeAvatar = useRemoveAvatar();

  const isUploading = updateAvatar.isPending;
  const isSaving = updateProfile.isPending;

  // Query to get handle changes in the last year
  const { data: handleChangesThisYear = [] } = useQuery({
    queryKey: ['handle-changes', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      
      const { data, error } = await supabase
        .from('handle_changes' as any)
        .select('*')
        .eq('user_id', user.id)
        .gte('changed_at', oneYearAgo.toISOString())
        .order('changed_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user && open,
  });

  const remainingHandleChanges = 2 - handleChangesThisYear.length;
  const canChangeHandle = remainingHandleChanges > 0;
  const handleChanged = handle !== profile?.handle;

  // Reset form when dialog opens
  useEffect(() => {
    if (open && profile) {
      setHandle(profile.handle);
      setBio(profile.bio || "");
      setName(profile.name || "");
      setPhotoUrl(profile.photo_url || "");
      setHandleError(null);
    }
  }, [open, profile]);

  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen);
  };

  // Real-time handle validation
  const handleHandleChange = (value: string) => {
    const normalized = normalizeHandle(value);
    setHandle(normalized);
    
    if (normalized && normalized !== profile?.handle) {
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

  const handleRemovePhoto = async () => {
    try {
      await removeAvatar.mutateAsync();
      setPhotoUrl("");
    } catch {
      // Error is handled by the mutation
    }
  };

  const handleSave = async () => {
    if (!user) return;

    // Validate handle if changed
    if (handleChanged) {
      if (!canChangeHandle) {
        return;
      }
      
      const validation = validateHandle(handle, t);
      if (!validation.isValid) {
        setHandleError(validation.error || null);
        return;
      }

      // Record the handle change
      const { error: changeError } = await supabase
        .from('handle_changes' as any)
        .insert({
          user_id: user.id,
          old_handle: profile?.handle || '',
          new_handle: handle,
        });

      if (changeError) {
        console.error("Error recording handle change:", changeError);
      }
    }

    try {
      // Moderate bio text if changed
      if (bio.trim() && bio.trim() !== (profile?.bio || "")) {
        const modResult = await moderateContent({
          text: bio.trim(),
          userId: user.id,
          contentType: "bio",
        });
        if (!modResult.approved) {
          toast.error(modResult.message || t('moderation.contentRejected'));
          return;
        }
      }

      await updateProfile.mutateAsync({
        handle: handleChanged ? handle : undefined,
        bio: bio.trim() || undefined,
        name: name.trim() || undefined,
        photo_url: photoUrl || undefined,
      });
      
      // Invalidate handle changes query
      queryClient.invalidateQueries({ queryKey: ['handle-changes', user.id] });
      
      onOpenChange(false);
    } catch {
      // Error is handled by the mutation
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('editProfile.title')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Profile Photo */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <ProfileAvatar
                photoUrl={photoUrl}
                handle={handle}
                name={name}
                size="xl"
                className="ring-2 ring-border"
              />
              
              {/* Upload indicator overlay when uploading */}
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
            
            {/* Photo options */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="text-primary font-semibold hover:text-primary/80 hover:bg-transparent"
                  disabled={isUploading}
                >
                  {isUploading ? t('editProfile.uploading') : t('editProfile.editPhoto')}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                align="center" 
                className="w-56 rounded-xl border-border/50 shadow-xl"
              >
                <DropdownMenuItem 
                  onClick={() => fileInputRef.current?.click()}
                  className="py-3 cursor-pointer focus:bg-muted"
                >
                  <ImagePlus className="mr-3 h-4 w-4 text-primary" />
                  <span className="font-medium">{t('editProfile.uploadNewPhoto')}</span>
                </DropdownMenuItem>
                
                {photoUrl && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={handleRemovePhoto}
                      disabled={removeAvatar.isPending}
                      className="py-3 cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
                    >
                      <Trash2 className="mr-3 h-4 w-4" />
                      <span className="font-medium">{t('editProfile.removePhoto')}</span>
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">{t('editProfile.name')}</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('editProfile.namePlaceholder')}
              maxLength={50}
            />
          </div>

          {/* Handle/Username */}
          <div className="space-y-2">
            <Label htmlFor="handle">{t('editProfile.username')}</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
              <Input
                id="handle"
                value={handle}
                onChange={(e) => handleHandleChange(e.target.value)}
                placeholder="username"
                className="pl-8"
                maxLength={20}
                disabled={!canChangeHandle && handleChanged}
              />
            </div>
            
            {/* Handle validation error */}
            {handleError && (
              <p className="text-sm text-destructive">{handleError}</p>
            )}
            
            {handleChanged && !handleError && (
              <Alert variant={canChangeHandle ? "default" : "destructive"} className="mt-2">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {canChangeHandle 
                    ? t('editProfile.usernameChangesRemaining', { count: remainingHandleChanges })
                    : t('editProfile.usernameChangesLimit')
                  }
                </AlertDescription>
              </Alert>
            )}
            <p className="text-xs text-muted-foreground">
              {t('editProfile.usernameChanges')}
            </p>
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <Label htmlFor="bio">{t('editProfile.bio')}</Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder={t('editProfile.bioPlaceholder')}
              maxLength={150}
              rows={3}
            />
            <p className="text-xs text-muted-foreground text-right">
              {bio.length}/150
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              {t('common.cancel')}
            </Button>
            <Button 
              className="flex-1"
              onClick={handleSave}
              disabled={isSaving || isUploading || !!handleError || (handleChanged && !canChangeHandle)}
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('common.save')}...
                </>
              ) : (
                t('common.save')
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
