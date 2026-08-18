"use client";

import { CircleCheck, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BulkActionToolbarProps {
    selectedCount: number;
    onApprove: () => void;
    onDelete: () => void;
    onCancel: () => void;
    isPending: boolean;
}

export default function BulkActionToolbar({
    selectedCount,
    onApprove,
    onDelete,
    onCancel,
    isPending
}: BulkActionToolbarProps) {
    if (selectedCount === 0) return null;

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
            <div className="flex items-center gap-4 px-4 py-3 bg-[#e7f6fc] border border-[#2FA9D9]/30 rounded-xl">
                <span className="text-sm font-semibold text-gray-900 whitespace-nowrap">
                    Selected ({selectedCount})
                </span>
                <div className="h-4 w-px bg-[#2FA9D9]/20" />
                <div className="flex items-center gap-2">
                    <Button
                        size="sm"
                        disabled={isPending}
                        onClick={onApprove}
                        className="bg-[#2FA9D9] hover:bg-[#2195c0] text-white font-semibold text-xs rounded-lg animate-in"
                    >
                        <CircleCheck className="w-4 h-4 sm:mr-1.5 shrink-0" />
                        <span className="hidden sm:inline">Approve</span>
                    </Button>
                    <Button
                        size="sm"
                        variant="destructive"
                        disabled={isPending}
                        onClick={onDelete}
                        className="font-semibold text-xs rounded-lg text-white"
                    >
                        <Trash2 className="w-4 h-4 sm:mr-1.5 shrink-0" />
                        <span className="hidden sm:inline">Delete</span>
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        disabled={isPending}
                        onClick={onCancel}
                        className="bg-white border border-gray-200 hover:bg-[#e7f6fc] hover:text-[#2FA9D9] hover:border-[#2FA9D9]/30 text-gray-700 font-semibold text-xs rounded-lg"
                    >
                        <X className="w-4 h-4 sm:mr-1.5 shrink-0" />
                        <span className="hidden sm:inline">Cancel</span>
                    </Button>
                </div>
            </div>
        </div>
    );
}
