-- Create storage bucket for quick captures
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'quick-captures',
  'quick-captures',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
);

-- RLS policies for quick-captures bucket
CREATE POLICY "Users can upload their own quick captures"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'quick-captures' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own quick captures"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'quick-captures' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own quick captures"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'quick-captures' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own quick captures"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'quick-captures' AND
  auth.uid()::text = (storage.foldername(name))[1]
);