import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

interface ProfileUpdateData {
  handle?: string;
  name?: string;
  bio?: string;
  photo_url?: string;
  is_private?: boolean;
}

interface HandleValidation {
  isValid: boolean;
  error?: string;
}

/**
 * Validate handle/username format
 * Rules: 3-20 chars, lowercase letters, numbers, underscore only
 */
export function validateHandle(handle: string, t: (key: string) => string): HandleValidation {
  const trimmed = handle.trim().toLowerCase();
  
  if (trimmed.length < 3) {
    return { isValid: false, error: t('editProfile.errors.handleTooShort') };
  }
  
  if (trimmed.length > 20) {
    return { isValid: false, error: t('editProfile.errors.handleTooLong') };
  }
  
  // Only allow lowercase letters, numbers, and underscores
  const validPattern = /^[a-z0-9_]+$/;
  if (!validPattern.test(trimmed)) {
    return { isValid: false, error: t('editProfile.errors.handleInvalidChars') };
  }
  
  // No consecutive underscores
  if (trimmed.includes('__')) {
    return { isValid: false, error: t('editProfile.errors.handleInvalidChars') };
  }
  
  // Cannot start or end with underscore
  if (trimmed.startsWith('_') || trimmed.endsWith('_')) {
    return { isValid: false, error: t('editProfile.errors.handleInvalidChars') };
  }
  
  return { isValid: true };
}

/**
 * Normalize handle to lowercase, trimmed
 */
export function normalizeHandle(handle: string): string {
  return handle.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
}

/**
 * All query keys that should be invalidated when profile updates
 */
const PROFILE_RELATED_QUERY_KEYS = [
  ["profile"],
  ["user-profile"],
  ["posts"],
  ["notifications"],
  ["followers"],
  ["following"],
  ["follow-requests"],
  ["search-profiles"],
  ["is-following"],
  ["profile-stats"],
];

/**
 * Hook to update current user's profile with coordinated cache invalidation
 */
export function useUpdateCurrentUserProfile() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: ProfileUpdateData) => {
      if (!user) throw new Error(t('errors.unauthorized'));

      // Validate handle if being updated
      if (updates.handle !== undefined) {
        const validation = validateHandle(updates.handle, t);
        if (!validation.isValid) {
          throw new Error(validation.error);
        }
        
        // Normalize handle
        updates.handle = normalizeHandle(updates.handle);
        
        // Check if handle is available
        const { data: existingHandle } = await supabase
          .from('profiles')
          .select('id')
          .eq('handle', updates.handle)
          .neq('user_id', user.id)
          .single();

        if (existingHandle) {
          throw new Error(t('editProfile.usernameTaken'));
        }
      }

      // Perform the update
      const { data, error } = await supabase
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      // Invalidate ALL profile-related queries to ensure consistency
      PROFILE_RELATED_QUERY_KEYS.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: key });
      });
      
      // Also specifically invalidate for the current user
      queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["user-profile", user?.id] });
      
      toast.success(t('editProfile.profileUpdated'));
      return data;
    },
    onError: (error: Error) => {
      toast.error(error.message || t('errors.generic'));
    },
  });
}

/**
 * Hook to upload and update avatar with cache busting
 */
export function useUpdateAvatar() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      if (!user) throw new Error(t('errors.unauthorized'));

      // Validate file type
      if (!file.type.startsWith('image/')) {
        throw new Error(t('editProfile.errors.selectImage'));
      }

      // Validate file size (max 5MB)
      const MAX_SIZE = 5 * 1024 * 1024;
      if (file.size > MAX_SIZE) {
        throw new Error(t('editProfile.errors.imageTooLarge'));
      }

      // Upload with timestamp for uniqueness
      const fileExt = file.name.split('.').pop() || 'jpg';
      const timestamp = Date.now();
      const fileName = `${user.id}/avatar-${timestamp}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(fileName, file, {
          cacheControl: '0', // No cache for avatars
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Get public URL with cache buster
      const { data: { publicUrl } } = supabase.storage
        .from('images')
        .getPublicUrl(fileName);

      // Add cache buster to URL
      const urlWithCacheBuster = `${publicUrl}?v=${timestamp}`;

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          photo_url: urlWithCacheBuster,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      return urlWithCacheBuster;
    },
    onSuccess: () => {
      // Invalidate all profile-related queries
      PROFILE_RELATED_QUERY_KEYS.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: key });
      });
      
      queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["user-profile", user?.id] });
      
      toast.success(t('editProfile.photoUploaded'));
    },
    onError: (error: Error) => {
      toast.error(error.message || t('editProfile.errors.uploadError'));
    },
  });
}

/**
 * Hook to remove avatar
 */
export function useRemoveAvatar() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!user) throw new Error(t('errors.unauthorized'));

      const { error } = await supabase
        .from('profiles')
        .update({
          photo_url: null,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      // Invalidate all profile-related queries
      PROFILE_RELATED_QUERY_KEYS.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: key });
      });
      
      toast.success(t('editProfile.photoRemoved'));
    },
    onError: () => {
      toast.error(t('errors.generic'));
    },
  });
}
