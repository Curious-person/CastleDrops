-- Migration: Create login carousel images table to support Cloudinary stored images

-- 1. Create the table
CREATE TABLE IF NOT EXISTS public.login_carousel_images (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    cloudinary_url text NOT NULL,
    cloudinary_public_id text NOT NULL,
    sequence_order integer NOT NULL DEFAULT 0,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 2. Add an index for performance when fetching sorted active images
CREATE INDEX IF NOT EXISTS idx_login_carousel_images_active_sequence
ON public.login_carousel_images(is_active, sequence_order);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.login_carousel_images ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS Policies
-- Allow anyone (public/unauthenticated) to view active carousel images (needed for the Login screen)
DROP POLICY IF EXISTS "Allow public select of active login carousel images" ON public.login_carousel_images;
CREATE POLICY "Allow public select of active login carousel images"
ON public.login_carousel_images
FOR SELECT
USING (is_active = true);

-- Allow authenticated users to manage (INSERT, UPDATE, DELETE) login carousel images
DROP POLICY IF EXISTS "Allow authenticated users full access to login carousel images" ON public.login_carousel_images;
CREATE POLICY "Allow authenticated users full access to login carousel images"
ON public.login_carousel_images
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- 5. Backfill initial sample images (from Unsplash but structured under Cloudinary format keys)
INSERT INTO public.login_carousel_images (cloudinary_url, cloudinary_public_id, sequence_order, is_active)
VALUES 
('https://images.unsplash.com/photo-1548839140-29a749e1bc4e?q=80&w=1000&auto=format&fit=crop', 'unsplash_water_drop', 1, true),
('https://images.unsplash.com/photo-1550505096-7ed980753b76?q=80&w=1000&auto=format&fit=crop', 'unsplash_bottles', 2, true),
('https://images.unsplash.com/photo-1585933646706-7b8398453e14?q=80&w=1000&auto=format&fit=crop', 'unsplash_clean_water', 3, true),
('https://images.unsplash.com/photo-1527668744158-b64808d249f7?q=80&w=1000&auto=format&fit=crop', 'unsplash_glass_of_water', 4, true),
('https://images.unsplash.com/photo-1543335785-84f7bb54c933?q=80&w=1000&auto=format&fit=crop', 'unsplash_water_ripples', 5, true)
ON CONFLICT DO NOTHING;
