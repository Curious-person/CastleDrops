"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export type WaterPreference = "alkaline" | "mineral" | "both" | "no_order_yet";

export interface Customer {
    id: string;
    name: string;
    address: string;
    phone: string;
    landmark: string;
    water_preference: WaterPreference;
    total_orders: number;
    alkaline_orders: number;
    mineral_orders: number;
    notes: string;
    created_at?: string;
}

export async function getCustomers(): Promise<Customer[]> {
    const supabase = await createClient();

    // Query customers and join their orders (only fields needed to compute metrics)
    const { data, error } = await supabase
        .from("customers")
        .select(`
            id,
            name,
            address,
            phone,
            landmark,
            notes,
            created_at,
            orders!fk_orders_customer (
                id,
                water_type
            )
        `)
        .order("name");

    if (error) throw new Error(error.message);

    // Map database structures to our client-side Customer interface by aggregating stats
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const customersWithStats: Customer[] = (data || []).map((c: any) => {
        const orders = c.orders || [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const alkaline_orders = orders.filter((o: any) => o.water_type === "alkaline").length;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mineral_orders = orders.filter((o: any) => o.water_type === "mineral").length;

        // Compute water_preference dynamically from order history
        let water_preference: WaterPreference;
        if (alkaline_orders > 0 && mineral_orders > 0) {
            water_preference = "both";
        } else if (alkaline_orders > 0) {
            water_preference = "alkaline";
        } else if (mineral_orders > 0) {
            water_preference = "mineral";
        } else {
            water_preference = "no_order_yet";
        }

        return {
            id: c.id,
            name: c.name,
            address: c.address || "",
            phone: c.phone || "",
            landmark: c.landmark || "",
            water_preference,
            notes: c.notes || "",
            created_at: c.created_at,
            total_orders: orders.length,
            alkaline_orders,
            mineral_orders
        };
    });

    return customersWithStats;
}

export async function createCustomer(
    customer: Omit<Customer, "id" | "total_orders" | "alkaline_orders" | "mineral_orders" | "water_preference">
): Promise<Customer> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("customers")
        .insert([{
            name: customer.name,
            address: customer.address,
            phone: customer.phone,
            landmark: customer.landmark,
            notes: customer.notes
        }])
        .select()
        .single();

    if (error) throw new Error(error.message);

    return {
        id: data.id,
        name: data.name,
        address: data.address || "",
        phone: data.phone || "",
        landmark: data.landmark || "",
        // New customers have no orders yet — preference will auto-compute on next fetch
        water_preference: "no_order_yet",
        notes: data.notes || "",
        total_orders: 0,
        alkaline_orders: 0,
        mineral_orders: 0,
        created_at: data.created_at
    };
}

export async function updateCustomer(
    id: string,
    customer: Partial<Omit<Customer, "id" | "total_orders" | "alkaline_orders" | "mineral_orders">>
): Promise<void> {
    const supabase = await createClient();

    const { error } = await supabase
        .from("customers")
        .update({
            name: customer.name,
            address: customer.address,
            phone: customer.phone,
            landmark: customer.landmark,
            notes: customer.notes
        })
        .eq("id", id);

    if (error) throw new Error(error.message);
    
    revalidatePath("/customers");
}

export async function deleteCustomer(id: string): Promise<void> {
    const supabase = await createClient();

    const { error } = await supabase
        .from("customers")
        .delete()
        .eq("id", id);

    if (error) throw new Error(error.message);

    revalidatePath("/customers");
}
