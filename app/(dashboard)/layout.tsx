import Sidebar from "@/components/Sidebar";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex h-screen bg-[#e7f6fc] font-[family-name:var(--font-geist-sans)]">
            <Sidebar />
            <main className="flex-1 flex min-w-0 overflow-y-auto">
                {children}
            </main>
        </div>
    );
}
