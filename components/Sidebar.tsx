"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ClipboardList, Users, Settings, Droplets, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function Sidebar() {
    const pathname = usePathname() || "";
    const [showLogoutModal, setShowLogoutModal] = useState(false);

    const handleLogoutConfirm = () => {
        setShowLogoutModal(false);
        // Simulate redirect to login or clear session
        window.location.href = "/";
    };

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
                <Button variant="sidebar" active={pathname.startsWith("/water-logs")} asChild>
                    <Link href="/water-logs">
                        <Droplets className="mr-2" />
                        <span>Water Logs</span>
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

            <div className="mt-auto pb-6 pr-6">
                <Button 
                    variant="sidebar" 
                    className="text-rose-600 hover:text-rose-700 hover:bg-rose-50/50" 
                    onClick={() => setShowLogoutModal(true)}
                >
                    <LogOut className="mr-2" />
                    <span>Log Out</span>
                </Button>
            </div>

            {/* Logout Confirm Dialog */}
            <Dialog open={showLogoutModal} onOpenChange={setShowLogoutModal}>
                <DialogContent className="sm:max-w-md max-w-[95vw]">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <LogOut className="w-5 h-5 text-rose-500" /> Confirm Session Logout
                        </DialogTitle>
                        <DialogDescription>
                            Are you sure you want to end your administration session? Active POS entries or log draft reports might be discarded.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="pt-4 flex-col sm:flex-row gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setShowLogoutModal(false)}
                            className="w-full sm:w-auto"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleLogoutConfirm}
                            className="bg-rose-600 hover:bg-rose-700 text-white w-full sm:w-auto"
                        >
                            Yes, Log Out
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
