CREATE TABLE IF NOT EXISTS public.water_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz DEFAULT now(),
    log_date date NOT NULL,
    water_type text NOT NULL,
    start_reading numeric NOT NULL,
    end_reading numeric NOT NULL,
    notes text
);

-- Note: You should run this in your Supabase SQL Editor.
