-- ================================================
-- CodeIR: Testimonials Table Migration
-- Run this SQL in the Supabase SQL Editor
-- ================================================

CREATE TABLE IF NOT EXISTS public.testimonials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'student',
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    text TEXT NOT NULL CHECK (char_length(text) <= 280),
    approved BOOLEAN NOT NULL DEFAULT true,  -- Auto-approve for MVP
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for public query (approved testimonials, newest first)
CREATE INDEX IF NOT EXISTS idx_testimonials_approved
    ON public.testimonials (approved, created_at DESC);

-- Index for user lookup (check if user already submitted)
CREATE UNIQUE INDEX IF NOT EXISTS idx_testimonials_user
    ON public.testimonials (user_id);

-- Enable RLS
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;

-- Policy: anyone can read approved testimonials (for landing page)
CREATE POLICY "Public can read approved testimonials"
    ON public.testimonials FOR SELECT
    USING (approved = true);

-- Policy: authenticated users can insert their own testimonial
CREATE POLICY "Users can insert own testimonial"
    ON public.testimonials FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy: users can read their own testimonial
CREATE POLICY "Users can read own testimonial"
    ON public.testimonials FOR SELECT
    USING (auth.uid() = user_id);
