'use client';
import Image from "next/image";
import { ArrowRightFromLine } from "lucide-react";
import { Button } from "./ui/button";

interface NavigationBarProps {
    className?: string;
}

export default function NavigationBar({ className }: NavigationBarProps) {
    return (
        <div className={`w-full flex justify-between py-4 px-6 bg-white print:hidden ${className}`}>
            <Image 
                src="/images/logo.png" 
                alt="Castle Drops Logo" 
                width={64} 
                height={64} 
                className="w-16 h-auto"
                priority
            />
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
