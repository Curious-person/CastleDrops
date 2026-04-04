import { format } from "date-fns";

type DailyLog = {
    id: number;
    log_date: string;
    container_type: string;
    water_type: string;
    customer_name: string;
    customer_address: string;
    payment_method: string;
    fulfillment_type: string;
};

const PAYMENT_LABELS: Record<string, string> = {
    gcash:         "GCash",
    cash:          "Cash",
    bank_transfer: "Bank Transfer",
    credit:        "Credit / Card",
};

const FULFILLMENT_LABELS: Record<string, string> = {
    delivery: "Delivery",
    pickup:   "Pick-up",
};

type PrintableDailyLogsProps = {
    logs: DailyLog[];
};

export default function PrintableDailyLogs({ logs }: PrintableDailyLogsProps) {
    return (
        <section className="hidden print:block p-8 text-black">
            <div className="mb-6 border-b pb-4">
                <h1 className="text-2xl font-bold">Daily Orders Report</h1>
                <p className="text-sm">Generated on {format(new Date(), "MMMM d, yyyy h:mm a")}</p>
                <p className="text-sm">Total entries: {logs.length}</p>
            </div>

            <table className="w-full border-collapse text-sm">
                <thead>
                    <tr>
                        <th className="border border-gray-400 p-2 text-left">Date</th>
                        <th className="border border-gray-400 p-2 text-left">Customer</th>
                        <th className="border border-gray-400 p-2 text-left">Address</th>
                        <th className="border border-gray-400 p-2 text-left">Container</th>
                        <th className="border border-gray-400 p-2 text-left">Water</th>
                        <th className="border border-gray-400 p-2 text-left">Payment</th>
                        <th className="border border-gray-400 p-2 text-left">Fulfillment</th>
                    </tr>
                </thead>
                <tbody>
                    {logs.map((log) => (
                        <tr key={log.id}>
                            <td className="border border-gray-300 p-2">{format(new Date(log.log_date), "MMM d, yyyy")}</td>
                            <td className="border border-gray-300 p-2">{log.customer_name || "—"}</td>
                            <td className="border border-gray-300 p-2">{log.customer_address || "—"}</td>
                            <td className="border border-gray-300 p-2 capitalize">{log.container_type || "—"}</td>
                            <td className="border border-gray-300 p-2 capitalize">{log.water_type || "—"}</td>
                            <td className="border border-gray-300 p-2">{PAYMENT_LABELS[log.payment_method] ?? log.payment_method ?? "—"}</td>
                            <td className="border border-gray-300 p-2">{FULFILLMENT_LABELS[log.fulfillment_type] ?? log.fulfillment_type ?? "—"}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </section>
    );
}
