import { LucideIcon } from "lucide-react";

type StatCardProps = {
    title: string;
    value: string;
    change: string;
    positive?: boolean;
    icon: LucideIcon;
    iconBg?: string;
    iconColor?: string;
};

export default function StatCard({
    title,
    value,
    change,
    positive = true,
    icon: Icon,
    iconBg = "bg-sky-50",
    iconColor = "text-[#2FA9D9]",
}: StatCardProps) {
    const isGrowth = change.startsWith("+") || change.startsWith("-");

    return (
        <div className="bg-white border border-gray-100 rounded-xl p-4 flex items-start gap-3">
            <div className={`w-10 h-10 rounded-lg ${iconBg} flex items-center justify-center ${iconColor} shrink-0`}>
                <Icon className="w-5 h-5" />
            </div>
            <div>
                <p className="text-xs text-gray-500 font-medium font-sans">{title}</p>
                <p className="text-xl font-bold text-gray-900 mt-0.5">{value}</p>
                <p className="text-[10px] text-gray-400 mt-1">
                    {isGrowth ? (
                        <>
                            <span className={positive ? "text-emerald-500 font-semibold" : "text-rose-500 font-semibold"}>
                                {change}
                            </span>{" "}
                            from last month
                        </>
                    ) : (
                        <span>{change} orders</span>
                    )}
                </p>
            </div>
        </div>
    );
}

