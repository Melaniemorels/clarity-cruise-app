-- Fix: Make quick-captures storage bucket public
-- This resolves the mismatch between private bucket and getPublicUrl() usage
-- RLS policies still protect upload/delete operations to owner only
UPDATE storage.buckets 
SET public = true 
WHERE id = 'quick-captures';