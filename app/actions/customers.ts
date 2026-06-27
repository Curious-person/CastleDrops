"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export type WaterPreference = "alkaline" | "mineral" | "both";

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
            water_preference,
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
    const customersWithStats: Customer[] = (data || []).map((c: any) => {
        const orders = c.orders || [];
        const alkaline_orders = orders.filter((o: any) => o.water_type === "alkaline").length;
        const mineral_orders = orders.filter((o: any) => o.water_type === "mineral").length;

        return {
            id: c.id,
            name: c.name,
            address: c.address || "",
            phone: c.phone || "",
            landmark: c.landmark || "",
            water_preference: (c.water_preference as WaterPreference) || "alkaline",
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
    customer: Omit<Customer, "id" | "total_orders" | "alkaline_orders" | "mineral_orders">
): Promise<Customer> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("customers")
        .insert([{
            name: customer.name,
            address: customer.address,
            phone: customer.phone,
            landmark: customer.landmark,
            water_preference: customer.water_preference,
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
        water_preference: data.water_preference || "alkaline",
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
            water_preference: customer.water_preference,
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
