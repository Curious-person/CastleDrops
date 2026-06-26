import { ReactNode } from "react"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table"

export type Column<T> = {
    title: string
    key: keyof T | string
    render?: (value: any, item: T) => ReactNode
    className?: string
}

export type DataTableProps<T> = {
    columns: Column<T>[]
    data: T[]
    keyExtractor: (item: T) => string
    emptyIcon?: ReactNode
    emptyTitle?: string
    emptyDescription?: string
    renderMobileItem?: (item: T) => ReactNode
    onRowClick?: (item: T) => void
}

export default function DataTable<T>({
    columns,
    data,
    keyExtractor,
    emptyIcon,
    emptyTitle = "No data found",
    emptyDescription = "",
    renderMobileItem,
    onRowClick
}: DataTableProps<T>) {
    const isEmpty = data.length === 0

    return (
        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
            {/* Desktop View */}
            <div className={renderMobileItem ? "hidden md:block" : "block"}>
                <Table>
                    <TableHeader className="bg-gray-50/50">
                        <TableRow>
                            {columns.map((column, idx) => (
                                <TableHead key={String(column.key) || idx} className={column.className}>
                                    {column.title}
                                </TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isEmpty ? (
                            <TableRow>
                                <TableCell colSpan={columns.length} className="h-40 text-center text-gray-500">
                                    <div className="flex flex-col items-center justify-center">
                                        {emptyIcon && <div className="mb-2">{emptyIcon}</div>}
                                        <p className="font-medium">{emptyTitle}</p>
                                        <p className="text-xs text-gray-400 mt-1">{emptyDescription}</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            data.map((item) => (
                                <TableRow 
                                    key={keyExtractor(item)}
                                    onClick={() => onRowClick && onRowClick(item)}
                                    className={onRowClick ? "cursor-pointer hover:bg-gray-50/50 transition-colors" : ""}
                                >
                                    {columns.map((column, idx) => {
                                        const cellValue = column.key in (item as any) ? (item as any)[column.key] : undefined;
                                        return (
                                            <TableCell key={String(column.key) || idx} className={column.className}>
                                                {column.render
                                                    ? column.render(cellValue, item)
                                                    : String(cellValue ?? "")}
                                            </TableCell>
                                        );
                                    })}
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Mobile View */}
            {renderMobileItem && (
                <div className="block md:hidden divide-y divide-gray-100">
                    {isEmpty ? (
                        <div className="p-8 text-center text-gray-500">
                            {emptyIcon && <div className="mx-auto mb-2 w-max">{emptyIcon}</div>}
                            <p className="font-medium">{emptyTitle}</p>
                            <p className="text-xs text-gray-400 mt-1">{emptyDescription}</p>
                        </div>
                    ) : (
                        data.map((item) => (
                            <div 
                                key={keyExtractor(item)}
                                onClick={() => onRowClick && onRowClick(item)}
                                className={onRowClick ? "cursor-pointer active:bg-gray-50 transition-colors" : ""}
                            >
                                {renderMobileItem(item)}
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    )
}
