-- Harden avatar storage bucket against abuse
-- 1. Set 2MB file size limit
-- 2. Restrict to image mime types only
-- 3. Restrict uploads to user's own folder

UPDATE storage.buckets
SET file_size_limit = 2097152,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
WHERE name = 'avatars';

-- Replace the open upload policy with one scoped to user's own folder
DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;
CREATE POLICY "Users can upload own avatar"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );
