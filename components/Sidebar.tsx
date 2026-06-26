"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, Users, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Sidebar() {
    const pathname = usePathname() || "";

    return (
        <div className="w-64 min-w-[256px] flex flex-col p-6 pr-0 gap-8 h-full min-h-[calc(100vh-2rem)] sticky top-4 shrink-0">
            <div className="flex items-center gap-2">
                <Image
                    src="/images/logo.png"
                    alt="Castle Drops Logo"
                    width={40}
                    height={40}
                    className="w-10 h-auto"
                    priority
                />
                <div className="flex flex-col">
                    <span className="font-bold text-base text-[#2FA9D9] leading-tight">Castle Drops</span>
                    <span className="text-[10px] text-[#2FA9D9] font-semibold uppercase tracking-wider">Water Station</span>
                </div>
            </div>

            <div className="flex flex-col gap-1.5 flex-1">
                <Button variant="sidebar" active={pathname.startsWith("/orders")} asChild>
                    <Link href="/orders">
                        <ClipboardList className="mr-2" />
                        <span>Orders</span>
                    </Link>
                </Button>
                <Button variant="sidebar" active={pathname.startsWith("/customers")} asChild>
                    <Link href="/customers">
                        <Users className="mr-2" />
                        <span>Customers</span>
                    </Link>
                </Button>
                <Button variant="sidebar" active={pathname.startsWith("/settings")} asChild>
                    <Link href="/settings">
                        <Settings className="mr-2" />
                        <span>Settings</span>
                    </Link>
                </Button>
            </div>
        </div>
    );
}
