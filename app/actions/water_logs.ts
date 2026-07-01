"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export type WaterType = "alkaline" | "mineral";

export interface WaterLog {
    id: string;
    log_date: string;
    water_type: WaterType;
    start_reading: number;
    end_reading: number;
    notes: string;
    created_at?: string;
}

export async function getWaterLogs(): Promise<WaterLog[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("water_logs")
        .select("*")
        .order("log_date", { ascending: false });

    if (error) throw new Error(error.message);

    return data as WaterLog[];
}

export async function createWaterLog(
    log: Omit<WaterLog, "id" | "created_at">
): Promise<WaterLog> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("water_logs")
        .insert([{
            log_date: log.log_date,
            water_type: log.water_type,
            start_reading: log.start_reading,
            end_reading: log.end_reading,
            notes: log.notes
        }])
        .select()
        .single();

    if (error) throw new Error(error.message);

    revalidatePath("/water-logs");
    return data as WaterLog;
}

export async function updateWaterLog(
    id: string,
    log: Partial<Omit<WaterLog, "id" | "created_at">>
): Promise<void> {
    const supabase = await createClient();

    const { error } = await supabase
        .from("water_logs")
        .update({
            log_date: log.log_date,
            water_type: log.water_type,
            start_reading: log.start_reading,
            end_reading: log.end_reading,
            notes: log.notes
        })
        .eq("id", id);

    if (error) throw new Error(error.message);
    
    revalidatePath("/water-logs");
}

export async function deleteWaterLog(id: string): Promise<void> {
    const supabase = await createClient();

    const { error } = await supabase
        .from("water_logs")
        .delete()
        .eq("id", id);

    if (error) throw new Error(error.message);

    revalidatePath("/water-logs");
}
