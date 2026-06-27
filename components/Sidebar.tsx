"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ClipboardList, Users, Settings, Droplets, LogOut, PanelLeftClose, PanelLeftOpen, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { logout } from "@/app/actions/auth";

export default function Sidebar() {
    const pathname = usePathname() || "";
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    const handleLogoutConfirm = async () => {
        setShowLogoutModal(false);
        await logout();
        window.location.href = "/login";
    };

    const navLinks = [
        { href: "/orders", icon: ClipboardList, label: "Orders" },
        { href: "/water-logs", icon: Droplets, label: "Water Logs" },
        { href: "/customers", icon: Users, label: "Customers" },
        { href: "/settings", icon: Settings, label: "Settings" },
    ];

    const renderNavLinks = () => (
        <div className="flex flex-col gap-1.5 flex-1">
            {navLinks.map((link) => {
                const Icon = link.icon;
                return (
                    <Button 
                        key={link.href} 
                        variant="sidebar" 
                        active={pathname.startsWith(link.href)} 
                        className={isCollapsed ? "justify-center px-0" : ""}
                        title={isCollapsed ? link.label : undefined}
                        asChild
                    >
                        <Link href={link.href} onClick={() => setIsMobileOpen(false)}>
                            <Icon className={isCollapsed ? "" : "mr-2"} />
                            {!isCollapsed && <span>{link.label}</span>}
                        </Link>
                    </Button>
                )
            })}
        </div>
    );

    return (
        <>
            {/* Mobile Header (Hidden on Desktop) */}
            <div className="md:hidden flex items-center justify-between p-4 bg-white border-b border-gray-100 shrink-0">
                <div className="flex items-center gap-2">
                    <Image
                        src="/images/logo.png"
                        alt="Castle Drops Logo"
                        width={32}
                        height={32}
                        className="w-8 h-auto"
                        priority
                    />
                    <span className="font-bold text-lg text-[#2FA9D9] leading-tight">Castle Drops</span>
                </div>
                <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
                    <SheetTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-[#2FA9D9] hover:bg-sky-50">
                            <Menu className="w-6 h-6" />
                            <span className="sr-only">Toggle mobile menu</span>
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="w-64 p-6 flex flex-col gap-8">
                        <SheetHeader className="text-left flex flex-row items-center gap-2 m-0 p-0 space-y-0">
                            <Image
                                src="/images/logo.png"
                                alt="Castle Drops Logo"
                                width={40}
                                height={40}
                                className="w-10 h-auto"
                                priority
                            />
                            <div className="flex flex-col">
                                <SheetTitle className="font-bold text-base text-[#2FA9D9] leading-tight m-0 p-0 border-none h-auto">
                                    Castle Drops
                                </SheetTitle>
                                <span className="text-[10px] text-[#2FA9D9] font-semibold uppercase tracking-wider">Water Station</span>
                            </div>
                        </SheetHeader>
                        
                        <div className="mt-4 flex-1">
                            {/* Force uncollapsed style for mobile sheet */}
                            <div className="flex flex-col gap-1.5 flex-1">
                                {navLinks.map((link) => {
                                    const Icon = link.icon;
                                    return (
                                        <Button 
                                            key={link.href} 
                                            variant="sidebar" 
                                            active={pathname.startsWith(link.href)} 
                                            asChild
                                        >
                                            <Link href={link.href} onClick={() => setIsMobileOpen(false)}>
                                                <Icon className="mr-2" />
                                                <span>{link.label}</span>
                                            </Link>
                                        </Button>
                                    )
                                })}
                            </div>
                        </div>

                        <div className="mt-auto pb-6">
                            <Button 
                                variant="sidebar" 
                                className="text-rose-600 hover:text-rose-700 hover:bg-rose-50/50" 
                                onClick={() => setShowLogoutModal(true)}
                            >
                                <LogOut className="mr-2" />
                                <span>Log Out</span>
                            </Button>
                        </div>
                    </SheetContent>
                </Sheet>
            </div>

            {/* Desktop Sidebar (Hidden on Mobile) */}
            <div 
                className={`hidden md:flex flex-col p-6 pr-0 gap-8 h-full min-h-[calc(100vh-2rem)] sticky top-4 shrink-0 transition-all duration-300 ${isCollapsed ? 'w-24 min-w-[96px]' : 'w-64 min-w-[256px]'}`}
            >
                <div className={`flex ${isCollapsed ? 'flex-col items-center gap-4 pr-6' : 'items-center justify-between gap-2 pr-6'}`}>
                    <div className="flex items-center gap-2 overflow-hidden">
                        <Image
                            src="/images/logo.png"
                            alt="Castle Drops Logo"
                            width={40}
                            height={40}
                            className="w-10 h-auto shrink-0"
                            priority
                        />
                        {!isCollapsed && (
                            <div className="flex flex-col min-w-0">
                                <span className="font-bold text-base text-[#2FA9D9] leading-tight truncate">Castle Drops</span>
                                <span className="text-[10px] text-[#2FA9D9] font-semibold uppercase tracking-wider truncate">Water Station</span>
                            </div>
                        )}
                    </div>
                    
                    <button 
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="text-gray-400 hover:text-[#2FA9D9] transition-colors shrink-0"
                        title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                    >
                        {isCollapsed ? <PanelLeftOpen className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
                    </button>
                </div>

                <div className={`flex flex-col gap-1.5 flex-1 ${isCollapsed ? 'pr-6' : ''}`}>
                    {renderNavLinks()}
                </div>

                <div className="mt-auto pb-6 pr-6">
                    <Button 
                        variant="sidebar" 
                        className={`text-rose-600 hover:text-rose-700 hover:bg-rose-50/50 ${isCollapsed ? 'justify-center px-0' : ''}`} 
                        onClick={() => setShowLogoutModal(true)}
                        title={isCollapsed ? "Log Out" : undefined}
                    >
                        <LogOut className={isCollapsed ? "" : "mr-2"} />
                        {!isCollapsed && <span>Log Out</span>}
                    </Button>
                </div>
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
        </>
    );
}
