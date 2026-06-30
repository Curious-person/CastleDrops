-- Migration: Create settings and user profiles tables

-- 1. Create Station Settings Table (Singleton)
CREATE TABLE IF NOT EXISTS public.station_settings (
    id int PRIMARY KEY DEFAULT 1,
    CONSTRAINT singleton_check CHECK (id = 1),
    name text NOT NULL DEFAULT 'Castle Drops Ermita Hub',
    hotline text NOT NULL DEFAULT '0917 888 8888',
    address text NOT NULL DEFAULT '123 Mabini St, Barangay 667, Ermita, Manila',
    hours text NOT NULL DEFAULT '8:00 AM - 6:00 PM',
    license text NOT NULL DEFAULT 'WD-2026-0428',
    alkaline_round numeric(10, 2) NOT NULL DEFAULT 50.00,
    alkaline_flat numeric(10, 2) NOT NULL DEFAULT 45.00,
    mineral_round numeric(10, 2) NOT NULL DEFAULT 40.00,
    mineral_flat numeric(10, 2) NOT NULL DEFAULT 35.00,
    updated_at timestamptz DEFAULT now()
);

-- Backfill initial settings row if not present
INSERT INTO public.station_settings (id, name, hotline, address, hours, license, alkaline_round, alkaline_flat, mineral_round, mineral_flat)
VALUES (1, 'Castle Drops Ermita Hub', '0917 888 8888', '123 Mabini St, Barangay 667, Ermita, Manila', '8:00 AM - 6:00 PM', 'WD-2026-0428', 50.00, 45.00, 40.00, 35.00)
ON CONFLICT (id) DO NOTHING;

-- 2. Create User Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name text NOT NULL,
    phone text,
    sms_summary boolean NOT NULL DEFAULT true,
    email_alerts boolean NOT NULL DEFAULT true,
    updated_at timestamptz DEFAULT now()
);

-- 3. Automatic Profile Creation Trigger for new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, name, phone, sms_summary, email_alerts)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'name', 'New Manager'),
    COALESCE(new.raw_user_meta_data->>'phone', ''),
    true,
    true
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill profiles for existing users
INSERT INTO public.profiles (id, name, phone, sms_summary, email_alerts)
SELECT 
    id,
    COALESCE(raw_user_meta_data->>'name', 'Jose Dela Cruz'),
    COALESCE(raw_user_meta_data->>'phone', '0917 123 4567'),
    true,
    true
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.station_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 5. Define RLS Policies
-- Allow authenticated users to read and update station settings
CREATE POLICY "Allow authenticated users to read station_settings"
ON public.station_settings FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to update station_settings"
ON public.station_settings FOR UPDATE TO authenticated USING (true);

-- Allow authenticated users to read/write only their own profile
CREATE POLICY "Allow users to read their own profile"
ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);

CREATE POLICY "Allow users to insert their own profile"
ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE POLICY "Allow users to update their own profile"
ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
