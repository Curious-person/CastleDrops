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

async function fetchDailyLogs(query?: string, sort?: string) {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    );

    let dbQuery = supabase.from("daily_logs").select("*");

    if (query) {
        dbQuery = dbQuery.ilike("user_notes", `%${query}%`);
    }

    if (sort === "option2") {
        dbQuery = dbQuery.order("daily_usage", { ascending: false });
    } else if (sort === "option3") {
        dbQuery = dbQuery.order("daily_usage", { ascending: true });
    } else {
        // Default: Newest first
        dbQuery = dbQuery.order("log_date", { ascending: false });
    }


    const { data: daily_logs } = await dbQuery;

    return daily_logs?.map((log) => ({
        ...log,
        user_notes: log.user_notes || "—"
    }));
}

export default async function DailyLogs({
    searchParams,
}: {
    searchParams: Promise<{ query?: string; sort?: string }>;
}) {
    // Unwrapping the searchParams promise
    const params = await searchParams;
    const dailyLogs = await fetchDailyLogs(params.query, params.sort);

    return (
        <main className="bg-linear-to-b from-[#2FA9D9] to-white">
            <NavigationBar className="sticky top-0 z-50" />
            <Suspense key={params.query || params.sort} fallback={<div className="p-8">Loading logs...</div>}>
                <DailyLogsClient initialData={dailyLogs || []} />
            </Suspense>
        </main>
    );
}
