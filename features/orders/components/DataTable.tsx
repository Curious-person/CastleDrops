"use client"

import {
    Table,
    TableBody,
    TableCaption,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table"
import { Inbox } from "lucide-react"

export type Column<T> = {
    title: string
    key: keyof T
    render?: (value: T[keyof T], item: T) => React.ReactNode
}

type DataTableProps<T> = {
    columns: Column<T>[]
    data: T[]
    caption?: string
}

export default function DataTable<T>({
    columns,
    data,
    caption
}: DataTableProps<T>) {
    const isEmpty = data.length === 0

    return (
        <div className="rounded-md border border-gray-100 overflow-hidden">
        <Table>
            {caption && <TableCaption>{caption}</TableCaption>}

            <TableHeader>
                <TableRow>
                    {columns.map((column) => (
                        <TableHead
                            className="bg-gray-50"
                            key={String(column.key)}>
                            {column.title}
                        </TableHead>
                    ))}
                </TableRow>
            </TableHeader>
            <TableBody>
                {isEmpty ? (
                    <TableRow className="hover:bg-transparent">
                        <TableCell
                            colSpan={columns.length}
                            className="h-48 text-center"
                        >
                            <div className="flex flex-col items-center justify-center text-gray-500">
                                <Inbox className="w-12 h-12 mb-3 opacity-50" />
                                <p className="text-sm font-medium">No logs found</p>
                                <p className="text-xs text-gray-400 mt-1">
                                    Start by adding your first water meter reading
                                </p>
                            </div>
                        </TableCell>
                    </TableRow>
                ) : (
                    data.map((item, index) => (
                        <TableRow key={index}>
                            {columns.map((column) => (
                                <TableCell key={String(column.key)}>
                                    {column.render
                                        ? column.render(item[column.key], item)
                                        : String(item[column.key] ?? "")}
                                </TableCell>
                            ))}
                        </TableRow>
                    ))
                )}
            </TableBody>
            </Table>
        </div>
    )
}
