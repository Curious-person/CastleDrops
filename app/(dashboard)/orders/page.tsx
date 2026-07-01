import { createClient } from "@/lib/supabase/server";
import OrdersClient from "@/features/orders/components/OrdersClient";
async function fetchOrders(query?: string, sort?: string) {
    const supabase = await createClient();

    let dbQuery = supabase.from("orders").select("*, order_sessions(status, address, payments(amount))");

    if (query) {
        dbQuery = dbQuery.or(
            `customer_name.ilike.%${query}%,customer_address.ilike.%${query}%`
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



