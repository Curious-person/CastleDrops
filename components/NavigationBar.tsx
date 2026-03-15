'use client';
import { ArrowRightFromLine } from "lucide-react";
import { Button } from "./ui/button";

interface NavigationBarProps {
    className?: string;
}

export default function NavigationBar({ className }: NavigationBarProps) {
    return (
        <div className={`w-full flex justify-between py-4 px-6 bg-white print:hidden ${className}`}>
            <img src="/images/logo.png" alt="Castle Drops Logo" className="w-16 h-auto" />
            <Button
                onClick={() => window.print()}
            >
                <div className="flex items-center">
                    <ArrowRightFromLine className="w-4 h-4 mr-2" />
                    Export Report
                </div>
            </Button>
        </div>
    );
}
