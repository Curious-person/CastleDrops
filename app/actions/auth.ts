"use server"

import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"

export async function login(formData: { email: string; password: string }) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

    if (!url || !key) {
        return { error: "Configuration error: Missing Supabase URL or Key." }
    }

    const supabase = createSupabaseClient(url, key)
    const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password
    })

    if (error) {
        return { error: error.message }
    }

    if (data.session) {
        try {
            const cookieStore = await cookies()
            cookieStore.set("sb-access-token", data.session.access_token, {
                path: "/",
                secure: process.env.NODE_ENV === "production",
                sameSite: "lax",
                maxAge: data.session.expires_in,
                httpOnly: true
            })
            cookieStore.set("sb-refresh-token", data.session.refresh_token, {
                path: "/",
                secure: process.env.NODE_ENV === "production",
                sameSite: "lax",
                maxAge: data.session.expires_in,
                httpOnly: true
            })
            return { success: true }
        } catch (e) {
            return { error: "Failed to store session in cookies." }
        }
    }

    return { error: "Failed to establish session" }
}

export async function logout() {
    try {
        const cookieStore = await cookies()
        cookieStore.delete("sb-access-token")
        cookieStore.delete("sb-refresh-token")
        return { success: true }
    } catch (e) {
        return { error: "Failed to delete session cookies." }
    }
}
