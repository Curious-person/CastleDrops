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
