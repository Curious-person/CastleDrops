import { createClient } from "@supabase/supabase-js";
import OrdersClient from "@/features/orders/components/OrdersClient";
async function fetchOrders(query?: string, sort?: string) {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    );

    let dbQuery = supabase.from("orders").select("*");

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

    const { data: orders } = await dbQuery;
    return orders ?? [];
}

export default async function Orders({
    searchParams,
}: {
    searchParams: Promise<{ query?: string; sort?: string }>;
}) {
    const params = await searchParams;
    const orders = await fetchOrders(params.query, params.sort);

    return <OrdersClient initialData={orders} />;
}



