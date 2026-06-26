"use client";

import { useState } from "react";
import { format } from "date-fns";
import {
    Droplets, Plus, Search, Trash, Edit,
    AlertTriangle, Check, CheckCircle2, Waves, Droplet,
    TrendingDown, Info, Calendar, Filter, Trash2
} from "lucide-react";
import PageContainer from "@/components/PageContainer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import DataTable, { Column } from "@/components/DataTable";
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

// Types
type WaterType = "alkaline" | "mineral";

interface WaterLog {
    id: string;
    log_date: string;
    water_type: WaterType;
    start_reading: number;
    end_reading: number;
    notes: string;
}

// Initial Static Data
const INITIAL_LOGS: WaterLog[] = [
    { id: "1", log_date: "2026-06-26", water_type: "alkaline", start_reading: 15240, end_reading: 15490, notes: "Standard daily reading" },
    { id: "2", log_date: "2026-06-26", water_type: "mineral", start_reading: 24800, end_reading: 25150, notes: "Peak delivery hours" },
    { id: "3", log_date: "2026-06-25", water_type: "alkaline", start_reading: 14980, end_reading: 15240, notes: "Normal operations" },
    { id: "4", log_date: "2026-06-25", water_type: "mineral", start_reading: 24500, end_reading: 24800, notes: "Normal operational cycle" },
    { id: "5", log_date: "2026-06-24", water_type: "alkaline", start_reading: 14750, end_reading: 14980, notes: "Routine check successful" },
    { id: "6", log_date: "2026-06-24", water_type: "mineral", start_reading: 24120, end_reading: 24500, notes: "Filter backwash conducted in morning" }
];

// Mock POS Transaction Data (Insights derived from orders sales volume)
const MOCK_POS_SALES = {
    alkaline: 690, // Gallons sold
    mineral: 980   // Gallons sold
};

export default function WaterLogs() {
    const [logs, setLogs] = useState<WaterLog[]>(INITIAL_LOGS);
    const [searchQuery, setSearchQuery] = useState("");
    const [typeFilter, setTypeFilter] = useState<"all" | WaterType>("all");

    // Modal state
    const [isOpen, setIsOpen] = useState(false);
    const [editingLog, setEditingLog] = useState<WaterLog | null>(null);
    const [formData, setFormData] = useState<Omit<WaterLog, "id">>({
        log_date: format(new Date(), "yyyy-MM-dd"),
        water_type: "alkaline",
        start_reading: 0,
        end_reading: 0,
        notes: ""
    });

    // Delete confirmation state
    const [deleteId, setDeleteId] = useState<string | null>(null);

    // CRUD Actions
    const handleOpenCreate = () => {
        setEditingLog(null);
        setFormData({
            log_date: format(new Date(), "yyyy-MM-dd"),
            water_type: "alkaline",
            start_reading: 0,
            end_reading: 0,
            notes: ""
        });
        setIsOpen(true);
    };

    const handleEdit = (log: WaterLog) => {
        setEditingLog(log);
        setFormData({
            log_date: log.log_date,
            water_type: log.water_type,
            start_reading: log.start_reading,
            end_reading: log.end_reading,
            notes: log.notes
        });
        setIsOpen(true);
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.end_reading < formData.start_reading) {
            alert("End reading cannot be less than start reading.");
            return;
        }

        if (editingLog) {
            setLogs((prev) =>
                prev.map((log) => (log.id === editingLog.id ? { ...log, ...formData } : log))
            );
        } else {
            const newLog: WaterLog = {
                id: Math.random().toString(36).substring(2, 9),
                ...formData
            };
            setLogs((prev) => [newLog, ...prev]);
        }
        setIsOpen(false);
    };

    const handleDelete = (id: string) => {
        setLogs((prev) => prev.filter((log) => log.id !== id));
        setDeleteId(null);
    };

    // Calculate dynamic insights based on current log entries
    const alkalineUsed = logs
        .filter((l) => l.water_type === "alkaline")
        .reduce((sum, l) => sum + (l.end_reading - l.start_reading), 0);

    const mineralUsed = logs
        .filter((l) => l.water_type === "mineral")
        .reduce((sum, l) => sum + (l.end_reading - l.start_reading), 0);

    // Compute variance between meter usage and transactional order sales (sql.md comparison)
    const alkalineVariance = Math.max(0, alkalineUsed - MOCK_POS_SALES.alkaline);
    const alkalineVariancePct = alkalineUsed > 0 ? (alkalineVariance / alkalineUsed) * 100 : 0;

    const mineralVariance = Math.max(0, mineralUsed - MOCK_POS_SALES.mineral);
    const mineralVariancePct = mineralUsed > 0 ? (mineralVariance / mineralUsed) * 100 : 0;

    // Filtering
    const filteredLogs = logs.filter((log) => {
        const matchesSearch =
            log.log_date.includes(searchQuery) ||
            log.notes.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesType = typeFilter === "all" || log.water_type === typeFilter;
        return matchesSearch && matchesType;
    });

    const columns: Column<WaterLog>[] = [
        {
            title: "Date",
            key: "log_date",
            className: "w-[15%]",
            render: (value) => (
                <div className="flex items-center gap-1.5 text-gray-900 font-medium">
                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                    {format(new Date(value as string), "MMM d, yyyy")}
                </div>
            )
        },
        {
            title: "Water Type",
            key: "water_type",
            className: "w-[15%]",
            render: (value) => (
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                    value === "alkaline" ? "bg-sky-100 text-sky-700" : "bg-emerald-100 text-emerald-700"
                }`}>
                    {value === "alkaline" ? "Alkaline" : "Mineral"}
                </span>
            )
        },
        {
            title: "Start Reading",
            key: "start_reading",
            className: "w-[15%] text-gray-700",
            render: (value) => `${Number(value).toLocaleString()} gal`
        },
        {
            title: "End Reading",
            key: "end_reading",
            className: "w-[15%] text-gray-700",
            render: (value) => `${Number(value).toLocaleString()} gal`
        },
        {
            title: "Water Used",
            key: "waterUsed",
            className: "w-[15%] font-bold text-[#2FA9D9]",
            render: (_, item) => `${(item.end_reading - item.start_reading).toLocaleString()} gal`
        },
        {
            title: "Notes",
            key: "notes",
            className: "w-[15%] text-gray-500 max-w-[200px] truncate",
            render: (value) => (
                <span title={value as string}>{value ? (value as string) : "—"}</span>
            )
        },
        {
            title: "Actions",
            key: "actions",
            className: "w-[10%] text-right",
            render: (_, item) => (
                <div className="flex justify-end gap-1.5">
                    <Button variant="outline" size="icon-sm" onClick={() => handleEdit(item)} className="hover:text-[#2FA9D9]">
                        <Edit className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="outline" size="icon-sm" onClick={() => setDeleteId(item.id)} className="hover:text-rose-600">
                        <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                </div>
            )
        }
    ];

    const renderMobileItem = (log: WaterLog) => {
        const waterUsed = log.end_reading - log.start_reading;
        return (
            <div className="p-4 space-y-3">
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            log.water_type === "alkaline" ? "bg-sky-100 text-sky-700" : "bg-emerald-100 text-emerald-700"
                        }`}>
                            {log.water_type === "alkaline" ? "Alkaline" : "Mineral"}
                        </span>
                        <span className="text-xs text-gray-400 font-medium">
                            {format(new Date(log.log_date), "MMMM d, yyyy")}
                        </span>
                    </div>
                    <div className="flex gap-1">
                        <Button variant="outline" size="icon-xs" onClick={() => handleEdit(log)} className="hover:text-[#2FA9D9]">
                            <Edit className="w-3 h-3" />
                        </Button>
                        <Button variant="outline" size="icon-xs" onClick={() => setDeleteId(log.id)} className="hover:text-rose-600">
                            <Trash2 className="w-3 h-3" />
                        </Button>
                    </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs bg-gray-50 rounded-lg p-2.5">
                    <div>
                        <span className="text-gray-400 block text-[9px] uppercase font-semibold">Start</span>
                        <span className="text-gray-700 font-medium">{log.start_reading.toLocaleString()} gal</span>
                    </div>
                    <div>
                        <span className="text-gray-400 block text-[9px] uppercase font-semibold">End</span>
                        <span className="text-gray-700 font-medium">{log.end_reading.toLocaleString()} gal</span>
                    </div>
                    <div>
                        <span className="text-[#2FA9D9] block text-[9px] uppercase font-semibold">Used</span>
                        <span className="text-gray-900 font-bold">{waterUsed.toLocaleString()} gal</span>
                    </div>
                </div>
                {log.notes && (
                    <div className="text-xs text-gray-500 bg-gray-50/50 p-2 rounded border border-gray-100/50">
                        <span className="font-medium text-gray-600 block text-[9px] uppercase tracking-wider mb-0.5">Notes</span>
                        {log.notes}
                    </div>
                )}
            </div>
        );
    };

    return (
        <PageContainer title="Water Logs">
            <div className="space-y-6 p-4 sm:p-6 lg:p-8">
                
                {/* ─── INSIGHTS CARDS (GRID) ─── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Alkaline Used */}
                    <div className="bg-white border border-gray-100 rounded-xl p-4 flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-sky-50 flex items-center justify-center text-sky-600 shrink-0">
                            <Droplet className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 font-medium">Alkaline Metered</p>
                            <p className="text-xl font-bold text-gray-900 mt-0.5">{alkalineUsed.toLocaleString()} gal</p>
                            <p className="text-[10px] text-gray-400 mt-1">Total operational reading</p>
                        </div>
                    </div>

                    {/* Mineral Used */}
                    <div className="bg-white border border-gray-100 rounded-xl p-4 flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                            <Waves className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 font-medium">Mineral Metered</p>
                            <p className="text-xl font-bold text-gray-900 mt-0.5">{mineralUsed.toLocaleString()} gal</p>
                            <p className="text-[10px] text-gray-400 mt-1">Total operational reading</p>
                        </div>
                    </div>

                    {/* Alkaline Variance */}
                    <div className="bg-white border border-gray-100 rounded-xl p-4 flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                            alkalineVariancePct > 5 ? "bg-rose-50 text-rose-600" : "bg-sky-50 text-sky-600"
                        }`}>
                            {alkalineVariancePct > 5 ? (
                                <AlertTriangle className="w-5 h-5" />
                            ) : (
                                <Info className="w-5 h-5" />
                            )}
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 font-medium">Alkaline Variance</p>
                            <p className="text-xl font-bold text-gray-900 mt-0.5">
                                {alkalineVariance.toLocaleString()} gal ({alkalineVariancePct.toFixed(1)}%)
                            </p>
                            <p className="text-[10px] text-gray-400 mt-1">
                                Used vs {MOCK_POS_SALES.alkaline.toLocaleString()} gal sold
                            </p>
                        </div>
                    </div>

                    {/* Mineral Variance */}
                    <div className="bg-white border border-gray-100 rounded-xl p-4 flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                            mineralVariancePct > 5 ? "bg-rose-50 text-rose-600" : "bg-sky-50 text-sky-600"
                        }`}>
                            {mineralVariancePct > 5 ? (
                                <AlertTriangle className="w-5 h-5" />
                            ) : (
                                <Info className="w-5 h-5" />
                            )}
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 font-medium">Mineral Variance</p>
                            <p className="text-xl font-bold text-gray-900 mt-0.5">
                                {mineralVariance.toLocaleString()} gal ({mineralVariancePct.toFixed(1)}%)
                            </p>
                            <p className="text-[10px] text-gray-400 mt-1">
                                Used vs {MOCK_POS_SALES.mineral.toLocaleString()} gal sold
                            </p>
                        </div>
                    </div>
                </div>

                {/* ─── CONTROLS TOOLBAR ─── */}
                <div className="bg-white border border-gray-100 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1 max-w-2xl">
                        {/* Search */}
                        <div className="relative flex-1">
                            <Input
                                placeholder="Search by date or notes..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 w-full"
                            />
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        </div>

                        {/* Filter */}
                        <div className="w-full sm:w-[180px]">
                            <Select
                                value={typeFilter}
                                onValueChange={(val) => setTypeFilter(val as any)}
                            >
                                <SelectTrigger className="w-full">
                                    <div className="flex items-center gap-2">
                                        <Filter className="w-3.5 h-3.5 text-gray-400" />
                                        <SelectValue placeholder="Filter type" />
                                    </div>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Water Types</SelectItem>
                                    <SelectItem value="alkaline">Alkaline Only</SelectItem>
                                    <SelectItem value="mineral">Mineral Only</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Add Button */}
                    <Button
                        onClick={handleOpenCreate}
                        className="bg-[#2FA9D9] hover:bg-[#2195c0] text-white w-full md:w-auto shrink-0"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Daily Log
                    </Button>
                </div>

                {/* ─── DATA TABLE & CARDS ─── */}
                <DataTable
                    columns={columns}
                    data={filteredLogs}
                    keyExtractor={(item) => item.id}
                    emptyIcon={<Droplets className="w-10 h-10 text-gray-200" />}
                    emptyTitle="No water logs found"
                    emptyDescription="Try resetting filters or add a new log"
                    renderMobileItem={renderMobileItem}
                />

                {/* ─── ADD/EDIT DIALOG ─── */}
                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogContent className="sm:max-w-md max-w-[95vw]">
                        <DialogHeader>
                            <DialogTitle className="text-lg font-bold text-gray-900">
                                {editingLog ? "Edit Water Log" : "Add Daily Water Log"}
                            </DialogTitle>
                            <DialogDescription>
                                Input start and end flowmeter index readings to log water usage.
                            </DialogDescription>
                        </DialogHeader>

                        <form onSubmit={handleSave} className="space-y-4 py-2">
                            {/* Date */}
                            <div className="grid gap-2">
                                <Label htmlFor="log_date" className="text-xs font-semibold text-gray-700">Log Date</Label>
                                <Input
                                    id="log_date"
                                    type="date"
                                    required
                                    value={formData.log_date}
                                    onChange={(e) => setFormData((p) => ({ ...p, log_date: e.target.value }))}
                                />
                            </div>

                            {/* Water Type */}
                            <div className="grid gap-2">
                                <Label htmlFor="water_type" className="text-xs font-semibold text-gray-700">Water Type</Label>
                                <Select
                                    value={formData.water_type}
                                    onValueChange={(val) => setFormData((p) => ({ ...p, water_type: val as WaterType }))}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="alkaline">Alkaline Water</SelectItem>
                                        <SelectItem value="mineral">Mineral Water</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                {/* Start Reading */}
                                <div className="grid gap-2">
                                    <Label htmlFor="start_reading" className="text-xs font-semibold text-gray-700">Start Reading (gal)</Label>
                                    <Input
                                        id="start_reading"
                                        type="number"
                                        min="0"
                                        required
                                        value={formData.start_reading || ""}
                                        placeholder="0"
                                        onChange={(e) => setFormData((p) => ({ ...p, start_reading: parseInt(e.target.value) || 0 }))}
                                    />
                                </div>

                                {/* End Reading */}
                                <div className="grid gap-2">
                                    <Label htmlFor="end_reading" className="text-xs font-semibold text-gray-700">End Reading (gal)</Label>
                                    <Input
                                        id="end_reading"
                                        type="number"
                                        min="0"
                                        required
                                        value={formData.end_reading || ""}
                                        placeholder="0"
                                        onChange={(e) => setFormData((p) => ({ ...p, end_reading: parseInt(e.target.value) || 0 }))}
                                    />
                                </div>
                            </div>

                            {/* Notes */}
                            <div className="grid gap-2">
                                <Label htmlFor="notes" className="text-xs font-semibold text-gray-700">Operational Notes</Label>
                                <Textarea
                                    id="notes"
                                    placeholder="Add any notes (e.g. system cleaning, flushing, leak updates)"
                                    value={formData.notes}
                                    onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))}
                                />
                            </div>

                            <DialogFooter className="pt-4 flex-col sm:flex-row gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setIsOpen(false)}
                                    className="w-full sm:w-auto"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    className="bg-[#2FA9D9] hover:bg-[#2195c0] text-white w-full sm:w-auto"
                                >
                                    Save Entry
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* ─── DELETE CONFIRM DIALOG ─── */}
                <Dialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
                    <DialogContent className="sm:max-w-md max-w-[95vw]">
                        <DialogHeader>
                            <DialogTitle className="text-lg font-bold text-gray-900">Delete Water Log</DialogTitle>
                            <DialogDescription>
                                Are you sure you want to delete this daily water log? This action cannot be undone.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter className="pt-4 flex-col sm:flex-row gap-2">
                            <Button
                                variant="outline"
                                onClick={() => setDeleteId(null)}
                                className="w-full sm:w-auto"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={() => deleteId && handleDelete(deleteId)}
                                className="bg-rose-600 hover:bg-rose-700 text-white w-full sm:w-auto"
                            >
                                Yes, Delete Log
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </PageContainer>
    );
}
