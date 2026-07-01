"use server"

import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"
import { createClient } from "@/lib/supabase/server"

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
        } catch {
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
    } catch {
        return { error: "Failed to delete session cookies." }
    }
}

export async function sendPasswordResetEmail(email: string, origin: string) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

    if (!url || !key) {
        return { error: "Configuration error: Missing Supabase URL or Key." }
    }

    const supabase = createSupabaseClient(url, key)
    const redirectTo = `${origin}/auth/callback?next=/reset-password`

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
    })

    if (error) {
        return { error: error.message }
    }

    return { success: true }
}

export async function updateUserPassword(password: string) {
    try {
        const supabase = await createClient()
        const { error } = await supabase.auth.updateUser({
            password: password
        })

        if (error) {
            return { error: error.message }
        }

        // Successfully updated password.
        // Let's clear the cookies to force log back in (per request: "after success, go back to login")
        const cookieStore = await cookies()
        cookieStore.delete("sb-access-token")
        cookieStore.delete("sb-refresh-token")

        return { success: true }
    } catch (e) {
        return { error: (e as Error).message || "Failed to update password." }
    }
}

