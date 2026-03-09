"use client";

import {
    Field,
    FieldDescription,
    FieldGroup,
    FieldError,
    FieldLabel
} from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { PhilippinePeso, Plus, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import * as z from "zod";
import DataTable from "../components/DataTable";
import StatCard from "../components/StatCard";
import { Button } from "../components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { createLog } from "./actions/logs";

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

const columns = [
    { title: "Date", key: "log_date" },
    { title: "Start", key: "start_time" },
    { title: "End", key: "end_time" },
    { title: "Opening", key: "opening_reading" },
    { title: "Closing", key: "closing_reading" },
    { title: "Usage", key: "daily_usage" },
    { title: "Notes", key: "user_notes" }
];

export default function DailyLogsClient({ initialData }: { initialData: any[] }) {
    const router = useRouter();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

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

    const onSubmit: SubmitHandler<LogFormValues> = async (data: LogFormValues) => {
        setIsSubmitting(true);
        try {
            // 2. Call the action directly (no more fetch/URL needed!)
            const result = await createLog(data);

            if (result.success) {
                setIsModalOpen(false);
                reset();
            }
        } catch (error) {
            console.error("Error submitting log:", error);
            // Optional: show an error toast here
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <div className="p-8">
            <div className="mb-4 flex justify-between items-center">
                <Tabs defaultValue="account" className="w-[400px]">
                    <TabsList>
                        <TabsTrigger value="today">Today</TabsTrigger>
                        <TabsTrigger value="week">Week</TabsTrigger>
                        <TabsTrigger value="month">Month</TabsTrigger>
                        <TabsTrigger value="year">Year</TabsTrigger>
                    </TabsList>
                    <TabsContent value="account">Make changes to your account here.</TabsContent>
                    <TabsContent value="password">Change your password here.</TabsContent>
                </Tabs>
                <Button onClick={() => setIsModalOpen(true)}>
                    <Plus className="w-4 h-4 mr-1" />
                    Add Log
                </Button>
            </div>

            <div className="mb-6 flex gap-4">
                <StatCard
                    title="Total Revenue"
                    value="₱16,050.89"
                    change="+20.1%"
                    positive={true}
                    icon={PhilippinePeso}
                />
            </div>

            <div className="flex gap-2">
                <div className="mb-6 flex items-center relative max-w-md">
                    <Input placeholder="Search logs..." className="pr-10" />
                    <Search className="w-4 h-4 absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                </div>

                <div className="mb-6">
                    <Select>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Select an option" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="option1">Option 1</SelectItem>
                            <SelectItem value="option2">Option 2</SelectItem>
                            <SelectItem value="option3">Option 3</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>


            <DataTable columns={columns} data={initialData} caption="Daily Usage Logs" />

            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Today's Operation Log</DialogTitle>
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
                            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? "Saving..." : "Save Log"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}
