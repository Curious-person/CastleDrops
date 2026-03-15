import { format } from "date-fns";

type DailyLog = {
    id: number;
    log_date: string;
    start_time: string;
    end_time: string;
    opening_reading: number;
    closing_reading: number;
    daily_usage: number;
    user_notes: string;
};

type PrintableDailyLogsProps = {
    logs: DailyLog[];
};

export default function PrintableDailyLogs({ logs }: PrintableDailyLogsProps) {
    const totalUsage = logs.reduce((sum, log) => sum + Number(log.daily_usage || 0), 0);

    return (
        <section className="hidden print:block p-8 text-black">
            <div className="mb-6 border-b pb-4">
                <h1 className="text-2xl font-bold">Daily Logs Report</h1>
                <p className="text-sm">Generated on {format(new Date(), "MMMM d, yyyy h:mm a")}</p>
                <p className="text-sm">Total entries: {logs.length}</p>
                <p className="text-sm">Total usage: {totalUsage.toFixed(2)}</p>
            </div>

            <table className="w-full border-collapse text-sm">
                <thead>
                    <tr>
                        <th className="border border-gray-400 p-2 text-left">Date</th>
                        <th className="border border-gray-400 p-2 text-left">Start</th>
                        <th className="border border-gray-400 p-2 text-left">End</th>
                        <th className="border border-gray-400 p-2 text-right">Opening</th>
                        <th className="border border-gray-400 p-2 text-right">Closing</th>
                        <th className="border border-gray-400 p-2 text-right">Usage</th>
                        <th className="border border-gray-400 p-2 text-left">Notes</th>
                    </tr>
                </thead>
                <tbody>
                    {logs.map((log) => (
                        <tr key={log.id}>
                            <td className="border border-gray-300 p-2">{format(new Date(log.log_date), "MMM d, yyyy")}</td>
                            <td className="border border-gray-300 p-2">{log.start_time}</td>
                            <td className="border border-gray-300 p-2">{log.end_time}</td>
                            <td className="border border-gray-300 p-2 text-right">{log.opening_reading}</td>
                            <td className="border border-gray-300 p-2 text-right">{log.closing_reading}</td>
                            <td className="border border-gray-300 p-2 text-right">{log.daily_usage}</td>
                            <td className="border border-gray-300 p-2">{log.user_notes || "-"}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </section>
    );
}
