import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Camera, Loader2, AlertTriangle, Trash2, ImagePlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTranslation } from "react-i18next";

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
  const [uploading, setUploading] = useState(false);

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
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen && profile) {
      setHandle(profile.handle);
      setBio(profile.bio || "");
      setName(profile.name || "");
      setPhotoUrl(profile.photo_url || "");
    }
    onOpenChange(newOpen);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error(t('editProfile.errors.selectImage'));
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t('editProfile.errors.imageTooLarge'));
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/avatar-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('images')
        .getPublicUrl(fileName);

      setPhotoUrl(publicUrl);
      toast.success(t('editProfile.photoUploaded'));
    } catch (error) {
      console.error("Error uploading photo:", error);
      toast.error(t('editProfile.errors.uploadError'));
    } finally {
      setUploading(false);
    }
  };

  const handleRemovePhoto = () => {
    setPhotoUrl("");
    toast.success(t('editProfile.photoRemoved'));
  };

  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("No user");

      // Check if handle is being changed
      if (handleChanged) {
        if (!canChangeHandle) {
          throw new Error(t('editProfile.usernameChangesLimit'));
        }

        // Check if handle is already taken
        const { data: existingHandle } = await supabase
          .from('profiles')
          .select('id')
          .eq('handle', handle)
          .neq('user_id', user.id)
          .single();

        if (existingHandle) {
          throw new Error(t('editProfile.usernameTaken'));
        }

        // Record the handle change
        const { error: changeError } = await supabase
          .from('handle_changes' as any)
          .insert({
            user_id: user.id,
            old_handle: profile?.handle || '',
            new_handle: handle,
          });

        if (changeError) throw changeError;
      }

      // Update profile
      const { error } = await supabase
        .from('profiles')
        .update({
          handle,
          bio,
          name,
          photo_url: photoUrl,
        })
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profile', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['handle-changes', user?.id] });
      toast.success(t('editProfile.profileUpdated'));
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || t('errors.generic'));
    },
  });

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
              <div 
                className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center overflow-hidden ring-2 ring-border"
              >
                {photoUrl ? (
                  <img src={photoUrl} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-4xl">🌿</span>
                )}
              </div>
              
              {/* Upload indicator overlay when uploading */}
              {uploading && (
                <div className="absolute inset-0 rounded-full bg-foreground/50 flex items-center justify-center">
                  <Loader2 className="h-6 w-6 text-background animate-spin" />
                </div>
              )}
            </div>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoUpload}
              disabled={uploading}
            />
            
            {/* Instagram-style photo options */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="text-primary font-semibold hover:text-primary/80 hover:bg-transparent"
                  disabled={uploading}
                >
                  {uploading ? t('editProfile.uploading') : t('editProfile.editPhoto')}
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
                onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                placeholder="username"
                className="pl-8"
                maxLength={30}
                disabled={!canChangeHandle && handleChanged}
              />
            </div>
            {handleChanged && (
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
            >
              {t('common.cancel')}
            </Button>
            <Button 
              className="flex-1"
              onClick={() => updateProfileMutation.mutate()}
              disabled={updateProfileMutation.isPending || uploading || (handleChanged && !canChangeHandle)}
            >
              {updateProfileMutation.isPending ? (
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
