import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import ResetPasswordForm from "./ResetPasswordForm"

export default async function ResetPasswordPage() {
    const cookieStore = await cookies()
    const token = cookieStore.get("sb-access-token")?.value

    if (!token) {
        redirect("/login?error=Authentication session expired or invalid. Please request a new link.")
    }

    return <ResetPasswordForm />
}
