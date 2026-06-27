"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import {
    ArrowLeft, ArrowRight, Check,
    Package, Droplets, CreditCard, Truck, Flag,
    Circle, Square, Droplet, Waves, Smartphone,
    Banknote, Landmark, Store, Clock, CheckCircle2, XCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";

// ─── Types ────────────────────────────────────────────────────────────────────

type ContainerType = "round" | "flat";
type WaterType = "alkaline" | "mineral";
type PaymentMethod = "gcash" | "cash" | "bank_transfer" | "credit";
type FulfillmentType = "delivery" | "pickup";
type OrderStatus = "ongoing" | "delivered" | "cancelled";

interface FormData {
    container_type: ContainerType | null;
    quantity: number;
    water_quantity: number;
    water_type: WaterType | null;
    customer_id: string | null;
    customer_name: string;
    customer_address: string;
    payment_method: PaymentMethod | null;
    fulfillment_type: FulfillmentType | null;
    initial_status: OrderStatus;
}

// ─── Pricing Config ───────────────────────────────────────────────────────────

const CONTAINER_GALLONS: Record<ContainerType, number> = {
    round: 5,
    flat:  5,
};

const WATER_PRICE_PER_GALLON: Record<WaterType, number> = {
    alkaline: 50,
    mineral:  35,
};

// ─── Step Config ──────────────────────────────────────────────────────────────

const STEPS = [
    { id: 1, title: "Container Type",  subtitle: "What type of container?",      icon: Package    },
    { id: 2, title: "Water Type",      subtitle: "What type of water?",           icon: Droplets   },
    { id: 3, title: "Payment Method",  subtitle: "How will they pay?",            icon: CreditCard },
    { id: 4, title: "Fulfillment",     subtitle: "Delivery or pick-up?",          icon: Truck      },
    { id: 5, title: "Order Status",    subtitle: "Set the initial order status",  icon: Flag       },
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

const STATUS_CONFIG: Record<OrderStatus, { icon: React.ReactNode; label: string; desc: string; selectedBorder: string; selectedBg: string; selectedText: string; checkBg: string }> = {
    ongoing: {
        icon:          <Clock className="w-6 h-6 text-[#2FA9D9]" />,
        label:         "Ongoing",
        desc:          "Order is active and in progress",
        selectedBorder: "border-[#2FA9D9]",
        selectedBg:    "from-[#2FA9D9]/8 to-[#76D4F9]/5",
        selectedText:  "text-[#2FA9D9]",
        checkBg:       "bg-[#2FA9D9]",
    },
    delivered: {
        icon:          <CheckCircle2 className="w-6 h-6 text-emerald-600" />,
        label:         "Delivered",
        desc:          "Order has already been delivered",
        selectedBorder: "border-emerald-500",
        selectedBg:    "from-emerald-50 to-emerald-50/50",
        selectedText:  "text-emerald-600",
        checkBg:       "bg-emerald-500",
    },
    cancelled: {
        icon:          <XCircle className="w-6 h-6 text-rose-600" />,
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
    wide = false,
}: {
    selected: boolean;
    onClick: () => void;
    icon: React.ReactNode;
    label: string;
    desc: string;
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
            <div className="mb-3 leading-none">{icon}</div>
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

    const searchParams = useSearchParams();
    const sessionId = searchParams.get("sessionId");
    const sessionAddress = searchParams.get("address");
    const customerName = searchParams.get("customerName");
    const customerId = searchParams.get("customerId");

    const [formData, setFormData] = useState<FormData>({
        container_type:   null,
        quantity:         1,
        water_quantity:   1,
        water_type:       null,
        customer_id:      customerId || null,
        customer_name:    customerName || "",
        customer_address: sessionAddress || "",
        payment_method:   null,
        fulfillment_type: null,
        initial_status:   "ongoing",
    });



    const canProceed = (): boolean => {
        switch (currentStep) {
            case 1: return formData.container_type !== null && formData.quantity > 0;
            case 2: return formData.water_type !== null && formData.water_quantity > 0;
            case 3: return formData.payment_method !== null;
            case 4: return formData.fulfillment_type !== null;
            case 5: return true; // always has a default (ongoing)
            default: return false;
        }
    };


    const calculateTotalPrice = (): number => {
        if (!formData.water_type || !formData.container_type) return 0;
        const gallons = CONTAINER_GALLONS[formData.container_type];
        const pricePerGallon = WATER_PRICE_PER_GALLON[formData.water_type];
        return formData.quantity * formData.water_quantity * gallons * pricePerGallon;
    };

    const goNext = () => {
        if (!canProceed()) return;
        setCurrentStep((p) => Math.min(p + 1, STEPS.length));
    };

    const goBack = () => {
        setCurrentStep((p) => Math.max(p - 1, 1));
    };


    const handleSubmit = async () => {
        if (!canProceed() || isSubmitting) return;
        setIsSubmitting(true);
        try {
            const today = new Date();
            const log_date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

            const newLog = {
                log_date,
                container_type:   formData.container_type,
                quantity:         formData.quantity * formData.water_quantity,
                water_type:       formData.water_type,
                price_per_gallon: formData.water_type ? WATER_PRICE_PER_GALLON[formData.water_type] : null,
                total_gallons:    formData.container_type ? (formData.quantity * formData.water_quantity) * CONTAINER_GALLONS[formData.container_type] : null,
                total_price:      calculateTotalPrice(),
                customer_id:      formData.customer_id,
                customer_name:    formData.customer_name,
                customer_address: formData.customer_address,
                payment_method:   formData.payment_method,
                fulfillment_type: formData.fulfillment_type,
                status:           formData.initial_status,
                session_id:       sessionId,
                session_address:  sessionAddress,
            };

            // Stage in sessionStorage
            const staged = JSON.parse(sessionStorage.getItem("staged_session_logs") || "[]");
            staged.push(newLog);
            sessionStorage.setItem("staged_session_logs", JSON.stringify(staged));

            // Redirect back with all session info to keep modal open
            const params = new URLSearchParams({
                sessionOpen: "true",
                sessionId: sessionId || "",
                address: sessionAddress || "",
                customerName: customerName || "",
                customerId: customerId || ""
            });
            
            router.push(`/orders?${params.toString()}`);
            router.refresh();
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

                            {/* Step 1 — Container Type + Quantity */}
                            {currentStep === 1 && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <OptionCard
                                            selected={formData.container_type === "round"}
                                            onClick={() => setFormData((p) => ({ ...p, container_type: "round" }))}
                                            icon={<Circle className="w-8 h-8 text-[#2FA9D9]" />}
                                            label="Round"
                                            desc="Cylindrical gallon container"
                                        />
                                        <OptionCard
                                            selected={formData.container_type === "flat"}
                                            onClick={() => setFormData((p) => ({ ...p, container_type: "flat" }))}
                                            icon={<Square className="w-8 h-8 text-[#2FA9D9]" />}
                                            label="Flat"
                                            desc="Flat / rectangular container"
                                        />
                                    </div>
                                    {formData.container_type && (
                                        <div className="flex items-center gap-3 p-4 rounded-2xl bg-gray-50 border border-gray-100">
                                            <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                                                Quantity:
                                            </label>
                                            <div className="flex items-center gap-2 flex-1">
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData((p) => ({ ...p, quantity: Math.max(1, p.quantity - 1) }))}
                                                    className="w-9 h-9 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors font-semibold"
                                                >
                                                    −
                                                </button>
                                                <Input
                                                    type="number"
                                                    min="1"
                                                    value={formData.quantity}
                                                    onChange={(e) => setFormData((p) => ({ ...p, quantity: Math.max(1, parseInt(e.target.value) || 1) }))}
                                                    className="w-20 text-center font-semibold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData((p) => ({ ...p, quantity: p.quantity + 1 }))}
                                                    className="w-9 h-9 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors font-semibold"
                                                >
                                                    +
                                                </button>
                                            </div>
                                            <span className="text-xs text-gray-500 whitespace-nowrap">
                                                {formData.quantity} container{formData.quantity > 1 ? 's' : ''}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Step 2 — Water Type */}
                            {currentStep === 2 && (
                                <>
                                    <div className="grid grid-cols-2 gap-4">
                                        <OptionCard
                                            selected={formData.water_type === "alkaline"}
                                            onClick={() => setFormData((p) => ({ ...p, water_type: "alkaline" }))}
                                            icon={<Droplet className="w-8 h-8 text-[#2FA9D9]" />}
                                            label="Alkaline"
                                            desc="pH-balanced purified water"
                                        />
                                        <OptionCard
                                            selected={formData.water_type === "mineral"}
                                            onClick={() => setFormData((p) => ({ ...p, water_type: "mineral" }))}
                                            icon={<Waves className="w-8 h-8 text-[#2FA9D9]" />}
                                            label="Mineral"
                                            desc="Natural mineral spring water"
                                        />
                                    </div>
                                    {formData.water_type && (
                                        <div className="flex items-center gap-3 p-4 rounded-2xl bg-gray-50 border border-gray-100 mt-4">
                                            <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                                                Water Qty:
                                            </label>
                                            <div className="flex items-center gap-2 flex-1">
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData((p) => ({ ...p, water_quantity: Math.max(1, p.water_quantity - 1) }))}
                                                    className="w-9 h-9 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors font-semibold"
                                                >
                                                    −
                                                </button>
                                                <Input
                                                    type="number"
                                                    min="1"
                                                    value={formData.water_quantity}
                                                    onChange={(e) => setFormData((p) => ({ ...p, water_quantity: Math.max(1, parseInt(e.target.value) || 1) }))}
                                                    className="w-20 text-center font-semibold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData((p) => ({ ...p, water_quantity: p.water_quantity + 1 }))}
                                                    className="w-9 h-9 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors font-semibold"
                                                >
                                                    +
                                                </button>
                                            </div>
                                            <span className="text-xs text-gray-500 whitespace-nowrap">
                                                {formData.water_quantity} refill{formData.water_quantity > 1 ? 's' : ''}
                                            </span>
                                        </div>
                                    )}
                                </>
                            )}

                            {/* Step 3 — Payment Method */}
                            {currentStep === 3 && (
                                <div className="grid grid-cols-2 gap-3">
                                    <OptionCard
                                        selected={formData.payment_method === "gcash"}
                                        onClick={() => setFormData((p) => ({ ...p, payment_method: "gcash" }))}
                                        icon={<Smartphone className="w-8 h-8 text-[#2FA9D9]" />}
                                        label="GCash"
                                        desc="Mobile wallet payment"
                                    />
                                    <OptionCard
                                        selected={formData.payment_method === "cash"}
                                        onClick={() => setFormData((p) => ({ ...p, payment_method: "cash" }))}
                                        icon={<Banknote className="w-8 h-8 text-[#2FA9D9]" />}
                                        label="Cash"
                                        desc="Physical cash on hand"
                                    />
                                    <OptionCard
                                        selected={formData.payment_method === "bank_transfer"}
                                        onClick={() => setFormData((p) => ({ ...p, payment_method: "bank_transfer" }))}
                                        icon={<Landmark className="w-8 h-8 text-[#2FA9D9]" />}
                                        label="Bank Transfer"
                                        desc="Online bank payment"
                                    />
                                    <OptionCard
                                        selected={formData.payment_method === "credit"}
                                        onClick={() => setFormData((p) => ({ ...p, payment_method: "credit" }))}
                                        icon={<CreditCard className="w-8 h-8 text-[#2FA9D9]" />}
                                        label="Credit / Card"
                                        desc="Credit or debit card"
                                    />
                                </div>
                            )}

                            {/* Step 4 — Fulfillment */}
                            {currentStep === 4 && (
                                <div className="grid grid-cols-2 gap-4">
                                    <OptionCard
                                        selected={formData.fulfillment_type === "delivery"}
                                        onClick={() => setFormData((p) => ({ ...p, fulfillment_type: "delivery" }))}
                                        icon={<Truck className="w-8 h-8 text-[#2FA9D9]" />}
                                        label="Delivery"
                                        desc="Deliver to customer's address"
                                    />
                                    <OptionCard
                                        selected={formData.fulfillment_type === "pickup"}
                                        onClick={() => setFormData((p) => ({ ...p, fulfillment_type: "pickup" }))}
                                        icon={<Store className="w-8 h-8 text-[#2FA9D9]" />}
                                        label="Pick-up"
                                        desc="Customer picks up in-store"
                                    />
                                </div>
                            )}

                            {/* Step 5 — Order Status + Summary */}
                            {currentStep === 5 && (
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
                                        {formData.container_type && (
                                            <SummaryRow label="Container Qty" value={`${formData.quantity} container${formData.quantity > 1 ? "s" : ""}`} />
                                        )}
                                        <SummaryRow label="Water Type"  value={formData.water_type        ? WATER_LABELS[formData.water_type]           : "—"} />
                                        {formData.water_type && (
                                            <SummaryRow label="Water Qty" value={`${formData.water_quantity} refill${formData.water_quantity > 1 ? "s" : ""}`} />
                                        )}
                                        {formData.water_type && formData.container_type && (
                                            <SummaryRow label="Price per gallon" value={`₱${WATER_PRICE_PER_GALLON[formData.water_type]}`} />
                                        )}
                                        {formData.container_type && (
                                            <SummaryRow label="Total gallons" value={`${formData.quantity * formData.water_quantity * CONTAINER_GALLONS[formData.container_type]} gal`} />
                                        )}
                                        <div className="flex justify-between items-center text-sm py-2 mt-2 pt-2 border-t border-gray-200">
                                            <span className="font-semibold text-gray-700">Total Price</span>
                                            <span className="font-bold text-lg text-[#2FA9D9]">
                                                ₱{calculateTotalPrice().toLocaleString()}
                                            </span>
                                        </div>
                                        {formData.water_type && formData.container_type && (
                                            <div className="text-xs text-gray-500 text-right mt-1">
                                                ({formData.quantity} container × {formData.water_quantity} refill × {CONTAINER_GALLONS[formData.container_type]} gal × ₱{WATER_PRICE_PER_GALLON[formData.water_type]}/gal)
                                            </div>
                                        )}
                                        <div className="border-t border-gray-200 mt-3 pt-3">
                                            <SummaryRow label="Customer"    value={formData.customer_name     || "—"} />
                                            {formData.customer_address && (
                                                <SummaryRow label="Address"  value={formData.customer_address} />
                                            )}
                                            <SummaryRow label="Payment"     value={formData.payment_method    ? PAYMENT_LABELS[formData.payment_method]     : "—"} />
                                            <SummaryRow label="Fulfillment" value={formData.fulfillment_type  ? FULFILLMENT_LABELS[formData.fulfillment_type] : "—"} />
                                            <SummaryRow label="Date"        value={format(new Date(), "MMMM d, yyyy")} />
                                        </div>
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


