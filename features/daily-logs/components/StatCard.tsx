import { LucideIcon } from "lucide-react";

type StatCardProps = {
    title: string;
    value: string;
    change: string;
    positive?: boolean;
    icon: LucideIcon;
};

export default function StatCard({ title, value, change, positive = true, icon: Icon }: StatCardProps) {
    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6 w-full sm:w-72 flex-shrink-0">
            <div className="flex justify-between items-start mb-4">
                <span className="text-gray-700 font-semibold text-sm sm:text-base">{title}</span>
                <div className="bg-blue-50 p-2 rounded-lg">
                    <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
                </div>
            </div>
            <p className="text-2xl sm:text-4xl font-bold text-gray-900 tracking-tight">{value}</p>
            <p className={`mt-1 text-xs sm:text-sm font-medium ${positive ? "text-blue-500" : "text-red-500"}`}>
                {change} <span className="text-gray-400 font-normal">from last month</span>
            </p>
        </div>
    );
}
