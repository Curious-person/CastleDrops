"use client"

import {
    Table,
    TableBody,
    TableCaption,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "./ui/table"

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
                {data.map((item, index) => (
                    <TableRow key={index}>
                        {columns.map((column) => (
                            <TableCell key={String(column.key)}>
                                {column.render
                                    ? column.render(item[column.key], item)
                                    : String(item[column.key] ?? "")}
                            </TableCell>
                        ))}
                    </TableRow>
                ))}
            </TableBody>
            </Table>
        </div>
    )
}