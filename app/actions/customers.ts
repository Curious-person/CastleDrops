"use server"

import { createClient } from "@/lib/supabase/server"

export interface Customer {
    id: string;
    name: string;
    address: string;
    phone?: string;
}

export async function getCustomers(): Promise<Customer[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("customers")
        .select("id, name, address, phone")
        .order("name");

    if (error) throw new Error(error.message);
    return data || [];
}

export async function createCustomer(customer: Omit<Customer, "id">): Promise<Customer> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("customers")
        .insert([customer])
        .select()
        .single();

    if (error) throw new Error(error.message);
    return data;
}
