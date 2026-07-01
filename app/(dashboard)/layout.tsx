"use client";

import Sidebar from "@/components/Sidebar";
import { usePathname } from "next/navigation";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const isNewOrder = pathname === "/orders/new";

    return (
        <div className="flex flex-col md:flex-row h-screen bg-[#e7f6fc] font-[family-name:var(--font-geist-sans)]">
            {!isNewOrder && <Sidebar />}
            <main className="flex-1 flex min-w-0 overflow-y-auto">
                {children}
            </main>
        </div>
    );
}
