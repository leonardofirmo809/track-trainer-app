ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS brand_logo_url text,
  ADD COLUMN IF NOT EXISTS brand_primary_color text,
  ADD COLUMN IF NOT EXISTS brand_secondary_color text;

INSERT INTO storage.buckets (id, name, public)
VALUES ('coach-branding', 'coach-branding', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "coach-branding public read" ON storage.objects;
CREATE POLICY "coach-branding public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'coach-branding');

DROP POLICY IF EXISTS "coach-branding owner insert" ON storage.objects;
CREATE POLICY "coach-branding owner insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'coach-branding'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "coach-branding owner update" ON storage.objects;
CREATE POLICY "coach-branding owner update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'coach-branding'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "coach-branding owner delete" ON storage.objects;
CREATE POLICY "coach-branding owner delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'coach-branding'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );