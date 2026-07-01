"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import {
    ArrowLeft, ArrowRight, Check,
    Package, CreditCard, Truck, Flag,
    Droplet, Waves, Smartphone,
    Banknote, Landmark, Store, Clock, CheckCircle2, XCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createOrderAndRecordPayment } from "@/app/actions/payments";
import { getStationPricing } from "@/app/actions/settings";

// ─── Types ────────────────────────────────────────────────────────────────────

type ContainerType = "round" | "flat";
type WaterType = "alkaline" | "mineral";
type PaymentMethod = "gcash" | "cash" | "bank_transfer" | "credit";
type FulfillmentType = "delivery" | "pickup";
type OrderStatus = "ongoing" | "delivered" | "cancelled";

interface OrderItem {
    water_type: WaterType;
    container_type: ContainerType;
    quantity: number;
    water_quantity: number;
}

interface FormData {
    items: OrderItem[];
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
    flat: 5,
};

interface PricingRates {
    alkaline_round: number;
    alkaline_flat: number;
    mineral_round: number;
    mineral_flat: number;
}

const DEFAULT_RATES: PricingRates = {
    alkaline_round: 10,
    alkaline_flat: 9,
    mineral_round: 8,
    mineral_flat: 7,
};

// ─── Step Config ──────────────────────────────────────────────────────────────

const STEPS = [
    { id: 1, title: "Order Items", subtitle: "Select water types & quantities", icon: Package },
    { id: 2, title: "Payment Method", subtitle: "How will they pay?", icon: CreditCard },
    { id: 3, title: "Fulfillment", subtitle: "Delivery or pick-up?", icon: Truck },
    { id: 4, title: "Order Status", subtitle: "Set the initial order status", icon: Flag },
    { id: 5, title: "Payment Status", subtitle: "Record payment details", icon: Banknote },
];

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
    gcash: "GCash",
    cash: "Cash",
    bank_transfer: "Bank Transfer",
    credit: "Credit / Card",
};

const CONTAINER_LABELS: Record<ContainerType, string> = {
    round: "Round",
    flat: "Flat",
};

const WATER_LABELS: Record<WaterType, string> = {
    alkaline: "Alkaline",
    mineral: "Mineral",
};

const STATUS_CONFIG: Record<OrderStatus, { icon: React.ReactNode; label: string; desc: string; selectedBorder: string; selectedBg: string; selectedText: string; checkBg: string }> = {
    ongoing: {
        icon: <Clock className="w-6 h-6 text-[#2FA9D9]" />,
        label: "Ongoing",
        desc: "Order is active and in progress",
        selectedBorder: "border-[#2FA9D9]",
        selectedBg: "from-[#2FA9D9]/8 to-[#76D4F9]/5",
        selectedText: "text-[#2FA9D9]",
        checkBg: "bg-[#2FA9D9]",
    },
    delivered: {
        icon: <CheckCircle2 className="w-6 h-6 text-emerald-600" />,
        label: "Delivered",
        desc: "Order has already been delivered",
        selectedBorder: "border-emerald-500",
        selectedBg: "from-emerald-50 to-emerald-50/50",
        selectedText: "text-emerald-600",
        checkBg: "bg-emerald-500",
    },
    cancelled: {
        icon: <XCircle className="w-6 h-6 text-rose-600" />,
        label: "Cancelled",
        desc: "Order was cancelled before fulfillment",
        selectedBorder: "border-rose-500",
        selectedBg: "from-rose-50 to-rose-50/50",
        selectedText: "text-rose-600",
        checkBg: "bg-rose-500",
    },
};

// ─── Helper Components ────────────────────────────────────────────────────────



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
    const [rates, setRates] = useState<PricingRates>(DEFAULT_RATES);
    const [paymentAmount, setPaymentAmount] = useState<string>("");

    useEffect(() => {
        let active = true;
        async function loadRates() {
            try {
                const data = await getStationPricing();
                if (active) {
                    setRates(data);
                }
            } catch (error) {
                console.error("Failed to load pricing from settings:", error);
            }
        }
        loadRates();
        return () => {
            active = false;
        };
    }, []);

    const getRate = (waterType: WaterType, containerType: ContainerType): number => {
        const key = `${waterType}_${containerType}` as const;
        return rates[key] ?? DEFAULT_RATES[key];
    };

    const searchParams = useSearchParams();
    const sessionId = searchParams.get("sessionId");
    const sessionAddress = searchParams.get("address");
    const customerName = searchParams.get("customerName");
    const customerId = searchParams.get("customerId");

    const [formData, setFormData] = useState<FormData>({
        items: [
            { water_type: "alkaline", container_type: "round", quantity: 0, water_quantity: 1 },
            { water_type: "alkaline", container_type: "flat", quantity: 0, water_quantity: 1 },
            { water_type: "mineral", container_type: "round", quantity: 0, water_quantity: 1 },
            { water_type: "mineral", container_type: "flat", quantity: 0, water_quantity: 1 },
        ],
        customer_id: customerId || null,
        customer_name: customerName || "",
        customer_address: sessionAddress || "",
        payment_method: null,
        fulfillment_type: null,
        initial_status: "ongoing",
    });

    const canProceed = (): boolean => {
        switch (currentStep) {
            case 1:
                return formData.items.some(item => item.quantity > 0 && item.water_quantity > 0);
            case 2:
                return formData.payment_method !== null;
            case 3:
                return formData.fulfillment_type !== null;
            case 4:
                return true;
            case 5:
                return true;
            default:
                return false;
        }
    };

    const calculateItemPrice = (item: OrderItem): number => {
        const ratePerGallon = getRate(item.water_type, item.container_type);
        const totalGallons = item.quantity * item.water_quantity * CONTAINER_GALLONS[item.container_type];
        return totalGallons * ratePerGallon;
    };

    const calculateTotalPrice = (): number => {
        return formData.items.reduce((sum, item) => sum + calculateItemPrice(item), 0);
    };

    const goNext = () => {
        if (!canProceed()) return;
        if (currentStep === 4) {
            setPaymentAmount(calculateTotalPrice().toString());
        }
        setCurrentStep((p) => Math.min(p + 1, STEPS.length));
    };

    const goBack = () => {
        setCurrentStep((p) => Math.max(p - 1, 1));
    };

    const handleSubmit = async (skipPayment: boolean = false) => {
        if (!canProceed() || isSubmitting) return;
        setIsSubmitting(true);
        try {
            const today = new Date();
            const log_date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

            const activeItems = formData.items.filter(item => item.quantity > 0);

            const orderRows = activeItems.map(item => {
                const gallons = CONTAINER_GALLONS[item.container_type];
                const ratePerGallon = getRate(item.water_type, item.container_type);
                const total_gallons = item.quantity * item.water_quantity * gallons;
                const total_price = total_gallons * ratePerGallon;

                return {
                    log_date,
                    container_type: item.container_type,
                    quantity: item.quantity * item.water_quantity,
                    water_type: item.water_type,
                    price_per_gallon: ratePerGallon,
                    total_gallons,
                    total_price,
                    customer_id: formData.customer_id,
                    customer_name: formData.customer_name,
                    customer_address: formData.customer_address,
                    fulfillment_type: formData.fulfillment_type,
                    status: formData.initial_status,
                };
            });

            // If skipped, record 0. Otherwise use the payment input value.
            let initialPaymentAmount = 0;
            if (!skipPayment && paymentAmount !== "") {
                initialPaymentAmount = parseFloat(paymentAmount);
                if (isNaN(initialPaymentAmount)) {
                    initialPaymentAmount = 0;
                }
            }

            const result = await createOrderAndRecordPayment(
                { id: sessionId ?? `session-${Date.now()}`, address: formData.customer_address },
                orderRows,
                initialPaymentAmount,
                formData.payment_method ?? "cash",
                undefined
            );

            if (result.success) {
                // Clear any leftover client-side staged storage
                sessionStorage.removeItem("staged_session_logs");
                router.push("/orders");
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
        <div className="min-h-full w-full flex-1 p-4 sm:p-6">
            {/* Back button */}
            <div className="max-w-lg mx-auto mb-4">
                <Button
                    variant="ghost"
                    onClick={() => router.back()}
                    className="text-[#2FA9D9] hover:text-[#2195c0] hover:bg-[#2FA9D9]/10 gap-2 -ml-2 font-semibold"
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
                            const isDone = step.id < currentStep;
                            const isCurrent = step.id === currentStep;
                            return (
                                <div key={step.id} className="flex items-center flex-1">
                                    <div className="flex flex-col items-center">
                                        <div className={`
                                            w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 border
                                            ${isDone ? "bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-500/10" : ""}
                                            ${isCurrent ? "bg-[#2FA9D9] border-[#2FA9D9] text-white ring-4 ring-[#2FA9D9]/25 shadow-md shadow-[#2FA9D9]/10" : ""}
                                            ${!isDone && !isCurrent ? "bg-gray-100 border-gray-200 text-gray-400" : ""}
                                        `}>
                                            {isDone
                                                ? <Check className="w-4 h-4 stroke-[3]" />
                                                : <Icon className="w-4 h-4" />
                                            }
                                        </div>
                                    </div>
                                    {index < STEPS.length - 1 && (
                                        <div className="flex-1 h-0.5 mx-1.5 rounded-full overflow-hidden bg-gray-200">
                                            <div
                                                className="h-full bg-[#2FA9D9] rounded-full transition-all duration-500"
                                                style={{ width: step.id < currentStep ? "100%" : "0%" }}
                                            />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Progress bar */}
                    <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-[#2FA9D9] rounded-full transition-all duration-500 ease-out"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <div className="flex justify-between mt-1.5 text-gray-500 text-xs font-semibold">
                        <span>{STEPS[currentStep - 1].title}</span>
                        <span>Step {currentStep} of {STEPS.length}</span>
                    </div>
                </div>

                {/* ── Card ── */}
                <div className="bg-white rounded-3xl shadow-xl shadow-sky-900/5 border border-sky-100/50 overflow-hidden">
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

                            {/* Step 1 — Order Items */}
                            {currentStep === 1 && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {formData.items.map((item, index) => {
                                            const isSelected = item.quantity > 0;
                                            const Icon = item.water_type === "alkaline" ? Droplet : Waves;
                                            const ratePerGallon = getRate(item.water_type, item.container_type);
                                            const totalGal = item.quantity * item.water_quantity * CONTAINER_GALLONS[item.container_type];
                                            const itemPrice = calculateItemPrice(item);

                                            return (
                                                <div
                                                    key={index}
                                                    className={`
                                                        p-5 rounded-2xl border-2 text-left transition-all duration-200 flex flex-col justify-between h-full
                                                        ${isSelected
                                                            ? "border-[#2FA9D9] bg-gradient-to-br from-[#2FA9D9]/8 to-[#76D4F9]/5 shadow-[#2FA9D9]/5 scale-[1.01]"
                                                            : "border-gray-200 hover:border-[#2FA9D9]/50 hover:bg-gray-50/50"
                                                        }
                                                    `}
                                                >
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-2 leading-none">
                                                            <div className="w-8 h-8 rounded-lg bg-[#2FA9D9]/10 flex items-center justify-center shrink-0">
                                                                <Icon className="w-4 h-4 text-[#2FA9D9]" />
                                                            </div>
                                                            <div>
                                                                <div className="font-bold text-sm text-gray-800 capitalize">
                                                                    {item.water_type} ({item.container_type})
                                                                </div>
                                                                <div className="text-[10px] text-gray-500 font-medium">
                                                                    ₱{ratePerGallon}/gal • {CONTAINER_GALLONS[item.container_type]} gal
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Quantity Counter for Containers */}
                                                        <div className="flex flex-col gap-2 py-2 border-b border-gray-100/50">
                                                            <span className="text-xs text-gray-600 font-semibold">Containers:</span>
                                                            <div className="flex items-center gap-1.5">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setFormData((p) => {
                                                                        const items = [...p.items];
                                                                        items[index] = { ...items[index], quantity: Math.max(0, items[index].quantity - 1) };
                                                                        return { ...p, items };
                                                                    })}
                                                                    className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors font-bold text-xs"
                                                                >
                                                                    −
                                                                </button>
                                                                <Input
                                                                    type="number"
                                                                    min="0"
                                                                    value={item.quantity}
                                                                    onChange={(e) => {
                                                                        const val = Math.max(0, parseInt(e.target.value) || 0);
                                                                        setFormData((p) => {
                                                                            const items = [...p.items];
                                                                            items[index] = { ...items[index], quantity: val };
                                                                            return { ...p, items };
                                                                        });
                                                                    }}
                                                                    className="w-12 h-7 text-center font-bold text-xs p-0 border-gray-200 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                                />
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setFormData((p) => {
                                                                        const items = [...p.items];
                                                                        items[index] = { ...items[index], quantity: items[index].quantity + 1 };
                                                                        return { ...p, items };
                                                                    })}
                                                                    className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors font-bold text-xs"
                                                                >
                                                                    +
                                                                </button>
                                                            </div>
                                                        </div>

                                                        {/* Refills Counter */}
                                                        {item.quantity > 0 && (
                                                            <div className="flex flex-col gap-2 py-2 animate-in fade-in slide-in-from-top-1">
                                                                <span className="text-xs text-gray-600 font-semibold">Refills:</span>
                                                                <div className="flex items-center gap-1.5">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setFormData((p) => {
                                                                            const items = [...p.items];
                                                                            items[index] = { ...items[index], water_quantity: Math.max(1, items[index].water_quantity - 1) };
                                                                            return { ...p, items };
                                                                        })}
                                                                        className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors font-bold text-xs"
                                                                    >
                                                                        −
                                                                    </button>
                                                                    <Input
                                                                        type="number"
                                                                        min="1"
                                                                        value={item.water_quantity}
                                                                        onChange={(e) => {
                                                                            const val = Math.max(1, parseInt(e.target.value) || 1);
                                                                            setFormData((p) => {
                                                                                const items = [...p.items];
                                                                                items[index] = { ...items[index], water_quantity: val };
                                                                                return { ...p, items };
                                                                            });
                                                                        }}
                                                                        className="w-12 h-7 text-center font-bold text-xs p-0 border-gray-200 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                                    />
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setFormData((p) => {
                                                                            const items = [...p.items];
                                                                            items[index] = { ...items[index], water_quantity: items[index].water_quantity + 1 };
                                                                            return { ...p, items };
                                                                        })}
                                                                        className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors font-bold text-xs"
                                                                    >
                                                                        +
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Item Summary Price */}
                                                    {item.quantity > 0 && (
                                                        <div className="mt-4 pt-3 border-t border-gray-100/50 flex justify-between items-center text-xs font-semibold text-gray-500 animate-in fade-in">
                                                            <span>{totalGal} gal total</span>
                                                            <span className="text-[#2FA9D9] font-bold text-sm">₱{itemPrice.toLocaleString()}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Step 2 — Payment Method */}
                            {currentStep === 2 && (
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

                            {/* Step 3 — Fulfillment */}
                            {currentStep === 3 && (
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

                            {/* Step 4 — Order Status + Summary */}
                            {currentStep === 4 && (
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
                                                            ? `${cfg.selectedBorder} bg-gradient-to-r ${cfg.selectedBg} scale-[1.01]`
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
                                </div>
                            )}

                            {/* Step 5 — Payment Status */}
                            {currentStep === 5 && (
                                <div className="space-y-5">
                                    <div className="rounded-2xl bg-gray-50 border border-gray-100 p-4 space-y-4">
                                        <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                                Mode of Payment
                                            </span>
                                            <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${formData.payment_method === "gcash" ? "bg-blue-100 text-blue-700 border-blue-200" :
                                                formData.payment_method === "cash" ? "bg-green-100 text-green-700 border-green-200" :
                                                    formData.payment_method === "bank_transfer" ? "bg-purple-100 text-purple-700 border-purple-200" :
                                                        "bg-amber-100 text-amber-700 border-amber-200"
                                                }`}>
                                                {formData.payment_method ? PAYMENT_LABELS[formData.payment_method] : "—"}
                                            </span>
                                        </div>

                                        <div className="space-y-1.5">
                                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                                                Item Breakdown
                                            </p>
                                            {formData.items.filter(item => item.quantity > 0).map((item, idx) => {
                                                const cLabel = CONTAINER_LABELS[item.container_type];
                                                const wLabel = WATER_LABELS[item.water_type];
                                                const price = calculateItemPrice(item);
                                                return (
                                                    <div key={idx} className="flex justify-between items-center text-xs py-0.5">
                                                        <span className="text-gray-600 capitalize font-medium">
                                                            {wLabel} ({cLabel}) • {item.quantity} container{item.quantity > 1 ? 's' : ''} × {item.water_quantity} refill{item.water_quantity > 1 ? 's' : ''}
                                                        </span>
                                                        <span className="font-semibold text-gray-800">₱{price.toLocaleString()}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        <div className="flex justify-between items-center text-sm pt-3 border-t border-gray-200 font-bold">
                                            <span className="text-gray-700">Total Price</span>
                                            <span className="text-lg text-[#2FA9D9]">
                                                ₱{calculateTotalPrice().toLocaleString()}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label htmlFor="payment_amount" className="text-xs font-bold text-gray-700">
                                            Amount Paid (₱)
                                        </label>
                                        <div className="relative">
                                            <Input
                                                id="payment_amount"
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                placeholder="0.00"
                                                value={paymentAmount}
                                                onChange={(e) => setPaymentAmount(e.target.value)}
                                                className="pl-8 text-sm animate-none"
                                            />
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-semibold">₱</span>
                                        </div>
                                        <p className="text-[10px] text-gray-400">
                                            Enter the exact amount received from the customer. Click &quot;Skip Payment &amp; Save Order&quot; below if this order is not paid yet.
                                        </p>
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

                            <div className="flex gap-2">
                                {currentStep === 5 && (
                                    <Button
                                        onClick={() => handleSubmit(true)}
                                        disabled={isSubmitting}
                                        variant="outline"
                                        className="border-gray-200 text-gray-600 hover:bg-gray-50"
                                    >
                                        Skip Payment & Save Order
                                    </Button>
                                )}

                                {currentStep < STEPS.length ? (
                                    <Button
                                        onClick={goNext}
                                        disabled={!canProceed()}
                                        className="gap-2 bg-[#2FA9D9] hover:bg-[#2195c0] text-white disabled:opacity-40"
                                    >
                                        Next
                                        <ArrowRight className="w-4 h-4" />
                                    </Button>
                                ) : (
                                    <Button
                                        onClick={() => handleSubmit(false)}
                                        disabled={isSubmitting || !paymentAmount || parseFloat(paymentAmount) < 0}
                                        className={`
                                            gap-2 text-white px-6 disabled:opacity-40
                                            ${formData.initial_status === "delivered"
                                                ? "bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700"
                                                : formData.initial_status === "cancelled"
                                                    ? "bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700"
                                                    : "bg-gradient-to-r from-[#2FA9D9] to-[#1e8fbd] hover:from-[#2195c0] hover:to-[#1a7da8]"
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
            <div className="min-h-full w-full flex-1 flex items-center justify-center bg-[#e7f6fc]">
                <div className="text-gray-500 text-sm font-semibold flex items-center gap-2">
                    <span className="w-5 h-5 border-2 border-gray-300 border-t-[#2FA9D9] rounded-full animate-spin" />
                    Loading…
                </div>
            </div>
        }>
            <MultiStepForm />
        </Suspense>
    );
}


