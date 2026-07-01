import { NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/reset-password'

  if (code) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

    if (url && key) {
      const supabase = createSupabaseClient(url, key)
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (!error && data.session) {
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
          
          return NextResponse.redirect(`${origin}${next}`)
        } catch (e) {
          console.error("Failed to set session cookies in callback:", e)
        }
      } else {
        console.error("Failed to exchange code for session:", error?.message)
      }
    }
  }

  // Return the user to login with an error message if the code exchange fails
  return NextResponse.redirect(`${origin}/login?error=Invalid or expired password reset link.`)
}
