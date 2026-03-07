import { createClient } from "@supabase/supabase-js";
import { Suspense } from "react";
import NavigationBar from "@/components/NavigationBar";
import DailyLogsClient from "./DailyLogsClient";

type Log = {
    id: number
    created_at: string
    updated_at: string
    log_date: string
    start_time: string
    end_time: string
    opening_reading: number
    closing_reading: number
    daily_usage: number
    user_notes: string
}

async function fetchDailyLogs() {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    );
    const { data: daily_logs } = await supabase.from("daily_logs").select();

    return daily_logs?.map((log) => ({
        ...log,
        user_notes: log.user_notes || "—"
    }));
}

export default async function DailyLogs() {
    const dailyLogs = await fetchDailyLogs();

    return (
        <main>
            <NavigationBar />
            <Suspense fallback={<div className="p-8">Loading logs...</div>}>
                <DailyLogsClient initialData={dailyLogs || []} />
            </Suspense>
        </main>
    );
}