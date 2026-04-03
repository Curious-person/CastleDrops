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
    status?: string;
}) {
    const supabase = await createClient();

    const { error } = await supabase
        .from("daily_logs")
        .insert([{ ...formData, status: formData.status ?? "ongoing" }]);

    if (error) throw new Error(error.message);

    revalidatePath("/daily-logs");
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
}) {
    const supabase = await createClient();

    const { error } = await supabase
        .from("daily_logs")
        .update(formData)
        .eq("id", id);

    if (error) throw new Error(error.message);

    revalidatePath("/daily-logs");
    return { success: true };
}

export async function deleteLog(id: number) {
    const supabase = await createClient();

    const { error } = await supabase
        .from("daily_logs")
        .delete()
        .eq("id", id);

    if (error) throw new Error(error.message);

    revalidatePath("/daily-logs");
    return { success: true };
}

export async function updateLogStatus(id: number, status: "ongoing" | "delivered" | "cancelled") {
    const supabase = await createClient();

    const { error } = await supabase
        .from("daily_logs")
        .update({ status })
        .eq("id", id);

    if (error) throw new Error(error.message);

    revalidatePath("/daily-logs");
    return { success: true };
}
