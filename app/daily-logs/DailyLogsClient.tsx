"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useDebouncedCallback } from "use-debounce";
import {
    PhilippinePeso, Plus, Search, Trash, Eye,
    CheckCircle2, XCircle, RotateCcw, Clock, PackageCheck, PackageX,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { format } from "date-fns";

import DataTable, { type Column } from "@/features/daily-logs/components/DataTable";
import StatCard from "@/features/daily-logs/components/StatCard";
import PrintableDailyLogs from "@/features/daily-logs/components/PrintableDailyLogs";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { deleteLog, updateLogStatus } from "@/app/actions/logs";

// ─── Types ────────────────────────────────────────────────────────────────────

type OrderStatus = "ongoing" | "delivered" | "cancelled";

type DailyLog = {
    id: number;
    log_date: string;
    container_type: string;
    water_type: string;
    customer_id: string | null;
    customer_name: string;
    customer_address: string;
    payment_method: string;
    fulfillment_type: string;
    status: OrderStatus | null;
};

// ─── Label / color maps ───────────────────────────────────────────────────────

const CONTAINER_LABELS: Record<string, string> = { round: "Round", flat: "Flat" };
const WATER_LABELS:     Record<string, string> = { alkaline: "Alkaline", mineral: "Mineral" };
const PAYMENT_LABELS:   Record<string, string> = {
    gcash: "GCash", cash: "Cash", bank_transfer: "Bank Transfer", credit: "Credit / Card",
};
const FULFILLMENT_LABELS: Record<string, string> = {
    delivery: "🚚 Delivery", pickup: "🏪 Pick-up",
};

const PAYMENT_COLORS:   Record<string, string> = {
    gcash: "bg-blue-100 text-blue-700", cash: "bg-green-100 text-green-700",
    bank_transfer: "bg-purple-100 text-purple-700", credit: "bg-amber-100 text-amber-700",
};
const WATER_COLORS:     Record<string, string> = {
    alkaline: "bg-sky-100 text-sky-700", mineral: "bg-emerald-100 text-emerald-700",
};
const CONTAINER_COLORS: Record<string, string> = {
    round: "bg-orange-100 text-orange-700", flat: "bg-slate-100 text-slate-700",
};

// ─── Badge ────────────────────────────────────────────────────────────────────

function Badge({ value, labels, colors }: {
    value: string;
    labels: Record<string, string>;
    colors: Record<string, string>;
}) {
    const label = labels[value] ?? value;
    const color = colors[value] ?? "bg-gray-100 text-gray-700";
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>
            {label}
        </span>
    );
}

// ─── Status confirm modal ────────────────────────────────────────────────────

interface StatusModalProps {
    open: boolean;
    onClose: () => void;
    onConfirm: () => void;
    isLoading: boolean;
    targetStatus: OrderStatus | null;
    logName: string;
}

function StatusModal({ open, onClose, onConfirm, isLoading, targetStatus, logName }: StatusModalProps) {
    const config = {
        delivered: {
            title: "Mark as Delivered",
            desc: `Confirm that the order for "${logName}" has been successfully delivered.`,
            confirmLabel: "Yes, Mark Delivered",
            confirmClass: "bg-emerald-600 hover:bg-emerald-700 text-white",
        },
        cancelled: {
            title: "Cancel Order",
            desc: `Are you sure you want to cancel the order for "${logName}"? This can be undone later.`,
            confirmLabel: "Yes, Cancel Order",
            confirmClass: "bg-rose-600 hover:bg-rose-700 text-white",
        },
        ongoing: {
            title: "Restore to Ongoing",
            desc: `Move the order for "${logName}" back to Ongoing status.`,
            confirmLabel: "Yes, Restore",
            confirmClass: "bg-[#2FA9D9] hover:bg-[#2195c0] text-white",
        },
    };

    if (!targetStatus) return null;
    const { title, desc, confirmLabel, confirmClass } = config[targetStatus];

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md max-w-[95vw]">
                <DialogHeader>
                    <DialogTitle className="text-lg">{title}</DialogTitle>
                </DialogHeader>
                <p className="text-sm text-gray-600">{desc}</p>
                <DialogFooter className="flex-col sm:flex-row gap-2">
                    <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
                        Cancel
                    </Button>
                    <Button
                        onClick={onConfirm}
                        disabled={isLoading}
                        className={`w-full sm:w-auto ${confirmClass}`}
                    >
                        {isLoading ? "Updating…" : confirmLabel}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ─── Shared column builders ───────────────────────────────────────────────────

function buildBaseColumns(): Column<DailyLog>[] {
    return [
        {
            title: "Date",
            key: "log_date",
            render: (value) => (
                <div className="font-medium flex flex-col">
                    <span className="font-medium">{format(new Date(String(value)), "EEE, MMM d, yyyy")}</span>
                    <span className="text-xs text-gray-400">{format(new Date(String(value)), "M/d/yyyy")}</span>
                </div>
            ),
        },
        {
            title: "Customer",
            key: "customer_name",
            render: (value, item: DailyLog) => (
                <div className="flex flex-col">
                    <span className="font-medium text-sm text-gray-900">{String(value) || "—"}</span>
                    {item.customer_address && (
                        <span className="text-xs text-gray-400 truncate max-w-[180px]">{item.customer_address}</span>
                    )}
                </div>
            ),
        },
        {
            title: "Container",
            key: "container_type",
            render: (value) => <Badge value={String(value)} labels={CONTAINER_LABELS} colors={CONTAINER_COLORS} />,
        },
        {
            title: "Water",
            key: "water_type",
            render: (value) => <Badge value={String(value)} labels={WATER_LABELS} colors={WATER_COLORS} />,
        },
        {
            title: "Payment",
            key: "payment_method",
            render: (value) => <Badge value={String(value)} labels={PAYMENT_LABELS} colors={PAYMENT_COLORS} />,
        },
        {
            title: "Fulfillment",
            key: "fulfillment_type",
            render: (value) => (
                <span className="text-sm text-gray-700">
                    {FULFILLMENT_LABELS[String(value)] ?? String(value)}
                </span>
            ),
        },
    ];
}

// ─── Tab badge ────────────────────────────────────────────────────────────────

function TabCount({ count, color }: { count: number; color: string }) {
    if (count === 0) return null;
    return (
        <span className={`ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold ${color}`}>
            {count}
        </span>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DailyLogsClient({ initialData }: { initialData: DailyLog[] }) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // Modals
    const [isViewModalOpen,   setIsViewModalOpen]   = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
    const [isDeleting,        setIsDeleting]        = useState(false);
    const [isUpdatingStatus,  setIsUpdatingStatus]  = useState(false);
    const [selectedLog,       setSelectedLog]       = useState<DailyLog | null>(null);
    const [pendingStatus,     setPendingStatus]     = useState<OrderStatus | null>(null);

    // ── Filtered data by status ──────────────────────────────────────────────
    const ongoingLogs   = initialData.filter((l) => !l.status || l.status === "ongoing");
    const deliveredLogs = initialData.filter((l) => l.status === "delivered");
    const cancelledLogs = initialData.filter((l) => l.status === "cancelled");

    // ── Handlers ─────────────────────────────────────────────────────────────

    const handleOpenView = (log: DailyLog) => { setSelectedLog(log); setIsViewModalOpen(true); };

    const handleOpenDelete = (log: DailyLog) => { setSelectedLog(log); setIsDeleteModalOpen(true); };

    const handleOpenStatusChange = (log: DailyLog, newStatus: OrderStatus) => {
        setSelectedLog(log);
        setPendingStatus(newStatus);
        setIsStatusModalOpen(true);
    };

    const handleDelete = async () => {
        if (!selectedLog) return;
        setIsDeleting(true);
        try {
            const result = await deleteLog(selectedLog.id);
            if (result.success) { setIsDeleteModalOpen(false); setSelectedLog(null); router.refresh(); }
        } catch (err) { console.error(err); }
        finally { setIsDeleting(false); }
    };

    const handleStatusChange = async () => {
        if (!selectedLog || !pendingStatus) return;
        setIsUpdatingStatus(true);
        try {
            const result = await updateLogStatus(selectedLog.id, pendingStatus);
            if (result.success) { setIsStatusModalOpen(false); setSelectedLog(null); router.refresh(); }
        } catch (err) { console.error(err); }
        finally { setIsUpdatingStatus(false); }
    };

    const handleSearch = useDebouncedCallback((term: string) => {
        const params = new URLSearchParams(searchParams.toString());
        term ? params.set("query", term) : params.delete("query");
        router.push(`${pathname}?${params.toString()}`);
    }, 300);

    const handleSort = (value: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("sort", value);
        router.push(`${pathname}?${params.toString()}`);
    };

    // ── Column sets for each tab ─────────────────────────────────────────────

    const ongoingColumns: Column<DailyLog>[] = [
        ...buildBaseColumns(),
        {
            title: "Actions",
            key: "id",
            render: (_v, item: DailyLog) => (
                <div className="flex gap-1.5">
                    <Button
                        variant="outline" size="sm"
                        onClick={() => handleOpenView(item)}
                        title="View details"
                    >
                        <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                        size="sm"
                        onClick={() => handleOpenStatusChange(item, "delivered")}
                        title="Mark as Delivered"
                        className="bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300"
                    >
                        <CheckCircle2 className="w-4 h-4" />
                    </Button>
                    <Button
                        size="sm"
                        onClick={() => handleOpenStatusChange(item, "cancelled")}
                        title="Cancel Order"
                        className="bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 hover:border-rose-300"
                    >
                        <XCircle className="w-4 h-4" />
                    </Button>
                    <Button
                        variant="outline" size="sm"
                        onClick={() => handleOpenDelete(item)}
                        title="Delete"
                    >
                        <Trash className="w-4 h-4" />
                    </Button>
                </div>
            ),
        },
    ];

    const deliveredColumns: Column<DailyLog>[] = [
        ...buildBaseColumns(),
        {
            title: "Actions",
            key: "id",
            render: (_v, item: DailyLog) => (
                <div className="flex gap-1.5">
                    <Button variant="outline" size="sm" onClick={() => handleOpenView(item)} title="View details">
                        <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                        size="sm"
                        onClick={() => handleOpenStatusChange(item, "ongoing")}
                        title="Restore to Ongoing"
                        className="bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100 hover:border-sky-300"
                    >
                        <RotateCcw className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleOpenDelete(item)} title="Delete">
                        <Trash className="w-4 h-4" />
                    </Button>
                </div>
            ),
        },
    ];

    const cancelledColumns: Column<DailyLog>[] = [
        ...buildBaseColumns(),
        {
            title: "Actions",
            key: "id",
            render: (_v, item: DailyLog) => (
                <div className="flex gap-1.5">
                    <Button variant="outline" size="sm" onClick={() => handleOpenView(item)} title="View details">
                        <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                        size="sm"
                        onClick={() => handleOpenStatusChange(item, "ongoing")}
                        title="Restore to Ongoing"
                        className="bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100 hover:border-sky-300"
                    >
                        <RotateCcw className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleOpenDelete(item)} title="Delete">
                        <Trash className="w-4 h-4" />
                    </Button>
                </div>
            ),
        },
    ];

    // ─────────────────────────────────────────────────────────────────────────

    return (
        <>
            <div className="p-4 sm:p-6 lg:p-8 print:hidden">

                {/* ── Stat Cards ── */}
                <div className="mb-4">
                    <div className="p-4 sm:p-6 rounded-xl bg-white w-full">
                        <Tabs defaultValue="today" className="w-full">
                            <TabsList className="w-full sm:w-auto grid grid-cols-4">
                                <TabsTrigger value="today">Today</TabsTrigger>
                                <TabsTrigger value="week">Week</TabsTrigger>
                                <TabsTrigger value="month">Month</TabsTrigger>
                                <TabsTrigger value="year">Year</TabsTrigger>
                            </TabsList>
                            <div className="flex flex-col sm:flex-row gap-4 mt-4">
                                <StatCard title="Total Revenue" value="₱16,050.89" change="+20.1%" positive={true} icon={PhilippinePeso} />
                                <StatCard title="Total Orders" value={String(initialData.length)} change="+5" positive={true} icon={PhilippinePeso} />
                            </div>
                        </Tabs>
                    </div>
                </div>

                {/* ── Table Panel ── */}
                <div className="rounded-xl bg-white overflow-hidden">

                    {/* Toolbar */}
                    <div className="p-4 sm:p-6 flex flex-col sm:flex-row gap-3 border-b border-gray-100">
                        <div className="flex items-center relative max-w-md w-full">
                            <Input
                                defaultValue={searchParams.get("query")?.toString()}
                                onChange={(e) => handleSearch(e.target.value)}
                                placeholder="Search by customer, address, payment…"
                                className="pr-10 w-full"
                            />
                            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        </div>
                        <div className="w-full sm:w-auto">
                            <Select onValueChange={handleSort} defaultValue={searchParams.get("sort") ?? "option1"}>
                                <SelectTrigger className="w-full sm:w-[180px]">
                                    <SelectValue placeholder="Sort by" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="option1">Newest First</SelectItem>
                                    <SelectItem value="option2">Customer A–Z</SelectItem>
                                    <SelectItem value="option3">Water Type</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <Button
                            onClick={() => router.push("/daily-logs/new")}
                            className="w-full sm:w-auto bg-[#2FA9D9] hover:bg-[#2195c0] ml-auto"
                        >
                            <Plus className="w-4 h-4 sm:mr-1" />
                            <span className="hidden sm:inline">Add an Entry</span>
                            <span className="sm:hidden">Add</span>
                        </Button>
                    </div>

                    {/* Status Tabs */}
                    <Tabs defaultValue="ongoing" className="w-full">
                        <div className="px-4 sm:px-6 pt-4 border-b border-gray-100">
                            <TabsList className="bg-transparent p-0 gap-0 h-auto border-0">
                                {/* Ongoing */}
                                <TabsTrigger
                                    value="ongoing"
                                    className="
                                        relative pb-3 px-4 rounded-none bg-transparent border-0 shadow-none
                                        text-gray-500 font-medium text-sm
                                        data-[state=active]:text-[#2FA9D9] data-[state=active]:shadow-none data-[state=active]:bg-transparent
                                        after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:rounded-full
                                        after:bg-transparent data-[state=active]:after:bg-[#2FA9D9]
                                        hover:text-gray-700 transition-colors
                                    "
                                >
                                    <Clock className="w-3.5 h-3.5 mr-1.5 inline-block" />
                                    Ongoing
                                    <TabCount count={ongoingLogs.length} color="bg-[#2FA9D9]/15 text-[#2FA9D9]" />
                                </TabsTrigger>

                                {/* Delivered */}
                                <TabsTrigger
                                    value="delivered"
                                    className="
                                        relative pb-3 px-4 rounded-none bg-transparent border-0 shadow-none
                                        text-gray-500 font-medium text-sm
                                        data-[state=active]:text-emerald-600 data-[state=active]:shadow-none data-[state=active]:bg-transparent
                                        after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:rounded-full
                                        after:bg-transparent data-[state=active]:after:bg-emerald-500
                                        hover:text-gray-700 transition-colors
                                    "
                                >
                                    <PackageCheck className="w-3.5 h-3.5 mr-1.5 inline-block" />
                                    Delivered
                                    <TabCount count={deliveredLogs.length} color="bg-emerald-100 text-emerald-700" />
                                </TabsTrigger>

                                {/* Cancelled */}
                                <TabsTrigger
                                    value="cancelled"
                                    className="
                                        relative pb-3 px-4 rounded-none bg-transparent border-0 shadow-none
                                        text-gray-500 font-medium text-sm
                                        data-[state=active]:text-rose-600 data-[state=active]:shadow-none data-[state=active]:bg-transparent
                                        after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:rounded-full
                                        after:bg-transparent data-[state=active]:after:bg-rose-500
                                        hover:text-gray-700 transition-colors
                                    "
                                >
                                    <PackageX className="w-3.5 h-3.5 mr-1.5 inline-block" />
                                    Cancelled
                                    <TabCount count={cancelledLogs.length} color="bg-rose-100 text-rose-700" />
                                </TabsTrigger>
                            </TabsList>
                        </div>

                        {/* Ongoing table */}
                        <TabsContent value="ongoing" className="m-0">
                            {ongoingLogs.length === 0 ? (
                                <EmptyState
                                    icon={<Clock className="w-10 h-10 text-gray-300" />}
                                    title="No ongoing orders"
                                    desc="Add a new entry to get started."
                                />
                            ) : (
                                <div className="overflow-x-auto">
                                    <div className="min-w-[800px] sm:min-w-0">
                                        <DataTable columns={ongoingColumns} data={ongoingLogs} />
                                    </div>
                                </div>
                            )}
                        </TabsContent>

                        {/* Delivered table */}
                        <TabsContent value="delivered" className="m-0">
                            {deliveredLogs.length === 0 ? (
                                <EmptyState
                                    icon={<PackageCheck className="w-10 h-10 text-gray-300" />}
                                    title="No delivered orders yet"
                                    desc="Mark ongoing orders as delivered using the ✓ button."
                                />
                            ) : (
                                <div className="overflow-x-auto">
                                    <div className="min-w-[800px] sm:min-w-0">
                                        <DataTable columns={deliveredColumns} data={deliveredLogs} />
                                    </div>
                                </div>
                            )}
                        </TabsContent>

                        {/* Cancelled table */}
                        <TabsContent value="cancelled" className="m-0">
                            {cancelledLogs.length === 0 ? (
                                <EmptyState
                                    icon={<PackageX className="w-10 h-10 text-gray-300" />}
                                    title="No cancelled orders"
                                    desc="Cancelled orders will appear here."
                                />
                            ) : (
                                <div className="overflow-x-auto">
                                    <div className="min-w-[800px] sm:min-w-0">
                                        <DataTable columns={cancelledColumns} data={cancelledLogs} />
                                    </div>
                                </div>
                            )}
                        </TabsContent>
                    </Tabs>
                </div>

                {/* ── View Modal ── */}
                <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
                    <DialogContent className="sm:max-w-md max-w-[95vw]">
                        <DialogHeader>
                            <DialogTitle className="text-lg sm:text-xl">Order Details</DialogTitle>
                        </DialogHeader>
                        {selectedLog && (
                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between border-b pb-2">
                                    <span className="text-gray-500">Date</span>
                                    <span className="text-right font-medium">
                                        {format(new Date(selectedLog.log_date), "MMMM d, yyyy")}
                                    </span>
                                </div>
                                <div className="flex justify-between border-b pb-2">
                                    <span className="text-gray-500">Status</span>
                                    <StatusBadge status={selectedLog.status ?? "ongoing"} />
                                </div>
                                <div className="flex justify-between border-b pb-2">
                                    <span className="text-gray-500">Customer</span>
                                    <span className="text-right font-medium">{selectedLog.customer_name || "—"}</span>
                                </div>
                                {selectedLog.customer_address && (
                                    <div className="flex justify-between border-b pb-2">
                                        <span className="text-gray-500">Address</span>
                                        <span className="text-right text-gray-700 max-w-[60%]">{selectedLog.customer_address}</span>
                                    </div>
                                )}
                                <div className="flex justify-between border-b pb-2">
                                    <span className="text-gray-500">Container Type</span>
                                    <Badge value={selectedLog.container_type} labels={CONTAINER_LABELS} colors={CONTAINER_COLORS} />
                                </div>
                                <div className="flex justify-between border-b pb-2">
                                    <span className="text-gray-500">Water Type</span>
                                    <Badge value={selectedLog.water_type} labels={WATER_LABELS} colors={WATER_COLORS} />
                                </div>
                                <div className="flex justify-between border-b pb-2">
                                    <span className="text-gray-500">Payment Method</span>
                                    <Badge value={selectedLog.payment_method} labels={PAYMENT_LABELS} colors={PAYMENT_COLORS} />
                                </div>
                                <div className="flex justify-between pb-2">
                                    <span className="text-gray-500">Fulfillment</span>
                                    <span className="font-medium">
                                        {FULFILLMENT_LABELS[selectedLog.fulfillment_type] ?? selectedLog.fulfillment_type}
                                    </span>
                                </div>
                            </div>
                        )}
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsViewModalOpen(false)} className="w-full sm:w-auto">
                                Close
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* ── Delete Modal ── */}
                <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
                    <DialogContent className="sm:max-w-md max-w-[95vw]">
                        <DialogHeader>
                            <DialogTitle className="text-lg sm:text-xl">Delete Entry</DialogTitle>
                        </DialogHeader>
                        <p className="text-sm text-gray-600">
                            This action cannot be undone. Are you sure you want to delete this log entry?
                        </p>
                        <DialogFooter className="flex-col sm:flex-row gap-2">
                            <Button type="button" variant="outline" onClick={() => setIsDeleteModalOpen(false)} className="w-full sm:w-auto">
                                Cancel
                            </Button>
                            <Button type="button" variant="destructive" onClick={handleDelete} disabled={isDeleting} className="w-full sm:w-auto">
                                {isDeleting ? "Deleting…" : "Delete"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* ── Status Change Modal ── */}
                <StatusModal
                    open={isStatusModalOpen}
                    onClose={() => setIsStatusModalOpen(false)}
                    onConfirm={handleStatusChange}
                    isLoading={isUpdatingStatus}
                    targetStatus={pendingStatus}
                    logName={selectedLog?.customer_name ?? "this order"}
                />
            </div>

            <PrintableDailyLogs logs={initialData} />
        </>
    );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-4">
            {icon}
            <p className="text-gray-600 font-medium">{title}</p>
            <p className="text-gray-400 text-sm">{desc}</p>
        </div>
    );
}

// ─── Status badge for view modal ─────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
    const map: Record<string, { label: string; class: string }> = {
        ongoing:   { label: "⏳ Ongoing",   class: "bg-sky-100 text-sky-700"       },
        delivered: { label: "✅ Delivered",  class: "bg-emerald-100 text-emerald-700" },
        cancelled: { label: "❌ Cancelled",  class: "bg-rose-100 text-rose-700"     },
    };
    const { label, class: cls } = map[status] ?? map.ongoing;
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
            {label}
        </span>
    );
}
