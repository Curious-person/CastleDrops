"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { z } from "zod"

// --- TypeScript Interfaces ---
export interface Payment {
    id: string;
    session_id: string | null;
    amount: number;
    method: string;
    reference_number: string | null;
    paid_at: string;
    recorded_by: string | null;
}

export interface SessionBalanceResult {
    session_id: string;
    total_owed: number;
    total_paid: number;
    balance: number;
}

// --- Zod Validation Schema ---
const paymentInputSchema = z.object({
    session_id: z.string().min(1, "Session ID is required"),
    amount: z.preprocess(
        (val) => (typeof val === "string" ? parseFloat(val) : val),
        z.number({ message: "Amount must be a number" })
         .positive("Amount must be greater than zero")
    ),
    method: z.string().min(1, "Payment method is required"),
    reference_number: z.string().nullable().optional(),
    paid_at: z.string().optional(),
    recorded_by: z.string().uuid().optional(),
});

export type PaymentInput = z.infer<typeof paymentInputSchema>;

/**
 * Get the financial balance for a specific session.
 * Computes: Total Owed (sum of total_price from orders) - Total Paid (sum of amount from payments)
 */
export async function getSessionBalance(sessionId: string): Promise<SessionBalanceResult> {
    if (!sessionId) {
        throw new Error("Session ID is required to fetch balance.");
    }

    const supabase = await createClient();

    // 1. Fetch total price of all orders in the session
    const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select("total_price")
        .eq("session_id", sessionId);

    if (ordersError) {
        throw new Error(`Failed to fetch orders for session: ${ordersError.message}`);
    }

    // 2. Fetch total payments recorded for the session
    const { data: payments, error: paymentsError } = await supabase
        .from("payments")
        .select("amount")
        .eq("session_id", sessionId);

    if (paymentsError) {
        throw new Error(`Failed to fetch payments for session: ${paymentsError.message}`);
    }

    const totalOwed = orders?.reduce((acc, order) => acc + Number(order.total_price || 0), 0) || 0;
    const totalPaid = payments?.reduce((acc, payment) => acc + Number(payment.amount || 0), 0) || 0;

    return {
        session_id: sessionId,
        total_owed: totalOwed,
        total_paid: totalPaid,
        balance: parseFloat((totalOwed - totalPaid).toFixed(2)),
    };
}

/**
 * Record a payment for an active order session
 */
export async function recordPayment(input: PaymentInput) {
    // Validate inputs using Zod
    const validatedData = paymentInputSchema.parse(input);

    const supabase = await createClient();

    const { data, error } = await supabase
        .from("payments")
        .insert([{
            session_id: validatedData.session_id,
            amount: validatedData.amount,
            method: validatedData.method,
            reference_number: validatedData.reference_number || null,
            paid_at: validatedData.paid_at || new Date().toISOString(),
            recorded_by: validatedData.recorded_by
        }])
        .select()
        .single();

    if (error) {
        throw new Error(`Failed to record payment: ${error.message}`);
    }

    revalidatePath("/orders");
    return { success: true, payment: data as Payment };
}

/**
 * Atomic-like creation of an order and its initial payment.
 * Processes creation sequentially within a Server Action.
 */
export async function createOrderAndRecordPayment(
    sessionData: { id: string; address: string; status?: string },
    orders: Array<{
        log_date: string;
        container_type: string | null;
        water_type: string | null;
        customer_id: string | null;
        customer_name: string;
        customer_address: string;
        fulfillment_type: string | null;
        quantity?: number;
        price_per_gallon?: number | null;
        total_gallons?: number | null;
        total_price?: number | null;
        status?: string | null;
    }>,
    initialPaymentAmount: number,
    paymentMethod: string,
    referenceNumber?: string
) {
    const supabase = await createClient();

    // 1. Create or upsert the order session
    const { error: sessionError } = await supabase
        .from("order_sessions")
        .upsert({
            id: sessionData.id,
            address: sessionData.address,
            status: sessionData.status || "ongoing"
        });

    if (sessionError) {
        throw new Error(`Failed to create order session: ${sessionError.message}`);
    }

    // 2. Insert orders associated with the session
    const ordersWithSession = orders.map(order => ({
        ...order,
        session_id: sessionData.id,
        status: order.status || "ongoing"
    }));

    const { error: ordersError } = await supabase
        .from("orders")
        .insert(ordersWithSession);

    if (ordersError) {
        throw new Error(`Failed to insert orders: ${ordersError.message}`);
    }

    // 3. Record initial payment only if amount is positive (skip 0 amounts)
    if (initialPaymentAmount > 0) {
        const { error: paymentError } = await supabase
            .from("payments")
            .insert([{
                session_id: sessionData.id,
                amount: initialPaymentAmount,
                method: paymentMethod,
                reference_number: referenceNumber || null
            }]);

        if (paymentError) {
            throw new Error(`Orders created, but payment recording failed: ${paymentError.message}`);
        }
    }

    revalidatePath("/orders");
    return { success: true };
}
