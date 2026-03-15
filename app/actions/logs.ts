"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function createLog(formData: any) {
    const supabase = await createClient();

    const daily_usage = formData.closing_reading - formData.opening_reading;

    const { error } = await supabase
        .from("daily_logs")
        .insert([{ ...formData, daily_usage }]);

    if (error) throw new Error(error.message);

    revalidatePath("/");
    return { success: true };
}

export async function updateLog(id: number, formData: any) {
    const supabase = await createClient();

    const daily_usage = formData.closing_reading - formData.opening_reading;

    const { error } = await supabase
        .from("daily_logs")
        .update({ ...formData, daily_usage })
        .eq("id", id);

    if (error) throw new Error(error.message);

    revalidatePath("/");
    return { success: true };
}

export async function deleteLog(id: number) {
    const supabase = await createClient();

    const { error } = await supabase
        .from("daily_logs")
        .delete()
        .eq("id", id);

    if (error) throw new Error(error.message);

    revalidatePath("/");
    return { success: true };
}
