"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Suspense } from "react";
import {
    ArrowLeft, ArrowRight, Check, MapPin, Search,
    Package, Droplets, User, CreditCard, Truck, Flag
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createLog } from "@/app/actions/logs";
import { getCustomers, createCustomer, type Customer } from "@/app/actions/customers";
import { format } from "date-fns";

// ─── Types ────────────────────────────────────────────────────────────────────

type ContainerType = "round" | "flat";
type WaterType = "alkaline" | "mineral";
type PaymentMethod = "gcash" | "cash" | "bank_transfer" | "credit";
type FulfillmentType = "delivery" | "pickup";
type OrderStatus = "ongoing" | "delivered" | "cancelled";

interface FormData {
    container_type: ContainerType | null;
    water_type: WaterType | null;
    customer_id: string | null;
    customer_name: string;
    customer_address: string;
    payment_method: PaymentMethod | null;
    fulfillment_type: FulfillmentType | null;
    initial_status: OrderStatus;
}

// ─── Step Config ──────────────────────────────────────────────────────────────

const STEPS = [
    { id: 1, title: "Container Type",  subtitle: "What type of container?",      icon: Package    },
    { id: 2, title: "Water Type",      subtitle: "What type of water?",           icon: Droplets   },
    { id: 3, title: "Customer",        subtitle: "Who is this order for?",        icon: User       },
    { id: 4, title: "Payment Method",  subtitle: "How will they pay?",            icon: CreditCard },
    { id: 5, title: "Fulfillment",     subtitle: "Delivery or pick-up?",          icon: Truck      },
    { id: 6, title: "Order Status",    subtitle: "Set the initial order status",  icon: Flag       },
];

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
    gcash:         "GCash",
    cash:          "Cash",
    bank_transfer: "Bank Transfer",
    credit:        "Credit / Card",
};

const CONTAINER_LABELS: Record<ContainerType, string> = {
    round: "Round",
    flat:  "Flat",
};

const WATER_LABELS: Record<WaterType, string> = {
    alkaline: "Alkaline",
    mineral:  "Mineral",
};

const FULFILLMENT_LABELS: Record<FulfillmentType, string> = {
    delivery: "Delivery",
    pickup:   "Pick-up",
};

const STATUS_CONFIG: Record<OrderStatus, { icon: string; label: string; desc: string; selectedBorder: string; selectedBg: string; selectedText: string; checkBg: string }> = {
    ongoing: {
        icon:          "⏳",
        label:         "Ongoing",
        desc:          "Order is active and in progress",
        selectedBorder: "border-[#2FA9D9]",
        selectedBg:    "from-[#2FA9D9]/8 to-[#76D4F9]/5",
        selectedText:  "text-[#2FA9D9]",
        checkBg:       "bg-[#2FA9D9]",
    },
    delivered: {
        icon:          "✅",
        label:         "Delivered",
        desc:          "Order has already been delivered",
        selectedBorder: "border-emerald-500",
        selectedBg:    "from-emerald-50 to-emerald-50/50",
        selectedText:  "text-emerald-600",
        checkBg:       "bg-emerald-500",
    },
    cancelled: {
        icon:          "❌",
        label:         "Cancelled",
        desc:          "Order was cancelled before fulfillment",
        selectedBorder: "border-rose-500",
        selectedBg:    "from-rose-50 to-rose-50/50",
        selectedText:  "text-rose-600",
        checkBg:       "bg-rose-500",
    },
};

// ─── Helper Components ────────────────────────────────────────────────────────

function SummaryRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex justify-between items-center text-sm py-1.5 border-b border-gray-100 last:border-0">
            <span className="text-gray-500">{label}</span>
            <span className="font-medium text-gray-800 text-right max-w-[60%]">{value}</span>
        </div>
    );
}

function OptionCard({
    selected,
    onClick,
    icon,
    label,
    desc,
    accentColor = "#2FA9D9",
    wide = false,
}: {
    selected: boolean;
    onClick: () => void;
    icon: string;
    label: string;
    desc: string;
    accentColor?: string;
    wide?: boolean;
}) {
    return (
        <button
            onClick={onClick}
            className={`
                relative p-5 rounded-2xl border-2 text-left transition-all duration-200 group
                ${wide ? "w-full" : ""}
                ${selected
                    ? "border-[#2FA9D9] bg-gradient-to-br from-[#2FA9D9]/8 to-[#76D4F9]/5 shadow-lg shadow-[#2FA9D9]/10 scale-[1.02]"
                    : "border-gray-200 hover:border-[#2FA9D9]/50 hover:bg-gray-50/80 hover:shadow-md hover:scale-[1.01]"
                }
            `}
        >
            <div className="text-3xl mb-3 leading-none">{icon}</div>
            <div className={`font-semibold text-sm ${selected ? "text-[#2FA9D9]" : "text-gray-800"}`}>{label}</div>
            <div className="text-xs text-gray-500 mt-1 leading-relaxed">{desc}</div>
            {selected && (
                <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-[#2FA9D9] flex items-center justify-center shadow-sm">
                    <Check className="w-3 h-3 text-white stroke-[3]" />
                </div>
            )}
        </button>
    );
}

// ─── Main Form ────────────────────────────────────────────────────────────────

function MultiStepForm() {
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [customerSearch, setCustomerSearch] = useState("");
    const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);
    const [addingCustomer, setAddingCustomer] = useState(false);

    const [formData, setFormData] = useState<FormData>({
        container_type:   null,
        water_type:       null,
        customer_id:      null,
        customer_name:    "",
        customer_address: "",
        payment_method:   null,
        fulfillment_type: null,
        initial_status:   "ongoing",
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
        (c.address ?? "").toLowerCase().includes(customerSearch.toLowerCase())
    );

    // If the typed search doesn't match any customer, allow adding
    const noExactMatch = customerSearch.trim() !== "" &&
        !customers.some((c) => c.name.toLowerCase() === customerSearch.toLowerCase());

    const canProceed = (): boolean => {
        switch (currentStep) {
            case 1: return formData.container_type !== null;
            case 2: return formData.water_type !== null;
            case 3: return formData.customer_name !== "";
            case 4: return formData.payment_method !== null;
            case 5: return formData.fulfillment_type !== null;
            case 6: return true; // always has a default (ongoing)
            default: return false;
        }
    };

    const goNext = () => {
        if (!canProceed()) return;
        setCurrentStep((p) => Math.min(p + 1, STEPS.length));
    };

    const goBack = () => {
        setCurrentStep((p) => Math.max(p - 1, 1));
    };

    const handleAddCustomer = async (name: string) => {
        setAddingCustomer(true);
        try {
            const newCustomer = await createCustomer({ name, address: "" });
            setCustomers((prev) => [...prev, newCustomer].sort((a, b) => a.name.localeCompare(b.name)));
            setFormData((prev) => ({
                ...prev,
                customer_id:      newCustomer.id,
                customer_name:    newCustomer.name,
                customer_address: "",
            }));
            setCustomerSearch("");
        } catch (err) {
            console.error(err);
        } finally {
            setAddingCustomer(false);
        }
    };

    const handleSubmit = async () => {
        if (!canProceed() || isSubmitting) return;
        setIsSubmitting(true);
        try {
            const today = new Date();
            const log_date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

            const result = await createLog({
                log_date,
                container_type:   formData.container_type,
                water_type:       formData.water_type,
                customer_id:      formData.customer_id,
                customer_name:    formData.customer_name,
                customer_address: formData.customer_address,
                payment_method:   formData.payment_method,
                fulfillment_type: formData.fulfillment_type,
                status:           formData.initial_status,
            });

            if (result.success) {
                router.push("/daily-logs");
                router.refresh();
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const progress = (currentStep / STEPS.length) * 100;
    const StepIcon = STEPS[currentStep - 1].icon;

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#2FA9D9] via-[#1e8fbd] to-[#0d6a96] p-4 sm:p-6">
            {/* Back button */}
            <div className="max-w-lg mx-auto mb-4">
                <Button
                    variant="ghost"
                    onClick={() => router.back()}
                    className="text-white/80 hover:text-white hover:bg-white/15 gap-2 -ml-2"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Logs
                </Button>
            </div>

            <div className="max-w-lg mx-auto">
                {/* ── Progress Header ── */}
                <div className="mb-6">
                    {/* Step dots */}
                    <div className="flex items-center justify-between mb-4">
                        {STEPS.map((step, index) => {
                            const Icon = step.icon;
                            const isDone    = step.id < currentStep;
                            const isCurrent = step.id === currentStep;
                            return (
                                <div key={step.id} className="flex items-center flex-1">
                                    <div className="flex flex-col items-center">
                                        <div className={`
                                            w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300
                                            ${isDone    ? "bg-white text-[#2FA9D9] shadow-lg shadow-black/20"                     : ""}
                                            ${isCurrent ? "bg-white text-[#2FA9D9] ring-4 ring-white/25 shadow-lg shadow-black/20" : ""}
                                            ${!isDone && !isCurrent ? "bg-white/20 text-white/60"                                  : ""}
                                        `}>
                                            {isDone
                                                ? <Check className="w-4 h-4 stroke-[3]" />
                                                : <Icon className="w-4 h-4" />
                                            }
                                        </div>
                                    </div>
                                    {index < STEPS.length - 1 && (
                                        <div className="flex-1 h-0.5 mx-1.5 rounded-full overflow-hidden bg-white/20">
                                            <div
                                                className="h-full bg-white rounded-full transition-all duration-500"
                                                style={{ width: step.id < currentStep ? "100%" : "0%" }}
                                            />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Progress bar */}
                    <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-white rounded-full transition-all duration-500 ease-out"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <div className="flex justify-between mt-1.5 text-white/60 text-xs">
                        <span>{STEPS[currentStep - 1].title}</span>
                        <span>Step {currentStep} of {STEPS.length}</span>
                    </div>
                </div>

                {/* ── Card ── */}
                <div className="bg-white rounded-3xl shadow-2xl shadow-black/20 overflow-hidden">
                    {/* Card header accent */}
                    <div className="h-1 bg-gradient-to-r from-[#2FA9D9] to-[#76D4F9]" />

                    <div className="p-6 sm:p-8">
                        {/* Step header */}
                        <div className="flex items-start gap-3 mb-7">
                            <div className="w-10 h-10 rounded-xl bg-[#2FA9D9]/10 flex items-center justify-center shrink-0">
                                <StepIcon className="w-5 h-5 text-[#2FA9D9]" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-gray-900 leading-tight">
                                    {STEPS[currentStep - 1].title}
                                </h1>
                                <p className="text-sm text-gray-500 mt-0.5">
                                    {STEPS[currentStep - 1].subtitle}
                                </p>
                            </div>
                        </div>

                        {/* ────── STEP CONTENT ────── */}
                        <div className="min-h-[260px]">

                            {/* Step 1 — Container Type */}
                            {currentStep === 1 && (
                                <div className="grid grid-cols-2 gap-4">
                                    <OptionCard
                                        selected={formData.container_type === "round"}
                                        onClick={() => setFormData((p) => ({ ...p, container_type: "round" }))}
                                        icon="🫙"
                                        label="Round"
                                        desc="Cylindrical gallon container"
                                    />
                                    <OptionCard
                                        selected={formData.container_type === "flat"}
                                        onClick={() => setFormData((p) => ({ ...p, container_type: "flat" }))}
                                        icon="📦"
                                        label="Flat"
                                        desc="Flat / rectangular container"
                                    />
                                </div>
                            )}

                            {/* Step 2 — Water Type */}
                            {currentStep === 2 && (
                                <div className="grid grid-cols-2 gap-4">
                                    <OptionCard
                                        selected={formData.water_type === "alkaline"}
                                        onClick={() => setFormData((p) => ({ ...p, water_type: "alkaline" }))}
                                        icon="💧"
                                        label="Alkaline"
                                        desc="pH-balanced purified water"
                                    />
                                    <OptionCard
                                        selected={formData.water_type === "mineral"}
                                        onClick={() => setFormData((p) => ({ ...p, water_type: "mineral" }))}
                                        icon="🌊"
                                        label="Mineral"
                                        desc="Natural mineral spring water"
                                    />
                                </div>
                            )}

                            {/* Step 3 — Customer */}
                            {currentStep === 3 && (
                                <div className="space-y-3">
                                    {/* Selected badge */}
                                    {formData.customer_name && (
                                        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[#2FA9D9]/8 border border-[#2FA9D9]/20">
                                            <div className="w-6 h-6 rounded-full bg-[#2FA9D9] flex items-center justify-center shrink-0">
                                                <Check className="w-3.5 h-3.5 text-white stroke-[3]" />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="text-sm font-semibold text-[#2FA9D9] truncate">{formData.customer_name}</div>
                                                {formData.customer_address && (
                                                    <div className="text-xs text-gray-500 truncate">{formData.customer_address}</div>
                                                )}
                                            </div>
                                            <button
                                                className="ml-auto text-xs text-gray-400 hover:text-gray-600 shrink-0"
                                                onClick={() => setFormData((p) => ({ ...p, customer_id: null, customer_name: "", customer_address: "" }))}
                                            >
                                                Change
                                            </button>
                                        </div>
                                    )}

                                    {/* Search */}
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <Input
                                            placeholder="Search customers by name or address…"
                                            className="pl-9 text-sm"
                                            value={customerSearch}
                                            onChange={(e) => setCustomerSearch(e.target.value)}
                                        />
                                    </div>

                                    {/* Customer list */}
                                    <div className="max-h-[200px] overflow-y-auto space-y-1.5 pr-0.5 -mr-1">
                                        {isLoadingCustomers && (
                                            <div className="text-center py-8 text-sm text-gray-400">Loading customers…</div>
                                        )}

                                        {/* Add new option */}
                                        {noExactMatch && !isLoadingCustomers && (
                                            <button
                                                onClick={() => handleAddCustomer(customerSearch.trim())}
                                                disabled={addingCustomer}
                                                className="w-full p-3 rounded-xl border-2 border-dashed border-gray-300 text-sm text-gray-500 hover:border-[#2FA9D9] hover:text-[#2FA9D9] hover:bg-[#2FA9D9]/4 transition-all"
                                            >
                                                {addingCustomer ? "Adding…" : `＋ Add "${customerSearch.trim()}" as new customer`}
                                            </button>
                                        )}

                                        {filteredCustomers.map((customer) => (
                                            <button
                                                key={customer.id}
                                                onClick={() => {
                                                    setFormData((p) => ({
                                                        ...p,
                                                        customer_id:      customer.id,
                                                        customer_name:    customer.name,
                                                        customer_address: customer.address ?? "",
                                                    }));
                                                    setCustomerSearch("");
                                                }}
                                                className={`
                                                    w-full p-3 rounded-xl border-2 text-left transition-all duration-150
                                                    ${formData.customer_id === customer.id
                                                        ? "border-[#2FA9D9] bg-[#2FA9D9]/6"
                                                        : "border-gray-100 hover:border-[#2FA9D9]/40 hover:bg-gray-50"
                                                    }
                                                `}
                                            >
                                                <div className="flex items-center justify-between gap-2">
                                                    <div className="min-w-0">
                                                        <div className={`font-medium text-sm truncate ${formData.customer_id === customer.id ? "text-[#2FA9D9]" : "text-gray-900"}`}>
                                                            {customer.name}
                                                        </div>
                                                        {customer.address && (
                                                            <div className="text-xs text-gray-400 flex items-center gap-1 mt-0.5 truncate">
                                                                <MapPin className="w-3 h-3 shrink-0" />
                                                                {customer.address}
                                                            </div>
                                                        )}
                                                    </div>
                                                    {formData.customer_id === customer.id && (
                                                        <div className="w-5 h-5 rounded-full bg-[#2FA9D9] flex items-center justify-center shrink-0">
                                                            <Check className="w-3 h-3 text-white stroke-[3]" />
                                                        </div>
                                                    )}
                                                </div>
                                            </button>
                                        ))}

                                        {!isLoadingCustomers && filteredCustomers.length === 0 && !noExactMatch && (
                                            <div className="text-center py-8 text-sm text-gray-400">
                                                No customers found. Type a name to add one.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Step 4 — Payment Method */}
                            {currentStep === 4 && (
                                <div className="grid grid-cols-2 gap-3">
                                    <OptionCard
                                        selected={formData.payment_method === "gcash"}
                                        onClick={() => setFormData((p) => ({ ...p, payment_method: "gcash" }))}
                                        icon="📱"
                                        label="GCash"
                                        desc="Mobile wallet payment"
                                    />
                                    <OptionCard
                                        selected={formData.payment_method === "cash"}
                                        onClick={() => setFormData((p) => ({ ...p, payment_method: "cash" }))}
                                        icon="💵"
                                        label="Cash"
                                        desc="Physical cash on hand"
                                    />
                                    <OptionCard
                                        selected={formData.payment_method === "bank_transfer"}
                                        onClick={() => setFormData((p) => ({ ...p, payment_method: "bank_transfer" }))}
                                        icon="🏦"
                                        label="Bank Transfer"
                                        desc="Online bank payment"
                                    />
                                    <OptionCard
                                        selected={formData.payment_method === "credit"}
                                        onClick={() => setFormData((p) => ({ ...p, payment_method: "credit" }))}
                                        icon="💳"
                                        label="Credit / Card"
                                        desc="Credit or debit card"
                                    />
                                </div>
                            )}

                            {/* Step 5 — Fulfillment */}
                            {currentStep === 5 && (
                                <div className="grid grid-cols-2 gap-4">
                                    <OptionCard
                                        selected={formData.fulfillment_type === "delivery"}
                                        onClick={() => setFormData((p) => ({ ...p, fulfillment_type: "delivery" }))}
                                        icon="🚚"
                                        label="Delivery"
                                        desc="Deliver to customer's address"
                                    />
                                    <OptionCard
                                        selected={formData.fulfillment_type === "pickup"}
                                        onClick={() => setFormData((p) => ({ ...p, fulfillment_type: "pickup" }))}
                                        icon="🏪"
                                        label="Pick-up"
                                        desc="Customer picks up in-store"
                                    />
                                </div>
                            )}

                            {/* Step 6 — Order Status + Summary */}
                            {currentStep === 6 && (
                                <div className="space-y-5">
                                    {/* Status options */}
                                    <div className="flex flex-col gap-3">
                                        {(Object.entries(STATUS_CONFIG) as [OrderStatus, typeof STATUS_CONFIG[OrderStatus]][]).map(([status, cfg]) => {
                                            const isSelected = formData.initial_status === status;
                                            return (
                                                <button
                                                    key={status}
                                                    onClick={() => setFormData((p) => ({ ...p, initial_status: status }))}
                                                    className={`
                                                        relative w-full p-4 rounded-2xl border-2 text-left
                                                        transition-all duration-200
                                                        ${isSelected
                                                            ? `${cfg.selectedBorder} bg-gradient-to-r ${cfg.selectedBg} shadow-md scale-[1.01]`
                                                            : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                                                        }
                                                    `}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-2xl leading-none">{cfg.icon}</span>
                                                        <div className="flex-1 min-w-0">
                                                            <div className={`font-semibold text-sm ${isSelected ? cfg.selectedText : "text-gray-800"}`}>
                                                                {cfg.label}
                                                                {status === "ongoing" && (
                                                                    <span className="ml-2 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">
                                                                        default
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="text-xs text-gray-500 mt-0.5">{cfg.desc}</div>
                                                        </div>
                                                        {isSelected && (
                                                            <div className={`w-5 h-5 rounded-full ${cfg.checkBg} flex items-center justify-center shrink-0`}>
                                                                <Check className="w-3 h-3 text-white stroke-[3]" />
                                                            </div>
                                                        )}
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {/* Order summary */}
                                    <div className="rounded-2xl bg-gray-50 border border-gray-100 p-4">
                                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                                            Order Summary
                                        </p>
                                        <SummaryRow label="Container"   value={formData.container_type   ? CONTAINER_LABELS[formData.container_type]  : "—"} />
                                        <SummaryRow label="Water Type"  value={formData.water_type        ? WATER_LABELS[formData.water_type]           : "—"} />
                                        <SummaryRow label="Customer"    value={formData.customer_name     || "—"} />
                                        {formData.customer_address && (
                                            <SummaryRow label="Address"  value={formData.customer_address} />
                                        )}
                                        <SummaryRow label="Payment"     value={formData.payment_method    ? PAYMENT_LABELS[formData.payment_method]     : "—"} />
                                        <SummaryRow label="Fulfillment" value={formData.fulfillment_type  ? FULFILLMENT_LABELS[formData.fulfillment_type] : "—"} />
                                        <SummaryRow label="Date"        value={format(new Date(), "MMMM d, yyyy")} />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* ── Navigation ── */}
                        <div className="flex justify-between mt-6 pt-5 border-t border-gray-100">
                            <Button
                                variant="outline"
                                onClick={currentStep === 1 ? () => router.back() : goBack}
                                className="gap-2 border-gray-200 text-gray-600 hover:bg-gray-50"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                {currentStep === 1 ? "Cancel" : "Back"}
                            </Button>

                            {currentStep < STEPS.length ? (
                                <Button
                                    onClick={goNext}
                                    disabled={!canProceed()}
                                    className="gap-2 bg-[#2FA9D9] hover:bg-[#2195c0] text-white shadow-lg shadow-[#2FA9D9]/30 disabled:opacity-40 disabled:shadow-none"
                                >
                                    Next
                                    <ArrowRight className="w-4 h-4" />
                                </Button>
                            ) : (
                                <Button
                                    onClick={handleSubmit}
                                    disabled={isSubmitting}
                                    className={`
                                        gap-2 text-white shadow-lg px-6 disabled:opacity-40 disabled:shadow-none
                                        ${
                                            formData.initial_status === "delivered"
                                                ? "bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 shadow-emerald-500/30"
                                                : formData.initial_status === "cancelled"
                                                ? "bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 shadow-rose-500/30"
                                                : "bg-gradient-to-r from-[#2FA9D9] to-[#1e8fbd] hover:from-[#2195c0] hover:to-[#1a7da8] shadow-[#2FA9D9]/30"
                                        }
                                    `}
                                >
                                    {isSubmitting ? (
                                        <>
                                            <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                            Saving…
                                        </>
                                    ) : (
                                        <>
                                            <Check className="w-4 h-4 stroke-[3]" />
                                            Save Order
                                        </>
                                    )}
                                </Button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Bottom breathing room */}
                <div className="h-8" />
            </div>
        </div>
    );
}

// ─── Page Export ──────────────────────────────────────────────────────────────

export default function NewLogPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-gradient-to-br from-[#2FA9D9] to-[#0d6a96] flex items-center justify-center">
                <div className="text-white text-sm">Loading…</div>
            </div>
        }>
            <MultiStepForm />
        </Suspense>
    );
}
