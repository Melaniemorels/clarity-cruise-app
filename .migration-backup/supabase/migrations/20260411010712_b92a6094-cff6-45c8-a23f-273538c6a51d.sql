DROP POLICY IF EXISTS "Users can view their own quick captures" ON storage.objects;

CREATE POLICY "Quick captures are publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'quick-captures');