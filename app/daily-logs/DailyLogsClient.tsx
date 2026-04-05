"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useDebouncedCallback } from "use-debounce";
import {
    PhilippinePeso, Plus, Search, Trash, Eye,
    CheckCircle2, XCircle, RotateCcw, Clock, PackageCheck, PackageX, Package,
    Edit, MapPin
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { format } from "date-fns";

import DataTable, { type Column } from "@/features/daily-logs/components/DataTable";
import StatCard from "@/features/daily-logs/components/StatCard";
import PrintableDailyLogs from "@/features/daily-logs/components/PrintableDailyLogs";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { deleteLog, updateLogStatus, deleteSession, updateSession, createLogsBulk } from "@/app/actions/logs";
import { getCustomers, type Customer } from "@/app/actions/customers";

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
    session_id: string | null;
    session_address: string | null;
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

function SessionCard({ group, ongoingCols, deliveredCols, cancelledCols }: { 
    group: any, 
    ongoingCols: Column<DailyLog>[],
    deliveredCols: Column<DailyLog>[],
    cancelledCols: Column<DailyLog>[]
}) {
    const [isExpanded, setIsExpanded] = useState(false);

    const ongoing = group.logs.filter((l: DailyLog) => !l.status || l.status === "ongoing");
    const delivered = group.logs.filter((l: DailyLog) => l.status === "delivered");
    const cancelled = group.logs.filter((l: DailyLog) => l.status === "cancelled");

    return (
        <div className="border border-gray-100 rounded-xl mb-4 overflow-hidden shadow-sm bg-white hover:border-[#2FA9D9]/30 transition-all">
            <div 
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between cursor-pointer hover:bg-gray-50 bg-white"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-[#2FA9D9]/10 flex items-center justify-center shrink-0">
                        <Package className="w-5 h-5 text-[#2FA9D9]" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-[#2FA9D9]">{group.sessionId}</span>
                            <span className="text-xs text-gray-400 font-medium">{format(new Date(group.date), "MMM d, yyyy")}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-sm text-gray-600 mt-0.5">
                            <div className="flex items-center gap-1">
                                <span className="font-semibold text-gray-900">{group.logs.length}</span>
                                <span className="text-gray-400">orders in this session</span>
                            </div>
                            <span className="text-gray-300 mx-1.5 inline-block h-3 w-[1px] bg-gray-200"></span>
                            <span className="truncate max-w-[300px] text-gray-500">{group.address}</span>
                        </div>
                    </div>
                </div>
                <div className="mt-3 sm:mt-0 flex items-center gap-2">
                    <Button
                        variant="ghost" size="sm"
                        onClick={(e) => {
                            e.stopPropagation();
                            group.onEdit(group.sessionId, group.address);
                        }}
                        className="text-gray-500 hover:text-[#2FA9D9] hover:bg-[#2FA9D9]/5"
                        title="Edit Session Address"
                    >
                        <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                        variant="ghost" size="sm"
                        onClick={(e) => {
                            e.stopPropagation();
                            group.onDelete(group.sessionId);
                        }}
                        className="text-rose-500 hover:text-rose-600 hover:bg-rose-50"
                        title="Delete Session"
                    >
                        <Trash className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="hidden sm:inline-flex text-[#2FA9D9]">
                        {isExpanded ? "Hide Details" : "Manage Session"}
                        {isExpanded ? <RotateCcw className="w-3.5 h-3.5 ml-1.5 rotate-45" /> : <Eye className="w-3.5 h-3.5 ml-1.5" />}
                    </Button>
                </div>
            </div>
            
            {isExpanded && (
                <div className="border-t border-gray-50 bg-gray-50/10">
                    <Tabs defaultValue="ongoing" className="w-full">
                        <div className="px-4 border-b border-gray-100 bg-white">
                            <TabsList className="bg-transparent p-0 gap-0 h-auto border-0">
                                <TabsTrigger value="ongoing" className="relative pb-2 px-3 rounded-none text-xs data-[state=active]:text-[#2FA9D9] data-[state=active]:shadow-none after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-transparent data-[state=active]:after:bg-[#2FA9D9]">
                                    Ongoing ({ongoing.length})
                                </TabsTrigger>
                                <TabsTrigger value="delivered" className="relative pb-2 px-3 rounded-none text-xs data-[state=active]:text-emerald-600 data-[state=active]:shadow-none after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-transparent data-[state=active]:after:bg-emerald-500">
                                    Delivered ({delivered.length})
                                </TabsTrigger>
                                <TabsTrigger value="cancelled" className="relative pb-2 px-3 rounded-none text-xs data-[state=active]:text-rose-600 data-[state=active]:shadow-none after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-transparent data-[state=active]:after:bg-rose-500">
                                    Cancelled ({cancelled.length})
                                </TabsTrigger>
                            </TabsList>
                        </div>

                        <TabsContent value="ongoing" className="m-0 p-2 sm:p-4">
                            {ongoing.length === 0 ? (
                                <div className="py-8 text-center text-gray-400 text-xs">No ongoing orders in this session</div>
                            ) : (
                                <div className="overflow-x-auto rounded-lg border border-gray-100 bg-white">
                                    <DataTable columns={ongoingCols} data={ongoing} />
                                </div>
                            )}
                        </TabsContent>

                        <TabsContent value="delivered" className="m-0 p-2 sm:p-4">
                            {delivered.length === 0 ? (
                                <div className="py-8 text-center text-gray-400 text-xs">No delivered orders in this session</div>
                            ) : (
                                <div className="overflow-x-auto rounded-lg border border-gray-100 bg-white">
                                    <DataTable columns={deliveredCols} data={delivered} />
                                </div>
                            )}
                        </TabsContent>

                        <TabsContent value="cancelled" className="m-0 p-2 sm:p-4">
                            {cancelled.length === 0 ? (
                                <div className="py-8 text-center text-gray-400 text-xs">No cancelled orders in this session</div>
                            ) : (
                                <div className="overflow-x-auto rounded-lg border border-gray-100 bg-white">
                                    <DataTable columns={cancelledCols} data={cancelled} />
                                </div>
                            )}
                        </TabsContent>
                    </Tabs>
                </div>
            )}
        </div>
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
    const [isDeleteSessionModalOpen, setIsDeleteSessionModalOpen] = useState(false);
    const [isEditSessionModalOpen,   setIsEditSessionModalOpen]   = useState(false);
    const [selectedLog,       setSelectedLog]       = useState<DailyLog | null>(null);
    const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
    const [editSessionAddress, setEditSessionAddress] = useState("");
    const [pendingStatus,     setPendingStatus]     = useState<OrderStatus | null>(null);

    // Session State
    const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
    const [stagedLogs, setStagedLogs] = useState<any[]>([]);
    const [isSavingSession, setIsSavingSession] = useState(false);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);
    const [customerSearch, setCustomerSearch] = useState("");
    const [sessionData, setSessionData] = useState({ 
        id: "", 
        address: "",
        customerName: "",
        customerId: ""
    });

    // Detect redirect back from /new with session info
    useEffect(() => {
        const sessionOpen = searchParams.get("sessionOpen");
        if (sessionOpen === "true") {
            const id = searchParams.get("sessionId") || "";
            const addr = searchParams.get("address") || "";
            const name = searchParams.get("customerName") || "";
            const cId = searchParams.get("customerId") || "";
            
            setSessionData({ id, address: addr, customerName: name, customerId: cId });
            setIsSessionModalOpen(true);
            
            // Clear URL params without reloading to keep UI clean
            const url = new URL(window.location.href);
            url.searchParams.delete("sessionOpen");
            window.history.replaceState({}, "", url);
        }
        
        // Load staged logs from storage
        const staged = JSON.parse(sessionStorage.getItem("staged_session_logs") || "[]");
        setStagedLogs(staged);
    }, [searchParams]);

    useEffect(() => {
        setIsLoadingCustomers(true);
        getCustomers()
            .then(setCustomers)
            .catch(console.error)
            .finally(() => setIsLoadingCustomers(false));
    }, []);

    const filteredCustomers = customers.filter((c) =>
        c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
        (c.address ?? "").toLowerCase().includes(customerSearch.toLowerCase())
    );

    const generateSessionId = () => {
        const now = new Date();
        const yyyymmdd = format(now, "yyyyMMdd");
        const hhmmss = format(now, "HHmmss");
        return `SESS-${yyyymmdd}-${hhmmss}`;
    };

    const handleOpenSessionModal = () => {
        // If we already have staged logs, just open
        if (stagedLogs.length > 0) {
            setIsSessionModalOpen(true);
            return;
        }

        setSessionData({ 
            id: generateSessionId(), 
            address: "",
            customerName: "",
            customerId: ""
        });
        setCustomerSearch("");
        setIsSessionModalOpen(true);
    };

    const handleStartAddingToSession = () => {
        if (!sessionData.address || !sessionData.customerName) return;
        setIsSessionModalOpen(false);
        const params = new URLSearchParams({
            sessionId: sessionData.id,
            address: sessionData.address,
            customerName: sessionData.customerName,
            customerId: sessionData.customerId
        });
        router.push(`/daily-logs/new?${params.toString()}`);
    };

    const handleFinishSession = async () => {
        if (stagedLogs.length === 0) return;
        setIsSavingSession(true);
        try {
            const result = await createLogsBulk(stagedLogs);
            if (result.success) {
                sessionStorage.removeItem("staged_session_logs");
                setStagedLogs([]);
                setIsSessionModalOpen(false);
                router.refresh();
            }
        } catch (err) {
            console.error("Bulk save failed:", err);
        } finally {
            setIsSavingSession(false);
        }
    };

    const handleClearStaging = () => {
        sessionStorage.removeItem("staged_session_logs");
        setStagedLogs([]);
        setIsSessionModalOpen(false);
    };

    const handleRemoveStagedLog = (index: number) => {
        const updated = [...stagedLogs];
        updated.splice(index, 1);
        setStagedLogs(updated);
        sessionStorage.setItem("staged_session_logs", JSON.stringify(updated));
    };

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

    const handleOpenDeleteSession = (sessionId: string) => {
        setSelectedSessionId(sessionId);
        setIsDeleteSessionModalOpen(true);
    };

    const handleDeleteSession = async () => {
        if (!selectedSessionId) return;
        setIsDeleting(true);
        try {
            const result = await deleteSession(selectedSessionId);
            if (result.success) { setIsDeleteSessionModalOpen(false); setSelectedSessionId(null); router.refresh(); }
        } catch (err) { console.error(err); }
        finally { setIsDeleting(false); }
    };

    const handleOpenEditSession = (sessionId: string, currentAddress: string) => {
        setSelectedSessionId(sessionId);
        setEditSessionAddress(currentAddress);
        setIsEditSessionModalOpen(true);
    };

    const handleUpdateSession = async () => {
        if (!selectedSessionId || !editSessionAddress) return;
        setIsUpdatingStatus(true);
        try {
            const result = await updateSession(selectedSessionId, editSessionAddress);
            if (result.success) { setIsEditSessionModalOpen(false); setSelectedSessionId(null); router.refresh(); }
        } catch (err) { console.error(err); }
        finally { setIsUpdatingStatus(false); }
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

    // ── Grouping Logic ───────────────────────────────────────────────────────
    
    type SessionGroup = {
        sessionId: string;
        address: string;
        date: string;
        logs: DailyLog[];
        onDelete: (id: string) => void;
        onEdit: (id: string, address: string) => void;
    };

    const groupLogsBySession = (logs: DailyLog[]): SessionGroup[] => {
        const groups: Record<string, SessionGroup> = {};
        
        logs.forEach(log => {
            const sid = log.session_id || `LEGACY-${log.id}`;
            if (!groups[sid]) {
                groups[sid] = {
                    sessionId: sid,
                    address: log.session_address || log.customer_address || "No Address",
                    date: log.log_date,
                    logs: [],
                    onDelete: handleOpenDeleteSession,
                    onEdit: handleOpenEditSession
                };
            }
            groups[sid].logs.push(log);
        });
        
        return Object.values(groups).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    };

    const allSessions = groupLogsBySession(initialData);

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
                            onClick={handleOpenSessionModal}
                            className="w-full sm:w-auto bg-[#2FA9D9] hover:bg-[#2195c0] ml-auto"
                        >
                            <Plus className="w-4 h-4 sm:mr-1" />
                            <span className="hidden sm:inline">Add an Entry</span>
                            <span className="sm:hidden">Add</span>
                        </Button>
                    </div>

                    {/* All Sessions List */}
                    <div className="p-4 sm:p-6">
                        {allSessions.length === 0 ? (
                            <div className="py-20 text-center">
                                <Clock className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                                <h3 className="text-gray-500 font-medium">No sessions found</h3>
                                <p className="text-gray-400 text-sm mt-1">Start a new session to begin logging orders.</p>
                            </div>
                        ) : (
                            allSessions.map(group => (
                                <SessionCard 
                                    key={group.sessionId} 
                                    group={group} 
                                    ongoingCols={ongoingColumns}
                                    deliveredCols={deliveredColumns}
                                    cancelledCols={cancelledColumns}
                                />
                            ))
                        )}
                    </div>
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

            {/* ── New Session Modal ── */}
            <Dialog open={isSessionModalOpen} onOpenChange={setIsSessionModalOpen}>
                <DialogContent className="sm:max-w-md max-w-[95vw] overflow-hidden flex flex-col max-h-[90vh]">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold">
                            {stagedLogs.length > 0 ? "Active Session" : "Start New Session"}
                        </DialogTitle>
                    </DialogHeader>
                    
                    <div className="flex-1 overflow-y-auto pr-1 -mr-1 py-4 space-y-6">
                        {/* Session Details Summary */}
                        <div className="space-y-3">
                            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Session Context</label>
                            <div className="p-4 bg-gray-50 border rounded-2xl space-y-2">
                                <div className="flex justify-between items-center bg-white p-2 rounded-lg border border-gray-100">
                                    <span className="text-[10px] text-gray-400 font-mono">ID: {sessionData.id}</span>
                                    {stagedLogs.length > 0 && (
                                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-100 text-sky-700 font-bold">
                                            {stagedLogs.length} ITEM{stagedLogs.length > 1 ? "S" : ""} STAGED
                                        </span>
                                    )}
                                </div>
                                {sessionData.customerName && (
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-[#2FA9D9]/10 flex items-center justify-center shrink-0">
                                            <MapPin className="w-4 h-4 text-[#2FA9D9]" />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="text-sm font-bold text-gray-900 truncate">{sessionData.customerName}</div>
                                            <div className="text-[10px] text-gray-500 truncate">{sessionData.address}</div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Staged Logs Summary List */}
                        {stagedLogs.length > 0 && (
                            <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2">
                                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Staged Items</label>
                                <div className="space-y-2">
                                    {stagedLogs.map((log, idx) => (
                                        <div key={idx} className="flex items-center gap-3 p-3 bg-white border border-gray-100 rounded-xl hover:border-[#2FA9D9]/30 transition-all group">
                                            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 text-[10px] font-bold">
                                                #{idx + 1}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-1.5 capitalize text-xs font-semibold text-gray-800">
                                                    <span>{log.container_type}</span>
                                                    <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                                                    <span>{log.water_type}</span>
                                                </div>
                                                <div className="text-[10px] text-gray-400 mt-0.5">
                                                    {log.payment_method} • {log.fulfillment_type}
                                                </div>
                                            </div>
                                            <Button 
                                                variant="ghost" size="sm" 
                                                className="h-7 w-7 p-0 text-gray-300 hover:text-rose-500 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-all"
                                                onClick={() => handleRemoveStagedLog(idx)}
                                            >
                                                <XCircle className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Initial Customer Selection (only if no items staged yet) */}
                        {stagedLogs.length === 0 && !sessionData.customerName && (
                            <div className="space-y-3">
                                <label className="text-sm font-medium text-gray-700">Select Customer / Location</label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <Input
                                        placeholder="Search by customer name or address…"
                                        className="pl-9 h-11"
                                        value={customerSearch}
                                        onChange={(e) => setCustomerSearch(e.target.value)}
                                    />
                                </div>

                                <div className="max-h-[200px] overflow-y-auto space-y-1 pr-1 border rounded-xl p-1 bg-gray-50/50">
                                    {isLoadingCustomers ? (
                                        <div className="py-8 text-center text-sm text-gray-400">Loading customers…</div>
                                    ) : filteredCustomers.length === 0 ? (
                                        <div className="py-8 text-center text-sm text-gray-400 italic">No customers found</div>
                                    ) : (
                                        filteredCustomers.map((c) => (
                                            <button
                                                key={c.id}
                                                onClick={() => setSessionData(p => ({
                                                    ...p,
                                                    customerName: c.name,
                                                    customerId: c.id,
                                                    address: c.address ?? "No Address Provided"
                                                }))}
                                                className="w-full p-3 rounded-lg text-left hover:bg-[#2FA9D9]/5 hover:border-[#2FA9D9]/20 border border-transparent transition-all group"
                                            >
                                                <div className="font-semibold text-sm group-hover:text-[#2FA9D9]">{c.name}</div>
                                                <div className="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5 truncate">
                                                    <MapPin className="w-2.5 h-2.5" />
                                                    {c.address ?? "No Address"}
                                                </div>
                                            </button>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Manual Address Confirmation (only for new session setup) */}
                        {stagedLogs.length === 0 && sessionData.customerName && (
                            <div className="space-y-2 animate-in fade-in zoom-in-95">
                                <label className="text-sm font-medium text-gray-700">Confirm Session address</label>
                                <Input
                                    value={sessionData.address}
                                    onChange={(e) => setSessionData(p => ({ ...p, address: e.target.value }))}
                                    placeholder="Verify address…"
                                    className="h-11"
                                />
                                <p className="text-[10px] text-gray-400 px-1">This address will be applied to all logs in this session.</p>
                            </div>
                        )}
                    </div>

                    <DialogFooter className="pt-4 border-t border-gray-100 flex-col sm:flex-row gap-2">
                        {stagedLogs.length > 0 ? (
                            <>
                                <Button 
                                    variant="ghost" 
                                    onClick={handleClearStaging} 
                                    className="w-full sm:w-auto text-rose-500 hover:text-rose-600 hover:bg-rose-50"
                                >
                                    Discard Session
                                </Button>
                                <div className="flex-1 shrink-0" />
                                <Button
                                    variant="outline"
                                    onClick={handleStartAddingToSession}
                                    className="w-full sm:w-auto border-[#2FA9D9] text-[#2FA9D9] hover:bg-[#2FA9D9]/5"
                                >
                                    <Plus className="w-4 h-4 mr-1.5" />
                                    Add Another Log
                                </Button>
                                <Button
                                    onClick={handleFinishSession}
                                    disabled={isSavingSession}
                                    className="w-full sm:w-auto bg-[#2FA9D9] hover:bg-[#2195c0] text-white shadow-lg shadow-[#2FA9D9]/20"
                                >
                                    {isSavingSession ? "Saving…" : "Finish Session & Save All"}
                                </Button>
                            </>
                        ) : (
                            <>
                                <Button variant="outline" onClick={() => setIsSessionModalOpen(false)} className="w-full sm:w-auto">
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleStartAddingToSession}
                                    disabled={!sessionData.address || !sessionData.customerName}
                                    className="w-full sm:w-auto bg-[#2FA9D9] hover:bg-[#2195c0] text-white shadow-lg shadow-[#2FA9D9]/20"
                                >
                                    <Plus className="w-4 h-4 mr-1.5" />
                                    Start Session & Add Log
                                </Button>
                            </>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Delete Session Modal ── */}
            <Dialog open={isDeleteSessionModalOpen} onOpenChange={setIsDeleteSessionModalOpen}>
                <DialogContent className="sm:max-w-md max-w-[95vw]">
                    <DialogHeader>
                        <DialogTitle className="text-lg sm:text-xl font-bold text-rose-600">Delete Entire Session</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3">
                        <p className="text-sm text-gray-600 leading-relaxed">
                            Are you sure you want to delete session <span className="font-mono font-bold text-gray-900">{selectedSessionId}</span>?
                        </p>
                        <div className="p-3 bg-rose-50 border border-rose-100 rounded-lg">
                            <p className="text-xs text-rose-700 font-medium">
                                ⚠️ This will permanently delete all logs associated with this session. This action cannot be undone.
                            </p>
                        </div>
                    </div>
                    <DialogFooter className="flex-col sm:flex-row gap-2 mt-4">
                        <Button type="button" variant="outline" onClick={() => setIsDeleteSessionModalOpen(false)} className="w-full sm:w-auto">
                            Cancel
                        </Button>
                        <Button 
                            type="button" 
                            variant="destructive" 
                            onClick={handleDeleteSession} 
                            disabled={isDeleting} 
                            className="w-full sm:w-auto bg-rose-600 hover:bg-rose-700 font-bold"
                        >
                            {isDeleting ? "Deleting…" : "Yes, Delete Everything"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Edit Session Modal ── */}
            <Dialog open={isEditSessionModalOpen} onOpenChange={setIsEditSessionModalOpen}>
                <DialogContent className="sm:max-w-md max-w-[95vw]">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold">Edit Session Address</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Session ID</label>
                            <div className="p-3 bg-gray-50 border rounded-lg font-mono text-sm text-gray-500">
                                {selectedSessionId}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">New Session Address</label>
                            <Input
                                placeholder="Enter updated address…"
                                value={editSessionAddress}
                                onChange={(e) => setEditSessionAddress(e.target.value)}
                                className="w-full"
                            />
                            <p className="text-[10px] text-gray-400">Updating this will update the address for all logs in this session.</p>
                        </div>
                    </div>
                    <DialogFooter className="flex-col sm:flex-row gap-2">
                        <Button variant="outline" onClick={() => setIsEditSessionModalOpen(false)} className="w-full sm:w-auto">
                            Cancel
                        </Button>
                        <Button
                            onClick={handleUpdateSession}
                            disabled={!editSessionAddress || isUpdatingStatus}
                            className="w-full sm:w-auto bg-[#2FA9D9] hover:bg-[#2195c0] text-white"
                        >
                            {isUpdatingStatus ? "Updating…" : "Update Session Address"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

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
