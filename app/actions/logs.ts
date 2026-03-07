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

    // This refreshes the table automatically!
    revalidatePath("/your-page-path");
    return { success: true };
}