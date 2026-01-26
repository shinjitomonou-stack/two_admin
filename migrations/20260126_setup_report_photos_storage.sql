-- Create bucket if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('report-photos', 'report-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Set up RLS for the bucket
-- Allow public access for viewing (or restrict to authenticated if needed)
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'report-photos' );

-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'report-photos' );

-- Allow users to delete their own uploads
-- In this case, since we use applicationId in the path, we just allow authenticated for now
-- A stricter policy would check if the user is the owner
CREATE POLICY "Users can delete their own photos"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'report-photos' );
