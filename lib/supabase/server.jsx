import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"

export async function createClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

    if (!url || !key) {
        throw new Error(
            "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY."
        )
    }

    let token;
    try {
        const cookieStore = await cookies()
        token = cookieStore.get("sb-access-token")?.value
    } catch {
        // cookies() might throw during prerendering or static compilation
    }

    const options = token
        ? {
              global: {
                  headers: {
                      Authorization: `Bearer ${token}`,
                  },
              },
          }
        : {}

    return createSupabaseClient(url, key, options)
}