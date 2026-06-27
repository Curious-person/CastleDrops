-- Migration: Rename daily_logs table to orders

-- 1. Rename the main table
ALTER TABLE IF EXISTS public.daily_logs RENAME TO orders;

-- 2. Rename any indexes if they exist (optional, but good practice if they are named with daily_logs)
-- ALTER INDEX IF EXISTS daily_logs_pkey RENAME TO orders_pkey;

-- 3. If you have any foreign keys pointing to daily_logs, or functions/triggers that use the name 'daily_logs',
-- they might need to be updated. Since this is a simple rename, Supabase/Postgres usually handles
-- references automatically, but verify that your Row Level Security (RLS) policies are still correct
-- if you had policies specifically referencing the old table name.

-- Note: In the Supabase SQL editor, simply run this script to execute the migration.

-- Migration: Add missing fields to customers table and link foreign keys
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS landmark text;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS water_preference text DEFAULT 'alkaline';
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS notes text;

-- Add foreign key constraint to link orders and customers if not present
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_orders_customer' 
        AND table_name = 'orders'
    ) THEN
        ALTER TABLE public.orders 
        ADD CONSTRAINT fk_orders_customer 
        FOREIGN KEY (customer_id) 
        REFERENCES public.customers(id) 
        ON DELETE SET NULL;
    END IF;
END $$;

