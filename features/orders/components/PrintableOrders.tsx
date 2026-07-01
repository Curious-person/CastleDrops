import { format } from "date-fns";

type Order = {
    id: number;
    log_date: string;
    container_type: string;
    water_type: string;
    customer_name: string;
    customer_address: string;
    fulfillment_type: string;
};


const FULFILLMENT_LABELS: Record<string, string> = {
    delivery: "Delivery",
    pickup:   "Pick-up",
};

type PrintableOrdersProps = {
    logs: Order[];
};

export default function PrintableOrders({ logs }: PrintableOrdersProps) {
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
                            <td className="border border-gray-300 p-2 text-xs text-gray-500 italic">See session record</td>
                            <td className="border border-gray-300 p-2">{FULFILLMENT_LABELS[log.fulfillment_type] ?? log.fulfillment_type ?? "—"}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </section>
    );
}


