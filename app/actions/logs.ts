"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function createLog(formData: {
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
}) {
    const supabase = await createClient();

    const { price_per_gallon, total_gallons, quantity, total_price, ...rest } = formData;

    const { error } = await supabase
        .from("daily_logs")
        .insert([{ ...rest, status: formData.status ?? "ongoing" }]);

    if (error) throw new Error(error.message);

    revalidatePath("/orders");
    return { success: true };
}

export async function createLogsBulk(logs: any[]) {
    const supabase = await createClient();

    const sanitizedLogs = logs.map(l => {
        const { price_per_gallon, total_gallons, quantity, total_price, ...rest } = l;
        return { ...rest, status: l.status ?? "ongoing" };
    });

    const { error } = await supabase
        .from("daily_logs")
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
    session_address?: string | null;
}) {
    const supabase = await createClient();

    const { error } = await supabase
        .from("daily_logs")
        .update(formData)
        .eq("id", id);

    if (error) throw new Error(error.message);

    revalidatePath("/orders");
    return { success: true };
}

export async function deleteLog(id: number) {
    const supabase = await createClient();

    const { error } = await supabase
        .from("daily_logs")
        .delete()
        .eq("id", id);

    if (error) throw new Error(error.message);

    revalidatePath("/orders");
    return { success: true };
}

export async function updateLogStatus(id: number, status: "ongoing" | "delivered" | "cancelled") {
    const supabase = await createClient();

    const { error } = await supabase
        .from("daily_logs")
        .update({ status })
        .eq("id", id);

    if (error) throw new Error(error.message);

    revalidatePath("/orders");
    return { success: true };
}

export async function deleteSession(sessionId: string) {
    const supabase = await createClient();

    const { error } = await supabase
        .from("daily_logs")
        .delete()
        .eq("session_id", sessionId);

    if (error) throw new Error(error.message);

    revalidatePath("/orders");
    return { success: true };
}

export async function updateSession(sessionId: string, address: string) {
    const supabase = await createClient();

    const { error } = await supabase
        .from("daily_logs")
        .update({ session_address: address, customer_address: address })
        .eq("session_id", sessionId);

    if (error) throw new Error(error.message);

    revalidatePath("/orders");
    return { success: true };
}

export async function updateSessionStatus(sessionId: string, status: string) {
    const supabase = await createClient();

    const { error } = await supabase
        .from("daily_logs")
        .update({ session_status: status })
        .eq("session_id", sessionId);

    if (error) throw new Error(error.message);

    revalidatePath("/orders");
    return { success: true };
}


