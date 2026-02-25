'use client';
import { ArrowRightFromLine } from "lucide-react";
import { Button } from "./ui/button";

export default function NavigationBar() {
    return (
        <div className="w-full flex justify-between py-4 px-6">
            <img src="/images/logo.png" alt="Castle Drops Logo" className="w-[4rem] h-auto" />
            <Button>
                <div className="flex items-center">
                    <ArrowRightFromLine className="w-4 h-4 mr-2" />
                    Export Report
                </div>
            </Button>
        </div>
    );
}