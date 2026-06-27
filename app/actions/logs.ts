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
}

export async function createLog(formData: LogInput) {
    const supabase = await createClient();

    const rest = { ...formData };
    delete rest.price_per_gallon;
    delete rest.total_gallons;
    delete rest.quantity;
    delete rest.total_price;

    const { error } = await supabase
        .from("orders")
        .insert([{ ...rest, status: formData.status ?? "ongoing" }]);

    if (error) throw new Error(error.message);

    revalidatePath("/orders");
    return { success: true };
}

export async function createLogsBulk(logs: LogInput[]) {
    const supabase = await createClient();

    const sanitizedLogs = logs.map(l => {
        const rest = { ...l };
        delete rest.price_per_gallon;
        delete rest.total_gallons;
        delete rest.quantity;
        delete rest.total_price;
        return { ...rest, status: l.status ?? "ongoing" };
    });

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
    session_address?: string | null;
}) {
    const supabase = await createClient();

    const { error } = await supabase
        .from("orders")
        .update(formData)
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

    const { error } = await supabase
        .from("orders")
        .delete()
        .eq("session_id", sessionId);

    if (error) throw new Error(error.message);

    revalidatePath("/orders");
    return { success: true };
}

export async function updateSession(sessionId: string, address: string) {
    const supabase = await createClient();

    const { error } = await supabase
        .from("orders")
        .update({ session_address: address, customer_address: address })
        .eq("session_id", sessionId);

    if (error) throw new Error(error.message);

    revalidatePath("/orders");
    return { success: true };
}

export async function updateSessionStatus(sessionId: string, status: string) {
    const supabase = await createClient();

    const { error } = await supabase
        .from("orders")
        .update({ session_status: status })
        .eq("session_id", sessionId);

    if (error) throw new Error(error.message);

    revalidatePath("/orders");
    return { success: true };
}



