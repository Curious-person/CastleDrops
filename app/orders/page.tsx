import { createClient } from "@supabase/supabase-js";
import Image from "next/image";
import OrdersClient from "@/features/orders/components/OrdersClient";
import { Button } from "@/components/ui/button";
import { ClipboardList, Users, Settings } from "lucide-react";

async function fetchOrders(query?: string, sort?: string) {
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

export default async function Orders({
    searchParams,
}: {
    searchParams: Promise<{ query?: string; sort?: string }>;
}) {
    const params = await searchParams;
    const orders = await fetchOrders(params.query, params.sort);

    return (
        <main className="bg-[#e7f6fc] flex min-h-screen">
            {/* sidebar */}
            <div className="w-64 p-6 h-screen flex flex-col sticky top-0 bg-[#e7f6fc]">
                <div className="flex items-center gap-3 px-2 mb-8">
                    <Image
                        src="/images/logo.png"
                        alt="Castle Drops Logo"
                        width={40}
                        height={40}
                        className="w-10 h-auto"
                        priority
                    />
                    <div className="flex flex-col">
                        <span className="font-bold text-base text-[#2FA9D9] leading-tight">Castle Drops</span>
                        <span className="text-[10px] text-[#2FA9D9] font-semibold uppercase tracking-wider">Water Station</span>
                    </div>
                </div>

                <div className="flex flex-col gap-1.5 flex-1">
                    <Button variant="sidebar" active={true}>
                        <ClipboardList />
                        <span>Orders</span>
                    </Button>
                    <Button variant="sidebar" active={false}>
                        <Users />
                        <span>Customers</span>
                    </Button>
                    <Button variant="sidebar" active={false}>
                        <Settings />
                        <span>Settings</span>
                    </Button>
                </div>
            </div>

            <OrdersClient initialData={orders} />
        </main>
    );
}


