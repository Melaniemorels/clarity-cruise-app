-- Spotlight tour completion (separate from device/security onboarding_completed)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS app_tour_completed boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.app_tour_completed IS 'User finished the in-app tab tour (VYVOnboardingTour); independent of onboarding_completed.';
