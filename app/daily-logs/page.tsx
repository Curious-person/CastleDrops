import { createClient } from "@supabase/supabase-js";
import { Suspense } from "react";
import NavigationBar from "@/components/NavigationBar";
import DailyLogsClient from "./DailyLogsClient";


async function fetchDailyLogs(query?: string, sort?: string) {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    );

    let dbQuery = supabase.from("daily_logs").select("*");

    if (query) {
        dbQuery = dbQuery.or(
            `customer_name.ilike.%${query}%,customer_address.ilike.%${query}%,payment_method.ilike.%${query}%`
        );
    }

    if (sort === "option2") {
        dbQuery = dbQuery.order("customer_name", { ascending: true });
    } else if (sort === "option3") {
        dbQuery = dbQuery.order("water_type", { ascending: true });
    } else {
        // Default: Newest first
        dbQuery = dbQuery.order("log_date", { ascending: false });
    }

    const { data: daily_logs } = await dbQuery;
    return daily_logs ?? [];
}

export default async function DailyLogs({
    searchParams,
}: {
    searchParams: Promise<{ query?: string; sort?: string }>;
}) {
    const params = await searchParams;
    const dailyLogs = await fetchDailyLogs(params.query, params.sort);

    return (
        <main className="bg-linear-to-b from-[#2FA9D9] to-white">
            <NavigationBar className="sticky top-0 z-50" />
            <Suspense key={params.query || params.sort} fallback={<div className="p-8">Loading logs...</div>}>
                <DailyLogsClient initialData={dailyLogs} />
            </Suspense>
        </main>
    );
}
