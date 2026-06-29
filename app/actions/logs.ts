"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export interface LogInput {
    log_date: string;
    container_type: string | null;
    water_type: string | null;
    customer_id: string | null;
    customer_name: string;
    customer_address: string;
    payment_method: string | null;
    fulfillment_type: string | null;
    quantity?: number;
    price_per_gallon?: number | null;
    total_gallons?: number | null;
    total_price?: number | null;
    status?: string | null;
    session_id?: string | null;
    session_address?: string | null;
    session_status?: string | null;
}

export async function createLog(formData: LogInput) {
    const supabase = await createClient();

    if (formData.session_id) {
        const { error: sessionError } = await supabase
            .from("order_sessions")
            .upsert({
                id: formData.session_id,
                address: formData.session_address || formData.customer_address,
                status: formData.session_status || "ongoing"
            });
        if (sessionError) throw new Error(sessionError.message);
    }

    const rest = { ...formData };
    delete rest.session_address;
    delete rest.session_status;

    const { error } = await supabase
        .from("orders")
        .insert([{ ...rest, status: formData.status ?? "ongoing" }]);

    if (error) throw new Error(error.message);

    revalidatePath("/orders");
    return { success: true };
}

export async function createLogsBulk(logs: LogInput[]) {
    const supabase = await createClient();

    const sessionsMap = new Map();
    const sanitizedLogs = logs.map(l => {
        if (l.session_id) {
            if (!sessionsMap.has(l.session_id)) {
                sessionsMap.set(l.session_id, {
                    id: l.session_id,
                    address: l.session_address || l.customer_address,
                    status: l.session_status || "ongoing"
                });
            }
        }

        const rest = { ...l };
        delete rest.session_address;
        delete rest.session_status;
        return { ...rest, status: l.status ?? "ongoing" };
    });

    if (sessionsMap.size > 0) {
        const { error: sessionError } = await supabase
            .from("order_sessions")
            .upsert(Array.from(sessionsMap.values()));
        if (sessionError) throw new Error(sessionError.message);
    }

    const { error } = await supabase
        .from("orders")
        .insert(sanitizedLogs);

    if (error) throw new Error(error.message);

    revalidatePath("/orders");
    return { success: true };
}

export async function updateLog(id: number, formData: {
    log_date: string;
    container_type: string | null;
    water_type: string | null;
    customer_id: string | null;
    customer_name: string;
    customer_address: string;
    payment_method: string | null;
    fulfillment_type: string | null;
    session_id?: string | null;
}) {
    const supabase = await createClient();

    const rest = { ...formData };

    const { error } = await supabase
        .from("orders")
        .update(rest)
        .eq("id", id);

    if (error) throw new Error(error.message);

    revalidatePath("/orders");
    return { success: true };
}

export async function deleteLog(id: number) {
    const supabase = await createClient();

    const { error } = await supabase
        .from("orders")
        .delete()
        .eq("id", id);

    if (error) throw new Error(error.message);

    revalidatePath("/orders");
    return { success: true };
}

export async function updateLogStatus(id: number, status: "ongoing" | "delivered" | "cancelled") {
    const supabase = await createClient();

    const { error } = await supabase
        .from("orders")
        .update({ status })
        .eq("id", id);

    if (error) throw new Error(error.message);

    revalidatePath("/orders");
    return { success: true };
}

export async function deleteSession(sessionId: string) {
    const supabase = await createClient();

    // Delete orders first (or let cascade handle if we had ON DELETE CASCADE)
    const { error: ordersError } = await supabase
        .from("orders")
        .delete()
        .eq("session_id", sessionId);

    if (ordersError) throw new Error(ordersError.message);

    const { error } = await supabase
        .from("order_sessions")
        .delete()
        .eq("id", sessionId);

    if (error) throw new Error(error.message);

    revalidatePath("/orders");
    return { success: true };
}

export async function updateSession(sessionId: string, address: string) {
    const supabase = await createClient();

    const { error: sessionError } = await supabase
        .from("order_sessions")
        .update({ address })
        .eq("id", sessionId);

    if (sessionError) throw new Error(sessionError.message);

    const { error } = await supabase
        .from("orders")
        .update({ customer_address: address })
        .eq("session_id", sessionId);

    if (error) throw new Error(error.message);

    revalidatePath("/orders");
    return { success: true };
}

export async function updateSessionStatus(sessionId: string, status: string) {
    const supabase = await createClient();

    const { error } = await supabase
        .from("order_sessions")
        .update({ status })
        .eq("id", sessionId);

    if (error) throw new Error(error.message);

    revalidatePath("/orders");
    return { success: true };
}



