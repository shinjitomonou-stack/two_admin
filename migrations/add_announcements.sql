-- Migration: Add announcements and worker announcement reads tables
-- Created: 2025-12-04

-- Announcements table
CREATE TABLE IF NOT EXISTS public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT CHECK (type IN ('INFO', 'WARNING', 'IMPORTANT')) DEFAULT 'INFO',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Worker announcement reads tracking
CREATE TABLE IF NOT EXISTS public.worker_announcement_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID REFERENCES public.workers(id) ON DELETE CASCADE NOT NULL,
  announcement_id UUID REFERENCES public.announcements(id) ON DELETE CASCADE NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(worker_id, announcement_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_announcements_active ON public.announcements(is_active, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_announcements_expires ON public.announcements(expires_at);
CREATE INDEX IF NOT EXISTS idx_worker_announcement_reads_worker ON public.worker_announcement_reads(worker_id);
CREATE INDEX IF NOT EXISTS idx_worker_announcement_reads_announcement ON public.worker_announcement_reads(announcement_id);

-- Add comments
COMMENT ON TABLE public.announcements IS 'System announcements and notifications for workers';
COMMENT ON TABLE public.worker_announcement_reads IS 'Tracks which announcements have been read by which workers';
COMMENT ON COLUMN public.announcements.type IS 'Announcement type: INFO, WARNING, or IMPORTANT';
COMMENT ON COLUMN public.announcements.is_active IS 'Whether the announcement is currently active';
COMMENT ON COLUMN public.announcements.expires_at IS 'Optional expiration date for the announcement';

-- Insert sample announcements
INSERT INTO public.announcements (title, content, type, is_active) VALUES
('Teo Workへようこそ！', 'Teo Workをご利用いただきありがとうございます。プロフィールを充実させて、より多くの案件に応募しましょう！', 'INFO', true),
('年末年始の営業について', '12月29日から1月3日まで休業とさせていただきます。緊急のお問い合わせは support@teo-work.com までご連絡ください。', 'IMPORTANT', true);
