-- Migration: Decouple payments from orders table and create payments table

-- 1. Create payments table
CREATE TABLE IF NOT EXISTS public.payments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id text,
    amount numeric NOT NULL,
    method text NOT NULL,
    reference_number text,
    paid_at timestamptz DEFAULT now(),
    recorded_by uuid DEFAULT auth.uid(),
    
    CONSTRAINT fk_payments_session
        FOREIGN KEY (session_id)
        REFERENCES public.order_sessions(id)
        ON DELETE CASCADE,
        
    CONSTRAINT fk_payments_recorded_by
        FOREIGN KEY (recorded_by)
        REFERENCES auth.users(id)
        ON DELETE SET NULL
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS Policies
-- Allow authenticated users to select/read payments
CREATE POLICY "Allow authenticated users to read payments"
ON public.payments
FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to insert payments
CREATE POLICY "Allow authenticated users to insert payments"
ON public.payments
FOR INSERT
TO authenticated
WITH CHECK (true);

-- 4. Migrate existing payment data from orders to payments table (Backfill)
-- For orders that have session_id and payment_method, insert a record in payments.
-- We use total_price as the initial payment amount for orders where payment_method is set.
-- Note: We map payment methods from the old schema (e.g. cash, gcash, bank_transfer). 
-- 'credit' implies an unpaid amount, so we don't insert a payment for it.
INSERT INTO public.payments (session_id, amount, method, paid_at)
SELECT 
    session_id, 
    COALESCE(total_price, 0) as amount, 
    COALESCE(payment_method, 'cash') as method,
    created_at as paid_at
FROM public.orders
WHERE session_id IS NOT NULL 
  AND payment_method IS NOT NULL 
  AND payment_method != 'credit'
  AND COALESCE(total_price, 0) > 0;

-- 5. Remove obsolete columns from orders table
-- Run this AFTER updating application code references
ALTER TABLE public.orders DROP COLUMN IF EXISTS payment_method;
ALTER TABLE public.orders DROP COLUMN IF EXISTS session_status;
