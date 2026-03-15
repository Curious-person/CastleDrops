"use client";

import {
    Field,
    FieldGroup,
    FieldError,
    FieldLabel
} from "@/components/ui/field";
import { usePathname, useSearchParams } from "next/navigation";
import { useDebouncedCallback } from "use-debounce";
import { Textarea } from "@/components/ui/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { PhilippinePeso, Plus, Search, PenBoxIcon, Trash, Eye } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import * as z from "zod";
import DataTable, { type Column } from "../components/DataTable";
import StatCard from "../components/StatCard";
import PrintableDailyLogs from "../components/PrintableDailyLogs";
import { Button } from "../components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { createLog, deleteLog, updateLog } from "./actions/logs";
import { format } from "date-fns";

const logSchema = z.object({
    log_date: z.string().min(1, "Log date is required"),
    start_time: z.string().min(1, "Start time is required"),
    end_time: z.string().min(1, "End time is required"),
    opening_reading: z.coerce.number().gt(0, "Opening reading must be greater than 0"),
    closing_reading: z.coerce.number().gt(0, "Closing reading must be greater than 0"),
    user_notes: z.string().optional()
}).refine((data) => data.closing_reading >= data.opening_reading, {
    message: "Closing reading must be greater than or equal to opening reading",
    path: ["closing_reading"]
});

type LogFormValues = z.infer<typeof logSchema>;

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

export default function DailyLogsClient({ initialData }: { initialData: DailyLog[] }) {
    const router = useRouter();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [selectedLog, setSelectedLog] = useState<DailyLog | null>(null);
    const [editingLog, setEditingLog] = useState<DailyLog | null>(null);
    const pathname = usePathname();
    const searchParams = useSearchParams();

    type LogFormInput = z.input<typeof logSchema>;
    type LogFormOutput = z.output<typeof logSchema>;

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors }
    } = useForm<LogFormInput, any, LogFormOutput>({
        resolver: zodResolver(logSchema),
        defaultValues: {
            log_date: new Date().toISOString().split("T")[0],
            start_time: "08:00",
            end_time: "17:00",
            opening_reading: undefined,
            closing_reading: undefined,
            user_notes: ""
        }
    });

    const resetToDefaults = () => {
        reset({
            log_date: new Date().toISOString().split("T")[0],
            start_time: "08:00",
            end_time: "17:00",
            opening_reading: undefined,
            closing_reading: undefined,
            user_notes: ""
        });
    };

    const onSubmit: SubmitHandler<LogFormValues> = async (data: LogFormValues) => {
        setIsSubmitting(true);
        try {
            const result = editingLog
                ? await updateLog(editingLog.id, data)
                : await createLog(data);

            if (result.success) {
                setIsModalOpen(false);
                setEditingLog(null);
                resetToDefaults();
                router.refresh();
            }
        } catch (error) {
            console.error("Error submitting log:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleOpenAdd = () => {
        setEditingLog(null);
        resetToDefaults();
        setIsModalOpen(true);
    };

    const handleOpenView = (log: DailyLog) => {
        setSelectedLog(log);
        setIsViewModalOpen(true);
    };

    const handleOpenEdit = (log: DailyLog) => {
        setSelectedLog(log);
        setEditingLog(log);
        reset({
            log_date: log.log_date,
            start_time: log.start_time,
            end_time: log.end_time,
            opening_reading: log.opening_reading,
            closing_reading: log.closing_reading,
            user_notes: log.user_notes === "-" || log.user_notes === "—" ? "" : log.user_notes
        });
        setIsModalOpen(true);
    };

    const handleOpenDelete = (log: DailyLog) => {
        setSelectedLog(log);
        setIsDeleteModalOpen(true);
    };

    const handleDelete = async () => {
        if (!selectedLog) return;

        setIsDeleting(true);
        try {
            const result = await deleteLog(selectedLog.id);
            if (result.success) {
                setIsDeleteModalOpen(false);
                setSelectedLog(null);
                router.refresh();
            }
        } catch (error) {
            console.error("Error deleting log:", error);
        } finally {
            setIsDeleting(false);
        }
    };

    const columns: Column<DailyLog>[] = [
        {
            title: "Date",
            key: "log_date",
            render: (value) => (
                <div className="font-medium flex flex-col">
                    <span className="font-medium">
                        {format(new Date(String(value)), "EEEE, MMM d, yyyy")}
                    </span>
                    <span className="text-xs text-gray-600">
                        {new Date(String(value)).toLocaleDateString()}
                    </span>
                </div>
            )
        },
        {
            title: "Start", key: "start_time"
        },
        { title: "End", key: "end_time" },
        { title: "Opening", key: "opening_reading" },
        { title: "Closing", key: "closing_reading" },
        { title: "Usage", key: "daily_usage" },
        { title: "Notes", key: "user_notes" },
        {
            title: "Actions",
            key: "id",
            render: (_value, item: DailyLog) => (
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleOpenView(item)}>
                        <Eye className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleOpenEdit(item)}>
                        <PenBoxIcon className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleOpenDelete(item)}>
                        <Trash className="w-4 h-4" />
                    </Button>
                </div>

            )
        }
    ];

    const handleSearch = useDebouncedCallback((term: string) => {
        const params = new URLSearchParams(searchParams.toString());
        if (term) {
            params.set("query", term);
        } else {
            params.delete("query");
        }
        router.push(`${pathname}?${params.toString()}`);
    }, 300);

    const handleSort = (value: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("sort", value);
        router.push(`${pathname}?${params.toString()}`);
    }

    return (
        <>
            <div className="p-8 print:hidden">
                <div className="mb-4 flex justify-between items-center">
                    <div className="p-6 rounded-xl bg-white w-full">
                        <Tabs defaultValue="today" className="w-100">
                            <TabsList>
                                <TabsTrigger value="today">Today</TabsTrigger>
                                <TabsTrigger value="week">Week</TabsTrigger>
                                <TabsTrigger value="month">Month</TabsTrigger>
                                <TabsTrigger value="year">Year</TabsTrigger>
                            </TabsList>
                            <div className="mb-6 flex gap-4">
                                <StatCard
                                    title="Total Revenue"
                                    value="₱16,050.89"
                                    change="+20.1%"
                                    positive={true}
                                    icon={PhilippinePeso}
                                />
                                <StatCard
                                    title="Total Revenue"
                                    value="₱16,050.89"
                                    change="+20.1%"
                                    positive={true}
                                    icon={PhilippinePeso}
                                />
                            </div>
                            <TabsContent value="password">Change your password here.</TabsContent>
                        </Tabs>
                    </div>
                </div>

                <div className="p-6 rounded-xl bg-white">
                    <div className="flex gap-2">
                        <div className="mb-6 flex items-center relative max-w-md">
                            <Input
                                defaultValue={searchParams.get("query")?.toString()}
                                onChange={(e) => handleSearch(e.target.value)}
                                placeholder="Search logs..."
                                className="pr-10" />
                            <Search className="w-4 h-4 absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        </div>

                        <div className="mb-6">
                            <Select
                                onValueChange={handleSort}
                                defaultValue={searchParams.get("sort") || undefined}
                            >
                                <SelectTrigger className="w-45">
                                    <SelectValue placeholder="Sort by" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="option1">Newest</SelectItem>
                                    <SelectItem value="option2">Highest Usage</SelectItem>
                                    <SelectItem value="option3">Lowest Usage</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <Button onClick={handleOpenAdd}>
                            <Plus className="w-4 h-4 mr-1" />
                            Add an Entry
                        </Button>
                    </div>

                    <DataTable columns={columns} data={initialData} />
                </div>

                <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                    <DialogContent side="right">
                        <DialogHeader>
                            <DialogTitle>{editingLog ? "Edit Operation Log" : "Today's Operation Log"}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
                            <FieldGroup>
                                <Field>
                                    <FieldLabel>Log Date</FieldLabel>
                                    <Input type="date" placeholder="Log Date" {...register("log_date")} />
                                    {errors.log_date && <FieldError>{errors.log_date.message}</FieldError>}
                                </Field>
                                <div className="grid grid-cols-2 gap-4">
                                    <Field>
                                        <FieldLabel>Start Time</FieldLabel>
                                        <Input type="time" placeholder="Start Time" {...register("start_time")} />
                                        {errors.start_time && <FieldError>{errors.start_time.message}</FieldError>}
                                    </Field>
                                    <Field>
                                        <FieldLabel>End Time</FieldLabel>
                                        <Input type="time" placeholder="End Time" {...register("end_time")} />
                                        {errors.end_time && <FieldError>{errors.end_time.message}</FieldError>}
                                    </Field>
                                </div>
                                <Field>
                                    <FieldLabel>Opening Reading</FieldLabel>
                                    <Input type="number" step="any" placeholder="Opening Reading" {...register("opening_reading")} />
                                    {errors.opening_reading && <FieldError>{errors.opening_reading.message}</FieldError>}
                                </Field>
                                <Field>
                                    <FieldLabel>Closing Reading</FieldLabel>
                                    <Input type="number" step="any" placeholder="Closing Reading" {...register("closing_reading")} />
                                    {errors.closing_reading && <FieldError>{errors.closing_reading.message}</FieldError>}
                                </Field>

                                <Field>
                                    <FieldLabel>User Notes</FieldLabel>
                                    <Textarea id="textarea-message" placeholder="Type your notes here." {...register("user_notes")} />
                                    {errors.user_notes && <FieldError>{errors.user_notes.message}</FieldError>}
                                </Field>
                            </FieldGroup>
                            <DialogFooter>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                        setIsModalOpen(false);
                                        setEditingLog(null);
                                        resetToDefaults();
                                    }}
                                >
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={isSubmitting}>
                                    {isSubmitting ? "Saving..." : editingLog ? "Update Log" : "Save Log"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Log Details</DialogTitle>
                        </DialogHeader>
                        {selectedLog && (
                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between border-b pb-2"><span className="text-gray-500">Date</span><span>{format(new Date(selectedLog.log_date), "MMMM d, yyyy")}</span></div>
                                <div className="flex justify-between border-b pb-2"><span className="text-gray-500">Start Time</span><span>{selectedLog.start_time}</span></div>
                                <div className="flex justify-between border-b pb-2"><span className="text-gray-500">End Time</span><span>{selectedLog.end_time}</span></div>
                                <div className="flex justify-between border-b pb-2"><span className="text-gray-500">Opening Reading</span><span>{selectedLog.opening_reading}</span></div>
                                <div className="flex justify-between border-b pb-2"><span className="text-gray-500">Closing Reading</span><span>{selectedLog.closing_reading}</span></div>
                                <div className="flex justify-between border-b pb-2"><span className="text-gray-500">Daily Usage</span><span>{selectedLog.daily_usage}</span></div>
                                <div>
                                    <p className="text-gray-500 mb-1">Notes</p>
                                    <p className="rounded-md border p-3 bg-gray-50">{selectedLog.user_notes || "-"}</p>
                                </div>
                            </div>
                        )}
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsViewModalOpen(false)}>
                                Close
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Delete Log Entry</DialogTitle>
                        </DialogHeader>
                        <p className="text-sm text-gray-600">
                            This action cannot be undone. Are you sure you want to delete this log entry?
                        </p>
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsDeleteModalOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                variant="destructive"
                                onClick={handleDelete}
                                disabled={isDeleting}
                            >
                                {isDeleting ? "Deleting..." : "Delete"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
            <PrintableDailyLogs logs={initialData} />
        </>
    );
}
