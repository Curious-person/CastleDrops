-- Migration: Normalize order sessions

-- 1. Create order_sessions table
CREATE TABLE IF NOT EXISTS public.order_sessions (
    id text PRIMARY KEY,
    status text DEFAULT 'ongoing',
    address text,
    created_at timestamptz DEFAULT now()
);

-- 2. Migrate unique session data from orders table
-- Using MAX to just have deterministic values in case of any inconsistency
INSERT INTO public.order_sessions (id, status, address, created_at)
SELECT 
    session_id, 
    MAX(session_status) as status, 
    MAX(session_address) as address,
    MIN(created_at) as created_at
FROM public.orders
WHERE session_id IS NOT NULL
GROUP BY session_id
ON CONFLICT (id) DO NOTHING;

-- 3. Add foreign key from orders to order_sessions
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_orders_session' 
        AND table_name = 'orders'
    ) THEN
        ALTER TABLE public.orders 
        ADD CONSTRAINT fk_orders_session 
        FOREIGN KEY (session_id) 
        REFERENCES public.order_sessions(id) 
        ON DELETE SET NULL;
    END IF;
END $$;

-- 4. Drop the columns from orders
-- Note: You should only run this step AFTER your application code has been updated 
-- to use the new order_sessions table.
ALTER TABLE public.orders DROP COLUMN IF EXISTS session_status;
ALTER TABLE public.orders DROP COLUMN IF EXISTS session_address;
