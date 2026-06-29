"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useDebouncedCallback } from "use-debounce";
import {
    PhilippinePeso, Plus, Search, Trash, Eye,
    CheckCircle2, XCircle, RotateCcw, Clock, PackageCheck, Package,
    Edit, MapPin, Printer
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { format } from "date-fns";

import DataTable, { type Column } from "@/components/DataTable";
import StatCard from "@/features/orders/components/StatCard";
import PrintableOrders from "@/features/orders/components/PrintableOrders";
import PageContainer from "@/components/PageContainer";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { deleteLog, updateLogStatus, deleteSession, updateSession, updateSessionStatus } from "@/app/actions/logs";
import { getCustomers, type Customer } from "@/app/actions/customers";
import { recordPayment } from "@/app/actions/payments";

// ─── Types ────────────────────────────────────────────────────────────────────

type OrderStatus = "ongoing" | "delivered" | "cancelled";

type Order = {
    id: number;
    log_date: string;
    container_type: string;
    water_type: string;
    quantity: number;
    price_per_gallon: number | null;
    total_gallons: number | null;
    total_price: number | null;
    customer_id: string | null;
    customer_name: string;
    customer_address: string;
    fulfillment_type: string;
    status: OrderStatus | null;
    session_id: string | null;
    order_sessions?: {
        status: string;
        address: string;
        payments?: { amount: number }[];
    } | null;
};

type SessionGroup = {
    sessionId: string;
    customerName: string;
    address: string;
    date: string;
    status: string;
    totalOwed: number;
    totalPaid: number;
    balance: number;
    paymentStatus: string;
    logs: Order[];
    onDelete: (id: string) => void;
    onEdit: (id: string, address: string) => void;
    onStatusChange: (id: string, status: string) => void;
};



// ─── Label / color maps ───────────────────────────────────────────────────────

const CONTAINER_LABELS: Record<string, string> = { round: "Round", flat: "Flat" };
const WATER_LABELS: Record<string, string> = { alkaline: "Alkaline", mineral: "Mineral" };
const PAYMENT_LABELS: Record<string, string> = {
    gcash: "GCash", cash: "Cash", bank_transfer: "Bank Transfer", credit: "Credit / Card",
};
const FULFILLMENT_LABELS: Record<string, string> = {
    delivery: "Delivery", pickup: "Pick-up",
};

const PAYMENT_COLORS: Record<string, string> = {
    gcash: "bg-blue-100 text-blue-700", cash: "bg-green-100 text-green-700",
    bank_transfer: "bg-purple-100 text-purple-700", credit: "bg-amber-100 text-amber-700",
};
const PAYMENT_STATUS_LABELS: Record<string, string> = {
    paid: "Paid",
    partial: "Partial",
    unpaid: "Unpaid",
};
const PAYMENT_STATUS_COLORS: Record<string, string> = {
    paid: "bg-green-100 text-green-700",
    partial: "bg-amber-100 text-amber-700",
    unpaid: "bg-red-100 text-red-700",
};
const WATER_COLORS: Record<string, string> = {
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

// ─── Tally Modal ──────────────────────────────────────────────────────────────

function TallyModal({ open, onClose, logs }: { open: boolean; onClose: () => void; logs: Order[] }) {
    if (!open) return null;

    // Filter out cancelled logs for tally
    const activeLogs = logs.filter((l) => l.status !== "cancelled");

    // Group by water_type + container_type
    const tallyMap: Record<string, { water: string; container: string; quantity: number; totalGallons: number; totalPrice: number; count: number }> = {};

    activeLogs.forEach((log) => {
        const key = `${log.water_type}-${log.container_type}`;
        if (!tallyMap[key]) {
            tallyMap[key] = {
                water: log.water_type,
                container: log.container_type,
                quantity: 0,
                totalGallons: 0,
                totalPrice: 0,
                count: 0,
            };
        }
        const wType = log.water_type || "mineral";
        const cType = log.container_type || "round";
        const quantity = log.quantity ?? 1;
        const gal = cType === "round" || cType === "flat" ? 5 : 5;
        const pricePerGal = wType === "alkaline" ? 50 : 35;
        const calcPrice = (quantity) * gal * pricePerGal;
        const calcGallons = (quantity) * gal;

        tallyMap[key].quantity += quantity;
        tallyMap[key].totalGallons += log.total_gallons ?? calcGallons;
        tallyMap[key].totalPrice += log.total_price ?? calcPrice;
        tallyMap[key].count += 1;
    });

    const tallyItems = Object.values(tallyMap);
    const grandTotal = tallyItems.reduce((sum, item) => sum + item.totalPrice, 0);
    const totalOrders = activeLogs.length;

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-lg max-w-[95vw]">
                <DialogHeader>
                    <DialogTitle className="text-lg font-bold flex items-center gap-2">
                        <PackageCheck className="w-5 h-5 text-emerald-600" />
                        Session Tally
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Summary cards */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 rounded-xl bg-gradient-to-br from-[#2FA9D9]/5 to-[#76D4F9]/5 border border-[#2FA9D9]/20">
                            <div className="text-xs text-gray-500">Total Orders</div>
                            <div className="text-2xl font-bold text-[#2FA9D9]">{totalOrders}</div>
                        </div>
                        <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-50/50 border border-emerald-200">
                            <div className="text-xs text-gray-500">Grand Total</div>
                            <div className="text-2xl font-bold text-emerald-600">₱{grandTotal.toLocaleString()}</div>
                        </div>
                    </div>

                    {/* Tally breakdown */}
                    {tallyItems.length > 0 ? (
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Breakdown by Type</label>
                            {tallyItems.map((item, idx) => (
                                <div key={idx} className="p-3 rounded-xl bg-white border border-gray-100">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <Badge value={item.container} labels={CONTAINER_LABELS} colors={CONTAINER_COLORS} />
                                            <Badge value={item.water} labels={WATER_LABELS} colors={WATER_COLORS} />
                                        </div>
                                        <span className="text-xs text-gray-400">{item.count} order{item.count > 1 ? "s" : ""}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-500">
                                            {item.quantity} containers × {item.totalGallons} gal total
                                        </span>
                                        <span className="font-bold text-[#2FA9D9]">
                                            ₱{item.totalPrice.toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="py-8 text-center text-gray-400 text-sm">
                            No active orders to tally
                        </div>
                    )}
                </div>

                <DialogFooter className="pt-4 border-t border-gray-100">
                    <Button variant="outline" onClick={onClose} className="w-full">
                        Close
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ─── Payment Modal ────────────────────────────────────────────────────────────

function PaymentModal({
    open,
    onClose,
    sessionGroup,
    onSuccess
}: {
    open: boolean;
    onClose: () => void;
    sessionGroup: SessionGroup | null;
    onSuccess: () => void;
}) {
    const [amount, setAmount] = useState<string>("");
    const [method, setMethod] = useState("cash");
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (open && sessionGroup) {
            setAmount(sessionGroup.balance.toString());
            setMethod("cash");
        }
    }, [open, sessionGroup]);

    if (!open || !sessionGroup) return null;

    const handleSubmit = async () => {
        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount <= 0) return;

        setIsSubmitting(true);
        try {
            const result = await recordPayment({
                session_id: sessionGroup.sessionId,
                amount: numAmount,
                method
            });
            if (result?.success) {
                onSuccess();
                onClose();
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-sm max-w-[95vw]">
                <DialogHeader>
                    <DialogTitle>Settle Balance</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2 text-sm">
                    <div className="flex justify-between border-b pb-2">
                        <span className="text-gray-500">Remaining Balance</span>
                        <span className="font-bold text-lg text-amber-600">₱{sessionGroup.balance.toLocaleString()}</span>
                    </div>
                    <div className="space-y-2">
                        <label className="text-gray-500 text-xs">Payment Amount (₱)</label>
                        <Input
                            type="number"
                            min="1"
                            step="0.01"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-gray-500 text-xs">Payment Method</label>
                        <Select value={method} onValueChange={setMethod}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="cash">Cash</SelectItem>
                                <SelectItem value="gcash">GCash</SelectItem>
                                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter className="mt-4">
                    <Button variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={isSubmitting || parseFloat(amount) <= 0} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                        {isSubmitting ? "Recording..." : "Record Payment"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}


// ─── Helper Functions ─────────────────────────────────────────────────────────

function calculateLogPrice(log: Order): number {
    if (log.total_price !== null && log.total_price !== undefined) return log.total_price;
    // Fallback calculation for older logs
    const quantity = log.quantity ?? 1;
    const wType = log.water_type || "mineral";
    const cType = log.container_type || "round";
    const gal = cType === "round" || cType === "flat" ? 5 : 5;
    const pricePerGal = wType === "alkaline" ? 50 : 35;
    return quantity * gal * pricePerGal;
}

// ─── Shared column builders ───────────────────────────────────────────────────

function buildBaseColumns(getPaymentStatus?: (item: Order) => string): Column<Order>[] {
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
            render: (value, item: Order) => (
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
            title: "Qty",
            key: "quantity",
            render: (value) => (
                <span className="font-semibold text-sm text-gray-800">{value ?? "—"}</span>
            ),
        },
        {
            title: "Water",
            key: "water_type",
            render: (value) => <Badge value={String(value)} labels={WATER_LABELS} colors={WATER_COLORS} />,
        },
        {
            title: "Price/gal",
            key: "price_per_gallon",
            render: (value) => (
                <span className="text-sm text-gray-700">{value ? `₱${value}` : "—"}</span>
            ),
        },
        {
            title: "Total",
            key: "total_price",
            render: (value, item: Order) => {
                const total = item.total_price ?? 0;
                return (
                    <span className="font-bold text-sm text-[#2FA9D9]">
                        ₱{total.toLocaleString()}
                    </span>
                );
            },
        },
        {
            title: "Payment",
            key: "session_id",
            render: (_value, item: Order) => {
                const paymentStatus = getPaymentStatus
                    ? getPaymentStatus(item)
                    : (() => {
                        const sessionStatus = item.order_sessions?.status ?? null;
                        return sessionStatus === "completed" ? "paid"
                            : sessionStatus === "ongoing" ? "partial"
                                : "unpaid";
                    })();
                return <Badge value={paymentStatus} labels={PAYMENT_STATUS_LABELS} colors={PAYMENT_STATUS_COLORS} />;
            },
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


// ─── Main Component ───────────────────────────────────────────────────────────

export default function OrdersClient({ initialData }: { initialData: Order[] }) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // Modals
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
    const [isDeleteSessionModalOpen, setIsDeleteSessionModalOpen] = useState(false);
    const [isEditSessionModalOpen, setIsEditSessionModalOpen] = useState(false);
    const [selectedLog, setSelectedLog] = useState<Order | null>(null);
    const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
    const [editSessionAddress, setEditSessionAddress] = useState("");
    const [pendingStatus, setPendingStatus] = useState<OrderStatus | null>(null);
    const [selectedSessionForDetails, setSelectedSessionForDetails] = useState<SessionGroup | null>(null);
    const [isSessionDetailsModalOpen, setIsSessionDetailsModalOpen] = useState(false);
    const [selectedSessionForTally, setSelectedSessionForTally] = useState<SessionGroup | null>(null);
    const [isTallyModalOpen, setIsTallyModalOpen] = useState(false);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

    // Session State
    const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
    const statTab = "today";
    const [sessionListTab, setSessionListTab] = useState("ongoing");
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);
    const [customerSearch, setCustomerSearch] = useState("");
    const [isManualInput, setIsManualInput] = useState(false);

    const [sessionData, setSessionData] = useState({
        id: "",
        address: "",
        customerName: "",
        customerId: ""
    });

    useEffect(() => {
        setIsLoadingCustomers(true);
        getCustomers()
            .then(setCustomers)
            .catch(console.error)
            .finally(() => setIsLoadingCustomers(false));
    }, []);

    const filteredCustomers = customers.filter((c) =>
        c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
        (c.address ?? "").toLowerCase().includes(customerSearch.toLowerCase()) ||
        (c.phone ?? "").toLowerCase().includes(customerSearch.toLowerCase())
    );

    const generateSessionId = () => {
        const now = new Date();
        const yyyymmdd = format(now, "yyyyMMdd");
        const hhmmss = format(now, "HHmmss");
        return `SESS-${yyyymmdd}-${hhmmss}`;
    };

    const handleOpenSessionModal = () => {
        setSessionData({
            id: generateSessionId(),
            address: "",
            customerName: "",
            customerId: ""
        });
        setCustomerSearch("");
        setIsManualInput(false);
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
        router.push(`/orders/new?${params.toString()}`);
    };

    const handleCancelSession = () => {
        setSessionData({
            id: "",
            address: "",
            customerName: "",
            customerId: ""
        });
        setCustomerSearch("");
        setIsManualInput(false);
        setIsSessionModalOpen(false);
    };


    // ── Handlers ─────────────────────────────────────────────────────────────

    const handleOpenView = (log: Order) => { setSelectedLog(log); setIsViewModalOpen(true); };

    const handleOpenDelete = (log: Order) => { setSelectedLog(log); setIsDeleteModalOpen(true); };

    const handleOpenStatusChange = (log: Order, newStatus: OrderStatus) => {
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

    const handleSessionStatusChange = async (sessionId: string, status: string) => {
        setIsUpdatingStatus(true);
        try {
            const result = await updateSessionStatus(sessionId, status);
            if (result.success) { router.refresh(); }
        } catch (err) { console.error(err); }
        finally { setIsUpdatingStatus(false); }
    };

    // ── Grouping Logic ───────────────────────────────────────────────────────


    const groupLogsBySession = (logs: Order[]): SessionGroup[] => {
        const groups: Record<string, SessionGroup> = {};

        logs.forEach(log => {
            const sid = log.session_id || `LEGACY-${log.id}`;
            if (!groups[sid]) {
                const sessionPayments = log.order_sessions?.payments || [];
                const totalPaid = sessionPayments.reduce((sum, p) => sum + Number(p.amount), 0);

                groups[sid] = {
                    sessionId: sid,
                    customerName: log.customer_name || "Custom Customer",
                    address: log.order_sessions?.address || log.customer_address || "No Address",
                    date: log.log_date,
                    status: log.order_sessions?.status || "ongoing", // Default to first log's status or ongoing
                    totalOwed: 0,
                    totalPaid,
                    balance: 0,
                    paymentStatus: "unpaid",
                    logs: [],
                    onDelete: handleOpenDeleteSession,
                    onEdit: handleOpenEditSession,
                    onStatusChange: handleSessionStatusChange
                };
            }
            groups[sid].logs.push(log);
            groups[sid].totalOwed += calculateLogPrice(log);
        });

        const sortedGroups = Object.values(groups).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        sortedGroups.forEach(group => {
            group.balance = Math.max(0, group.totalOwed - group.totalPaid);
            if (group.totalOwed > 0 && group.totalPaid >= group.totalOwed) {
                group.paymentStatus = "paid";
            } else if (group.totalPaid > 0) {
                group.paymentStatus = "partial";
            } else {
                group.paymentStatus = "unpaid";
            }
        });
        return sortedGroups;
    };

    const allSessions = groupLogsBySession(initialData);

    const activeSessionDetails = selectedSessionForDetails
        ? allSessions.find(g => g.sessionId === selectedSessionForDetails.sessionId) || selectedSessionForDetails
        : null;

    const getPaymentStatus = (item: Order) => {
        const sessionGroup = allSessions.find(g => g.sessionId === item.session_id);
        return sessionGroup?.paymentStatus ?? "unpaid";
    };

    const handleSearch = useDebouncedCallback((term: string) => {
        const params = new URLSearchParams(searchParams.toString());
        if (term) {
            params.set("query", term);
        } else {
            params.delete("query");
        }
        router.push(`${pathname}?${params.toString()}`);
    }, 300);

    const handleSort = (value: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("sort", value);
        router.push(`${pathname}?${params.toString()}`);
    };

    // ── Column sets for each tab ─────────────────────────────────────────────

    const ongoingColumns: Column<Order>[] = [
        ...buildBaseColumns(getPaymentStatus),
        {
            title: "Actions",
            key: "id",
            render: (_v, item: Order) => (
                <div className="flex justify-end gap-1.5">
                    <Button
                        variant="outline" size="icon-sm"
                        onClick={() => handleOpenView(item)}
                        title="View details"
                        className="hover:text-[#2FA9D9]"
                    >
                        <Eye className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                        variant="outline" size="icon-sm"
                        onClick={() => handleOpenStatusChange(item, "delivered")}
                        title="Mark as Delivered"
                        className="hover:text-emerald-600"
                    >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                        variant="outline" size="icon-sm"
                        onClick={() => handleOpenStatusChange(item, "cancelled")}
                        title="Cancel Order"
                        className="hover:text-rose-600"
                    >
                        <XCircle className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                        variant="outline" size="icon-sm"
                        onClick={() => handleOpenDelete(item)}
                        title="Delete"
                        className="hover:text-rose-600"
                    >
                        <Trash className="w-3.5 h-3.5" />
                    </Button>
                </div>
            ),
        },
    ];

    const deliveredColumns: Column<Order>[] = [
        ...buildBaseColumns(getPaymentStatus),
        {
            title: "Actions",
            key: "id",
            render: (_v, item: Order) => (
                <div className="flex justify-end gap-1.5">
                    <Button variant="outline" size="icon-sm" onClick={() => handleOpenView(item)} title="View details" className="hover:text-[#2FA9D9]">
                        <Eye className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                        variant="outline" size="icon-sm"
                        onClick={() => handleOpenStatusChange(item, "ongoing")}
                        title="Restore to Ongoing"
                        className="hover:text-[#2FA9D9]"
                    >
                        <RotateCcw className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="outline" size="icon-sm" onClick={() => handleOpenDelete(item)} title="Delete" className="hover:text-rose-600">
                        <Trash className="w-3.5 h-3.5" />
                    </Button>
                </div>
            ),
        },
    ];

    const cancelledColumns: Column<Order>[] = [
        ...buildBaseColumns(getPaymentStatus),
        {
            title: "Actions",
            key: "id",
            render: (_v, item: Order) => (
                <div className="flex justify-end gap-1.5">
                    <Button variant="outline" size="icon-sm" onClick={() => handleOpenView(item)} title="View details" className="hover:text-[#2FA9D9]">
                        <Eye className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                        variant="outline" size="icon-sm"
                        onClick={() => handleOpenStatusChange(item, "ongoing")}
                        title="Restore to Ongoing"
                        className="hover:text-[#2FA9D9]"
                    >
                        <RotateCcw className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="outline" size="icon-sm" onClick={() => handleOpenDelete(item)} title="Delete" className="hover:text-rose-600">
                        <Trash className="w-3.5 h-3.5" />
                    </Button>
                </div>
            ),
        },
    ];

    const customerColumns: Column<Customer>[] = [
        {
            title: "",
            key: "id",
            className: "w-12 py-3 text-center",
            render: (value) => (
                <div className="flex justify-center">
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${sessionData.customerId === value ? 'bg-[#2FA9D9] border-[#2FA9D9] text-white' : 'border-gray-300'}`}>
                        {sessionData.customerId === value && <CheckCircle2 className="w-3.5 h-3.5" />}
                    </div>
                </div>
            )
        },
        {
            title: "Customer",
            key: "name",
            className: "py-3",
            render: (value, item) => (
                <div className="flex flex-col">
                    <span className="font-bold text-sm text-[#2FA9D9]">{String(value)}</span>
                    <span className="text-xs text-gray-400 mt-0.5 truncate max-w-[200px]">
                        {item.address || "No address"}
                    </span>
                </div>
            )
        },
        {
            title: "Phone",
            key: "phone",
            className: "py-3",
            render: (value) => <span className="text-sm text-gray-700">{value ? String(value) : "—"}</span>
        },
        {
            title: "Total Orders",
            key: "total_orders",
            className: "py-3",
            render: (value) => <span className="text-sm font-semibold text-gray-900">{value ?? 0}</span>
        }
    ];

    const sessionColumns: Column<SessionGroup>[] = [
        {
            title: "Session Info",
            key: "sessionInfo",
            className: "py-3",
            render: (_, group) => (
                <div className="flex items-start gap-4 cursor-pointer" onClick={() => {
                    setSelectedSessionForDetails(group);
                    setIsSessionDetailsModalOpen(true);
                }}>
                    <div className="w-10 h-10 rounded-full bg-[#2FA9D9]/10 flex items-center justify-center shrink-0 mt-0.5">
                        <Package className="w-5 h-5 text-[#2FA9D9]" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-[#2FA9D9]">{group.customerName}</span>
                        </div>
                        <div className="text-sm text-gray-500 max-w-[300px] truncate mt-1 flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-gray-400" />
                            {group.address}
                        </div>
                    </div>
                </div>
            )
        },
        {
            title: "Date",
            key: "date",
            className: "py-3 align-middle",
            render: (_, group) => (
                <div className="flex flex-col">
                    <span className="font-medium text-sm text-gray-900">{format(new Date(group.date), "MMM d, yyyy")}</span>
                </div>
            )
        },
        {
            title: "Orders",
            key: "ordersCount",
            className: "py-3 align-middle",
            render: (_, group) => (
                <div className="inline-flex flex-col">
                    <span className="font-bold text-gray-900 text-lg leading-tight">{group.logs.length}</span>
                    <span className="text-xs text-gray-400 font-medium">orders</span>
                </div>
            )
        },
        {
            title: "Status",
            key: "status",
            className: "py-3 align-middle",
            render: (_, group) => (
                <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
                    <Select
                        value={group.status}
                        onValueChange={(val) => group.onStatusChange(group.sessionId, val)}
                    >
                        <SelectTrigger className="w-[130px] h-8 text-xs font-medium bg-gray-50 border-gray-200">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ongoing" className="text-xs">Ongoing</SelectItem>
                            <SelectItem value="completed" className="text-xs">Completed</SelectItem>
                            <SelectItem value="cancelled" className="text-xs">Cancelled</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            )
        },
        {
            title: "Actions",
            key: "actions",
            className: "py-3 align-middle text-right",
            render: (_, group) => (
                <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <Button
                        variant="outline" size="icon-sm"
                        onClick={() => {
                            setSelectedSessionForDetails(group);
                            setIsSessionDetailsModalOpen(true);
                        }}
                        className="hover:text-[#2FA9D9]"
                        title="View Details"
                    >
                        <Eye className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                        variant="outline" size="icon-sm"
                        onClick={() => {
                            setSelectedSessionForTally(group);
                            setIsTallyModalOpen(true);
                        }}
                        className="hover:text-emerald-600"
                        title="Generate Tally"
                    >
                        <PackageCheck className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                        variant="outline" size="icon-sm"
                        onClick={() => group.onEdit(group.sessionId, group.address)}
                        className="hover:text-[#2FA9D9]"
                        title="Edit Session Address"
                    >
                        <Edit className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                        variant="outline" size="icon-sm"
                        onClick={() => group.onDelete(group.sessionId)}
                        className="hover:text-rose-600"
                        title="Delete Session"
                    >
                        <Trash className="w-3.5 h-3.5" />
                    </Button>
                </div>
            )
        }
    ];

    const renderSessionMobileItem = (group: SessionGroup) => (
        <div className="p-4 space-y-3 cursor-pointer hover:bg-gray-50/50" onClick={() => {
            setSelectedSessionForDetails(group);
            setIsSessionDetailsModalOpen(true);
        }}>
            <div className="flex justify-between items-start">
                <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#2FA9D9]/10 flex items-center justify-center shrink-0">
                        <Package className="w-4 h-4 text-[#2FA9D9]" />
                    </div>
                    <div>
                        <div className="font-bold text-sm text-[#2FA9D9]">{group.customerName}</div>
                        <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5 max-w-[200px] truncate">
                            <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
                            {group.address}
                        </div>
                    </div>
                </div>
                <div className="text-right">
                    <div className="font-bold text-gray-900 text-lg leading-none">{group.logs.length}</div>
                    <div className="text-[10px] text-gray-400 font-medium">orders</div>
                </div>
            </div>
            <div className="flex items-center justify-between border-t border-gray-100 pt-3" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase text-gray-400">Date</span>
                    <span className="text-xs font-medium text-gray-900">{format(new Date(group.date), "MMM d")}</span>
                </div>
                <Select
                    value={group.status}
                    onValueChange={(val) => group.onStatusChange(group.sessionId, val)}
                >
                    <SelectTrigger className="w-[110px] h-7 text-[10px] font-medium bg-gray-50 border-gray-200">
                        <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ongoing" className="text-xs">Ongoing</SelectItem>
                        <SelectItem value="completed" className="text-xs">Completed</SelectItem>
                        <SelectItem value="cancelled" className="text-xs">Cancelled</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2" onClick={(e) => e.stopPropagation()}>
                <Button variant="outline" size="icon-sm" onClick={() => { setSelectedSessionForTally(group); setIsTallyModalOpen(true); }} className="hover:text-emerald-600">
                    <PackageCheck className="w-3.5 h-3.5" />
                </Button>
                <Button variant="outline" size="icon-sm" onClick={() => group.onEdit(group.sessionId, group.address)} className="hover:text-[#2FA9D9]">
                    <Edit className="w-3.5 h-3.5" />
                </Button>
                <Button variant="outline" size="icon-sm" onClick={() => group.onDelete(group.sessionId)} className="hover:text-rose-600">
                    <Trash className="w-3.5 h-3.5" />
                </Button>
            </div>
        </div>
    );

    // ─────────────────────────────────────────────────────────────────────────

    // Calculate Dashboard Statistics dynamically
    const now = new Date();
    const filteredStatsLogs = initialData.filter((log) => {
        if (log.status === "cancelled") return false;

        const logDate = new Date(log.log_date);

        if (statTab === "today") {
            return logDate.toDateString() === now.toDateString();
        } else if (statTab === "week") {
            const weekAgo = new Date(now);
            weekAgo.setDate(now.getDate() - 7);
            return logDate >= weekAgo;
        } else if (statTab === "month") {
            return logDate.getMonth() === now.getMonth() && logDate.getFullYear() === now.getFullYear();
        } else if (statTab === "year") {
            return logDate.getFullYear() === now.getFullYear();
        }
        return true;
    });



    const totalRevenue = filteredStatsLogs.reduce((sum, log) => sum + calculateLogPrice(log), 0);
    const totalOrders = filteredStatsLogs.length;

    return (
        <>
            <PageContainer title="Orders">
                <div className="p-4 sm:p-6 lg:p-8 space-y-6">
                    {/* ─── STATS CARDS GRID ─── */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <StatCard
                            title="Total Revenue"
                            value={`₱${totalRevenue.toLocaleString()}`}
                            change="+8%"
                            positive={true}
                            icon={PhilippinePeso}
                            iconBg="bg-emerald-50"
                            iconColor="text-emerald-600"
                        />
                        <StatCard
                            title="Total Orders"
                            value={totalOrders.toString()}
                            change="+12%"
                            positive={true}
                            icon={PackageCheck}
                            iconBg="bg-sky-50"
                            iconColor="text-sky-600"
                        />
                        <StatCard
                            title="Ongoing Orders"
                            value={initialData.filter(log => log.status === "ongoing").length.toString()}
                            change="Active"
                            positive={true}
                            icon={Clock}
                            iconBg="bg-sky-50/70"
                            iconColor="text-[#2FA9D9]"
                        />
                        <StatCard
                            title="Delivered Orders"
                            value={initialData.filter(log => log.status === "delivered").length.toString()}
                            change="Completed"
                            positive={true}
                            icon={CheckCircle2}
                            iconBg="bg-emerald-50/70"
                            iconColor="text-emerald-500"
                        />
                    </div>
                </div>

                {/* ── Table Panel ── */}
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
                    <Tabs value={sessionListTab} onValueChange={setSessionListTab} className="w-full mb-4">
                        <TabsList className="grid grid-cols-3 w-full sm:w-[400px]">
                            <TabsTrigger value="ongoing">Ongoing ({allSessions.filter(g => g.status === 'ongoing').length})</TabsTrigger>
                            <TabsTrigger value="completed">Completed ({allSessions.filter(g => g.status === 'completed').length})</TabsTrigger>
                            <TabsTrigger value="cancelled">Cancelled ({allSessions.filter(g => g.status === 'cancelled').length})</TabsTrigger>
                        </TabsList>
                    </Tabs>

                    {allSessions.filter(group => group.status === sessionListTab).length === 0 ? (
                        <div className="py-20 text-center">
                            <Clock className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                            <h3 className="text-gray-500 font-medium">No sessions found</h3>
                            <p className="text-gray-400 text-sm mt-1">Start a new session to begin logging orders.</p>
                        </div>
                    ) : (
                        <DataTable
                            columns={sessionColumns}
                            data={allSessions.filter(group => group.status === sessionListTab)}
                            keyExtractor={(item) => item.sessionId}
                            renderMobileItem={renderSessionMobileItem}
                        />
                    )}
                </div>
            </PageContainer>

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
                                <span className="text-gray-500">Quantity</span>
                                <span className="font-medium">{selectedLog.quantity ?? 1} container{(selectedLog.quantity ?? 1) > 1 ? "s" : ""}</span>
                            </div>
                            <div className="flex justify-between border-b pb-2">
                                <span className="text-gray-500">Water Type</span>
                                <Badge value={selectedLog.water_type} labels={WATER_LABELS} colors={WATER_COLORS} />
                            </div>
                            {selectedLog.price_per_gallon && (
                                <div className="flex justify-between border-b pb-2">
                                    <span className="text-gray-500">Price per Gallon</span>
                                    <span className="font-medium">₱{selectedLog.price_per_gallon}</span>
                                </div>
                            )}
                            {selectedLog.total_gallons && (
                                <div className="flex justify-between border-b pb-2">
                                    <span className="text-gray-500">Total Gallons</span>
                                    <span className="font-medium">{selectedLog.total_gallons} gal</span>
                                </div>
                            )}
                            {selectedLog.total_price !== null && selectedLog.total_price !== undefined && (
                                <div className="flex justify-between border-b pb-2">
                                    <span className="text-gray-500">Total Price</span>
                                    <span className="font-bold text-lg text-[#2FA9D9]">₱{selectedLog.total_price.toLocaleString()}</span>
                                </div>
                            )}
                            <div className="flex justify-between border-b pb-2">
                                <span className="text-gray-500">Payment Status</span>
                                {(() => {
                                    const sessionStatus = selectedLog.order_sessions?.status ?? null;
                                    const paymentStatus =
                                        sessionStatus === "completed" ? "paid"
                                            : sessionStatus === "ongoing" ? "partial"
                                                : "unpaid";
                                    return <Badge value={paymentStatus} labels={PAYMENT_STATUS_LABELS} colors={PAYMENT_STATUS_COLORS} />;
                                })()}
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

            {/* ── New Session Modal ── */}
            <Dialog open={isSessionModalOpen} onOpenChange={(open) => { if (!open) handleCancelSession(); }}>
                <DialogContent className="sm:max-w-3xl max-w-[95vw] overflow-hidden flex flex-col max-h-[90vh] p-0">
                    <DialogHeader className="p-6 pb-0">
                        <DialogTitle className="text-lg font-bold">
                            Create New Order
                        </DialogTitle>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
                        {/* Session Details Summary */}
                        {sessionData.customerName && (
                            <div className="space-y-3">
                                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Selected Customer</label>
                                <div className="p-4 bg-gray-50 border rounded-2xl space-y-2">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-[#2FA9D9]/10 flex items-center justify-center shrink-0">
                                            <MapPin className="w-4 h-4 text-[#2FA9D9]" />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="text-sm font-bold text-gray-900 truncate">{sessionData.customerName}</div>
                                            <div className="text-[10px] text-gray-500 truncate">{sessionData.address}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Customer Selection or Manual Input */}
                        <div className="space-y-4 animate-in fade-in duration-200">
                            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                                <h3 className="text-sm font-bold text-gray-900">
                                    {isManualInput ? "Manual Entry" : "Select a Customer"}
                                </h3>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsManualInput(!isManualInput);
                                        setSessionData(p => ({
                                            ...p,
                                            id: p.id || generateSessionId(),
                                            customerName: "",
                                            customerId: "",
                                            address: ""
                                        }));
                                    }}
                                    className="text-xs font-semibold text-[#2FA9D9] hover:underline"
                                >
                                    {isManualInput ? "Back to Database Search" : "Walk-in / Manual Entry"}
                                </button>
                            </div>

                            {isManualInput ? (
                                <div className="space-y-4 animate-in fade-in zoom-in-95 font-sans">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer Name</label>
                                        <Input
                                            placeholder="Enter customer name..."
                                            value={sessionData.customerName}
                                            onChange={(e) => setSessionData(p => ({ ...p, customerName: e.target.value }))}
                                            className="h-11"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Session Address</label>
                                        <Input
                                            placeholder="Enter customer address..."
                                            value={sessionData.address}
                                            onChange={(e) => setSessionData(p => ({ ...p, address: e.target.value }))}
                                            className="h-11"
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4 animate-in fade-in zoom-in-95 font-sans">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <Input
                                            placeholder="Search customers by name, address, or phone..."
                                            className="pl-9 h-11 bg-gray-50/50 border-gray-200"
                                            value={customerSearch}
                                            onChange={(e) => setCustomerSearch(e.target.value)}
                                        />
                                    </div>

                                    <div className="max-h-[350px] overflow-y-auto border border-gray-100 rounded-xl bg-white shadow-sm">
                                        {isLoadingCustomers ? (
                                            <div className="py-12 text-center text-sm text-gray-400">Loading customers…</div>
                                        ) : customers.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center py-12 px-6 text-center gap-4">
                                                <div className="w-12 h-12 rounded-full bg-sky-50 flex items-center justify-center">
                                                    <MapPin className="w-6 h-6 text-[#2FA9D9]" />
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="text-sm font-semibold text-gray-800">No customers yet</p>
                                                    <p className="text-xs text-gray-400 leading-relaxed max-w-[220px]">
                                                        Add a customer to the database before creating an order.
                                                    </p>
                                                </div>
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    onClick={() => router.push("/customers")}
                                                    className="bg-[#2FA9D9] hover:bg-[#2195c0] text-white text-xs px-5 h-9"
                                                >
                                                    Go to Customers
                                                </Button>
                                            </div>
                                        ) : (
                                            <DataTable
                                                columns={customerColumns}
                                                data={filteredCustomers}
                                                keyExtractor={(c) => c.id}
                                                onRowClick={(c) => setSessionData(p => ({
                                                    ...p,
                                                    customerName: c.name,
                                                    customerId: c.id,
                                                    address: c.address ?? ""
                                                }))}
                                            />
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <DialogFooter className="p-6 pt-4 border-t border-gray-100 flex flex-col sm:flex-row sm:space-x-2 gap-3 sm:gap-0 justify-end bg-gray-50/30">
                        <Button variant="outline" onClick={handleCancelSession} className="w-full sm:w-auto h-11">
                            Cancel
                        </Button>
                        <Button
                            onClick={handleStartAddingToSession}
                            disabled={!sessionData.customerName || (isManualInput && !sessionData.address)}
                            className="w-full sm:w-auto bg-[#2FA9D9] hover:bg-[#2195c0] text-white h-11 px-8"
                        >
                            Continue Order
                        </Button>
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

            {/* ── Session Details Modal ── */}
            <Dialog open={isSessionDetailsModalOpen} onOpenChange={setIsSessionDetailsModalOpen}>
                <DialogContent className="sm:max-w-5xl max-w-[95vw] max-h-[90vh] flex flex-col p-0 overflow-hidden">
                    <DialogHeader className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 shrink-0">
                        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                            <div>
                                <DialogTitle className="text-lg font-bold flex items-center gap-2">
                                    <Package className="w-5 h-5 text-[#2FA9D9]" />
                                    Session Details
                                </DialogTitle>
                                {activeSessionDetails && (
                                    <div className="text-sm text-gray-500 mt-1 flex flex-wrap items-center gap-1 sm:gap-3">
                                        <span className="font-mono text-[#2FA9D9]">{activeSessionDetails.sessionId}</span>
                                        <span className="hidden sm:inline text-gray-300">•</span>
                                        <span>{activeSessionDetails.address}</span>
                                        <span className="text-gray-300">•</span>
                                        <span className="text-xs font-semibold px-2 py-0.5 bg-sky-50 text-sky-700 rounded-full border border-sky-100">
                                            Status: {activeSessionDetails.paymentStatus}
                                        </span>
                                        <span className="text-xs font-semibold px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full border border-amber-100">
                                            Owed: ₱{activeSessionDetails.totalOwed}
                                        </span>
                                        <span className="text-xs font-semibold px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100">
                                            Paid: ₱{activeSessionDetails.totalPaid}
                                        </span>
                                    </div>
                                )}
                            </div>
                            {activeSessionDetails && (
                                <div className="flex items-center gap-2">
                                    {activeSessionDetails.paymentStatus !== "paid" && (
                                        <Button
                                            variant="default"
                                            size="sm"
                                            onClick={() => setIsPaymentModalOpen(true)}
                                            className="bg-emerald-600 hover:bg-emerald-700 text-white w-full sm:w-auto"
                                        >
                                            Settle Balance
                                        </Button>
                                    )}
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full sm:w-auto border border-[#2FA9D9] text-[#2FA9D9] hover:bg-[#2FA9D9]/5"
                                        onClick={() => {
                                            const { sessionId, address, logs } = activeSessionDetails;
                                            const today = format(new Date(), "MMMM d, yyyy");

                                            // Generate HTML content for Word
                                            const htmlContent = `
                                            <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
                                            <head>
                                                <meta charset='utf-8'>
                                                <title>Session Report</title>
                                                <style>
                                                    body { font-family: 'Arial', sans-serif; line-height: 1.6; color: #333; }
                                                    .report-header { text-align: center; border-bottom: 2px solid #2FA9D9; padding-bottom: 10px; margin-bottom: 20px; }
                                                    .report-header h1 { color: #2FA9D9; margin: 0; font-size: 24pt; }
                                                    .report-header p { margin: 5px 0; color: #666; font-size: 10pt; }
                                                    .meta-info { margin-bottom: 30px; background: #f9f9f9; padding: 15px; border-radius: 8px; }
                                                    .meta-info p { margin: 3px 0; font-size: 11pt; }
                                                    .meta-info b { color: #2FA9D9; }
                                                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                                                    th { background-color: #2FA9D9; color: white; padding: 12px; text-align: left; font-size: 10pt; border: 1px solid #2FA9D9; }
                                                    td { padding: 10px; border: 1px solid #eee; font-size: 10pt; vertical-align: top; }
                                                    tr:nth-child(even) { background-color: #fafafa; }
                                                    .total-row { background-color: #f0f9ff !important; font-weight: bold; }
                                                    .footer { margin-top: 40px; text-align: center; font-size: 9pt; color: #999; border-top: 1px solid #eee; padding-top: 10px; }
                                                    .status-badge { padding: 2px 8px; border-radius: 4px; font-size: 8pt; font-weight: bold; }
                                                </style>
                                            </head>
                                            <body>
                                                <div class="report-header">
                                                    <h1>DAILY LOGS REPORT</h1>
                                                    <p>Water Station Management System • Kwago Dashboard</p>
                                                </div>

                                                <div class="meta-info">
                                                    <p><b>Session ID:</b> ${sessionId}</p>
                                                    <p><b>Location:</b> ${address}</p>
                                                    <p><b>Report Date:</b> ${today}</p>
                                                    <p><b>Total Entries:</b> ${logs.length}</p>
                                                </div>

                                                <table>
                                                    <thead>
                                                        <tr>
                                                            <th>Date</th>
                                                            <th>Customer</th>
                                                            <th>Product Details</th>
                                                            <th>Quantity</th>
                                                            <th>Amount</th>
                                                            <th>Status</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        ${logs.map(log => {
                                                const quantity = log.quantity ?? 1;
                                                const wType = log.water_type || "mineral";
                                                const cType = log.container_type || "round";
                                                const price = log.total_price ?? (quantity * 5 * (wType === "alkaline" ? 50 : 35));
                                                return `
                                                                <tr>
                                                                    <td>${format(new Date(log.log_date), "MMM d, yyyy")}</td>
                                                                    <td>${log.customer_name}</td>
                                                                    <td>${cType} • ${wType}</td>
                                                                    <td>${quantity}</td>
                                                                    <td>₱${price.toLocaleString()}</td>
                                                                    <td>${log.status || "ongoing"}</td>
                                                                </tr>
                                                            `;
                                            }).join('')}
                                                    </tbody>
                                                </table>

                                                <div class="footer">
                                                    <p>© ${new Date().getFullYear()} Water Station Management. Generated via Kwago Dashboard.</p>
                                                </div>
                                            </body>
                                            </html>
                                        `;

                                            const blob = new Blob(['\ufeff', htmlContent], {
                                                type: 'application/msword'
                                            });

                                            const url = URL.createObjectURL(blob);
                                            const link = document.createElement('a');
                                            link.href = url;
                                            link.download = `Session_Report_${sessionId}.doc`;
                                            document.body.appendChild(link);
                                            link.click();
                                            document.body.removeChild(link);
                                            URL.revokeObjectURL(url);
                                        }}
                                    >
                                        <Printer className="w-4 h-4 mr-2" />
                                        Download Word Doc
                                    </Button>
                                </div>
                            )}
                        </div>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto bg-gray-50/10 relative">
                        {activeSessionDetails && (
                            (() => {
                                const ongoing = activeSessionDetails.logs.filter(l => !l.status || l.status === "ongoing");
                                const delivered = activeSessionDetails.logs.filter(l => l.status === "delivered");
                                const cancelled = activeSessionDetails.logs.filter(l => l.status === "cancelled");

                                return (
                                    <Tabs defaultValue="ongoing" className="w-full flex flex-col min-h-full">
                                        <div className="px-6 border-b border-gray-100 bg-white sticky top-0 z-10 shrink-0">
                                            <TabsList className="bg-transparent p-0 gap-0 h-auto border-0 w-full sm:w-auto flex overflow-x-auto hide-scrollbar">
                                                <TabsTrigger value="ongoing" className="relative py-3 px-4 rounded-none text-sm data-[state=active]:text-[#2FA9D9] data-[state=active]:shadow-none after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-transparent data-[state=active]:after:bg-[#2FA9D9] whitespace-nowrap">
                                                    Ongoing ({ongoing.length})
                                                </TabsTrigger>
                                                <TabsTrigger value="delivered" className="relative py-3 px-4 rounded-none text-sm data-[state=active]:text-emerald-600 data-[state=active]:shadow-none after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-transparent data-[state=active]:after:bg-emerald-500 whitespace-nowrap">
                                                    Delivered ({delivered.length})
                                                </TabsTrigger>
                                                <TabsTrigger value="cancelled" className="relative py-3 px-4 rounded-none text-sm data-[state=active]:text-rose-600 data-[state=active]:shadow-none after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-transparent data-[state=active]:after:bg-rose-500 whitespace-nowrap">
                                                    Cancelled ({cancelled.length})
                                                </TabsTrigger>
                                                <TabsTrigger value="report" className="relative py-3 px-4 rounded-none text-sm data-[state=active]:text-amber-600 data-[state=active]:shadow-none after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-transparent data-[state=active]:after:bg-amber-500 whitespace-nowrap">
                                                    Report Preview
                                                </TabsTrigger>
                                            </TabsList>
                                        </div>

                                        <div className="p-4 sm:p-6 flex-1 bg-gray-50/50">
                                            <TabsContent value="ongoing" className="m-0 h-full focus-visible:outline-none focus-visible:ring-0">
                                                {ongoing.length === 0 ? (
                                                    <div className="py-12 text-center text-gray-400 text-sm bg-white rounded-xl border border-gray-100">No ongoing orders in this session</div>
                                                ) : (
                                                    <DataTable columns={ongoingColumns} data={ongoing} keyExtractor={(item) => String(item.id)} />
                                                )}
                                            </TabsContent>

                                            <TabsContent value="delivered" className="m-0 h-full focus-visible:outline-none focus-visible:ring-0">
                                                {delivered.length === 0 ? (
                                                    <div className="py-12 text-center text-gray-400 text-sm bg-white rounded-xl border border-gray-100">No delivered orders in this session</div>
                                                ) : (
                                                    <DataTable columns={deliveredColumns} data={delivered} keyExtractor={(item) => String(item.id)} />
                                                )}
                                            </TabsContent>

                                            <TabsContent value="cancelled" className="m-0 h-full focus-visible:outline-none focus-visible:ring-0">
                                                {cancelled.length === 0 ? (
                                                    <div className="py-12 text-center text-gray-400 text-sm bg-white rounded-xl border border-gray-100">No cancelled orders in this session</div>
                                                ) : (
                                                    <DataTable columns={cancelledColumns} data={cancelled} keyExtractor={(item) => String(item.id)} />
                                                )}
                                            </TabsContent>

                                            <TabsContent value="report" className="m-0 focus-visible:outline-none focus-visible:ring-0">
                                                <div className="bg-white rounded-xl border border-gray-200 p-8 sm:p-12 mx-auto max-w-4xl min-h-[800px] font-serif text-gray-800">
                                                    {/* Header */}
                                                    <div className="text-center border-b-2 border-[#2FA9D9] pb-6 mb-8">
                                                        <h1 className="text-4xl font-bold text-[#2FA9D9] tracking-tight">DAILY LOGS REPORT</h1>
                                                        <p className="text-sm text-gray-500 mt-2 uppercase tracking-widest">Water Station Management System • Kwago Dashboard</p>
                                                    </div>

                                                    {/* Meta Info Section */}
                                                    <div className="grid grid-cols-2 gap-8 mb-10 bg-gray-50 p-6 rounded-lg border border-gray-100 font-sans">
                                                        <div className="space-y-2">
                                                            <p className="text-[10px] text-gray-400 uppercase font-bold">Session Identity</p>
                                                            <p className="text-sm font-mono text-[#2FA9D9] font-bold">{activeSessionDetails.sessionId}</p>
                                                            <p className="text-[10px] text-gray-400 uppercase font-bold mt-4">Generation Date</p>
                                                            <p className="text-sm font-medium">{format(new Date(), "MMMM d, yyyy")}</p>
                                                        </div>
                                                        <div className="space-y-2 text-right">
                                                            <p className="text-[10px] text-gray-400 uppercase font-bold">Delivery Location</p>
                                                            <p className="text-sm leading-relaxed font-medium">{activeSessionDetails.address}</p>
                                                            <p className="text-[10px] text-gray-400 uppercase font-bold mt-4">Volume Statistics</p>
                                                            <p className="text-sm font-medium">{activeSessionDetails.logs.length} Total Orders</p>
                                                        </div>
                                                    </div>

                                                    {/* Table */}
                                                    <div className="overflow-hidden border border-gray-200 rounded-lg mb-10 font-sans">
                                                        <table className="w-full text-left border-collapse">
                                                            <thead>
                                                                <tr className="bg-[#2FA9D9] text-white">
                                                                    <th className="p-3 text-[10px] font-bold uppercase">Date</th>
                                                                    <th className="p-3 text-[10px] font-bold uppercase">Customer</th>
                                                                    <th className="p-3 text-[10px] font-bold uppercase">Details</th>
                                                                    <th className="p-3 text-[10px] font-bold uppercase text-center">Qty</th>
                                                                    <th className="p-3 text-[10px] font-bold uppercase text-right">Amount</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-gray-100">
                                                                {activeSessionDetails.logs.map((log, i) => {
                                                                    const quantity = log.quantity ?? 1;
                                                                    const wType = log.water_type || "mineral";
                                                                    const cType = log.container_type || "round";
                                                                    const price = log.total_price ?? (quantity * 5 * (wType === "alkaline" ? 50 : 35));
                                                                    return (
                                                                        <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/30"}>
                                                                            <td className="p-3 text-xs">{format(new Date(log.log_date), "MMM d, yyyy")}</td>
                                                                            <td className="p-3 text-xs font-bold text-gray-900">{log.customer_name}</td>
                                                                            <td className="p-3 text-xs capitalize text-gray-600">{cType} • {wType}</td>
                                                                            <td className="p-3 text-xs text-center font-mono font-bold">{quantity}</td>
                                                                            <td className="p-3 text-xs text-right font-bold text-emerald-600">₱{price.toLocaleString()}</td>
                                                                        </tr>
                                                                    );
                                                                })}
                                                            </tbody>
                                                        </table>
                                                    </div>

                                                    {/* Footer */}
                                                    <div className="mt-auto pt-10 text-center border-t border-gray-100 italic text-[10px] text-gray-400 font-sans">
                                                        <p>This document is an official record generated via the Water Station Management Platform.</p>
                                                        <p className="mt-1">Generated by Kwago Dashboard © {new Date().getFullYear()} • All Rights Reserved</p>
                                                    </div>
                                                </div>
                                            </TabsContent>
                                        </div>
                                    </Tabs>
                                );
                            })()
                        )}
                    </div>
                    <DialogFooter className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 shrink-0">
                        <Button variant="outline" onClick={() => setIsSessionDetailsModalOpen(false)}>
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Tally Modal ── */}
            <TallyModal
                open={isTallyModalOpen}
                onClose={() => setIsTallyModalOpen(false)}
                logs={selectedSessionForTally?.logs ?? []}
            />

            {/* ── Payment Modal ── */}
            <PaymentModal
                open={isPaymentModalOpen}
                onClose={() => setIsPaymentModalOpen(false)}
                sessionGroup={activeSessionDetails}
                onSuccess={() => {
                    router.refresh();
                }}
            />

            <PrintableOrders logs={initialData} />
        </>
    );
}


// ─── Status badge for view modal ─────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
    const map: Record<string, { label: string; class: string }> = {
        ongoing: { label: "Ongoing", class: "bg-sky-50 text-sky-700 border border-sky-200" },
        delivered: { label: "Delivered", class: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
        cancelled: { label: "Cancelled", class: "bg-rose-50 text-rose-700 border border-rose-200" },
    };
    const { label, class: cls } = map[status] ?? map.ongoing;
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
            {label}
        </span>
    );
}


