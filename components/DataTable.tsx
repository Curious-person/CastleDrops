import { ReactNode, Fragment } from "react"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"

export type Column<T> = {
    title: string
    key: keyof T | string
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    
    // Grouping & selection props
    selectedKeys?: string[]
    onSelectedKeysChange?: (keys: string[]) => void
    groupByKey?: string
    renderGroupHeader?: (groupKey: string, groupItems: T[]) => ReactNode
}

export default function DataTable<T>({
    columns,
    data,
    keyExtractor,
    emptyIcon,
    emptyTitle = "No data found",
    emptyDescription = "",
    renderMobileItem,
    onRowClick,
    selectedKeys,
    onSelectedKeysChange,
    groupByKey,
    renderGroupHeader
}: DataTableProps<T>) {
    const isEmpty = data.length === 0

    // Grouping logic if groupByKey is provided
    const grouped = groupByKey
        ? data.reduce((acc, item) => {
              const val = String((item as Record<string, unknown>)[groupByKey] ?? "");
              if (!acc[val]) acc[val] = [];
              acc[val].push(item);
              return acc;
          }, {} as Record<string, T[]>)
        : {};

    const groupKeys = groupByKey
        ? data.reduce((acc, item) => {
              const val = String((item as Record<string, unknown>)[groupByKey] ?? "");
              if (val && !acc.includes(val)) acc.push(val);
              return acc;
          }, [] as string[])
        : [];

    const visibleSessionIds = groupByKey
        ? Array.from(new Set(data.map(item => String((item as Record<string, unknown>)[groupByKey] ?? "")).filter(Boolean)))
        : [];

    const isAllSelected = visibleSessionIds.length > 0 && visibleSessionIds.every(id => selectedKeys?.includes(id));
    const isSomeSelected = visibleSessionIds.length > 0 && visibleSessionIds.some(id => selectedKeys?.includes(id));
    const checkboxChecked = isAllSelected ? true : isSomeSelected ? "indeterminate" : false;

    return (
        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
            {/* Desktop View */}
            <div className={renderMobileItem ? "hidden md:block" : "block"}>
                <Table>
                    <TableHeader className="bg-gray-50/50">
                        <TableRow>
                            {selectedKeys && onSelectedKeysChange && (
                                <TableHead className="w-12 py-3 text-center">
                                    <Checkbox
                                        checked={checkboxChecked}
                                        onCheckedChange={(checked) => {
                                            if (checked) {
                                                const newKeys = Array.from(new Set([...(selectedKeys || []), ...visibleSessionIds]));
                                                onSelectedKeysChange(newKeys);
                                            } else {
                                                onSelectedKeysChange((selectedKeys || []).filter(k => !visibleSessionIds.includes(k)));
                                            }
                                        }}
                                        className="data-[state=checked]:bg-[#2FA9D9] data-[state=checked]:border-[#2FA9D9] border-gray-300 mx-auto"
                                    />
                                </TableHead>
                            )}
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
                                <TableCell colSpan={columns.length + (selectedKeys ? 1 : 0)} className="h-40 text-center text-gray-500">
                                    <div className="flex flex-col items-center justify-center">
                                        {emptyIcon && <div className="mb-2">{emptyIcon}</div>}
                                        <p className="font-medium">{emptyTitle}</p>
                                        <p className="text-xs text-gray-400 mt-1">{emptyDescription}</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            groupByKey && selectedKeys && onSelectedKeysChange ? (
                                groupKeys.map((groupId) => {
                                    const groupItems = grouped[groupId] || [];
                                    const isChecked = selectedKeys.includes(groupId);
                                    return (
                                        <Fragment key={groupId}>
                                            {/* Group Header Row */}
                                            <TableRow className="bg-gray-50/30 hover:bg-gray-50/30 font-medium">
                                                <TableCell className="w-12 py-3 text-center border-b border-gray-100">
                                                    <Checkbox
                                                        checked={isChecked}
                                                        onCheckedChange={(checked) => {
                                                            if (checked) {
                                                                onSelectedKeysChange([...selectedKeys, groupId]);
                                                            } else {
                                                                onSelectedKeysChange(selectedKeys.filter(k => k !== groupId));
                                                            }
                                                        }}
                                                        className="data-[state=checked]:bg-[#2FA9D9] data-[state=checked]:border-[#2FA9D9] border-gray-300 mx-auto"
                                                    />
                                                </TableCell>
                                                <TableCell colSpan={columns.length} className="py-3 border-b border-gray-100">
                                                    {renderGroupHeader ? renderGroupHeader(groupId, groupItems) : <span className="font-mono text-xs">{groupId}</span>}
                                                </TableCell>
                                            </TableRow>
                                            {/* Group Rows */}
                                            {groupItems.map((item) => (
                                                <TableRow 
                                                    key={keyExtractor(item)}
                                                    onClick={() => onRowClick && onRowClick(item)}
                                                    className={onRowClick ? "cursor-pointer hover:bg-gray-50/50 transition-colors" : ""}
                                                >
                                                    <TableCell className="w-12 border-b border-gray-100/50" />
                                                    {columns.map((column, idx) => {
                                                        const itemRecord = item as Record<string, unknown>;
                                                        const cellValue = column.key in itemRecord ? itemRecord[column.key as string] : undefined;
                                                        return (
                                                            <TableCell key={String(column.key) || idx} className={`${column.className || ""} border-b border-gray-100/50`}>
                                                                {column.render
                                                                    ? column.render(cellValue, item)
                                                                    : String(cellValue ?? "")}
                                                            </TableCell>
                                                        );
                                                    })}
                                                </TableRow>
                                            ))}
                                        </Fragment>
                                    );
                                })
                            ) : (
                                data.map((item) => (
                                    <TableRow 
                                        key={keyExtractor(item)}
                                        onClick={() => onRowClick && onRowClick(item)}
                                        className={onRowClick ? "cursor-pointer hover:bg-gray-50/50 transition-colors" : ""}
                                    >
                                        {columns.map((column, idx) => {
                                            const itemRecord = item as Record<string, unknown>;
                                            const cellValue = column.key in itemRecord ? itemRecord[column.key as string] : undefined;
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
                            )
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
                        groupByKey && selectedKeys && onSelectedKeysChange ? (
                            groupKeys.map((groupId) => {
                                const groupItems = grouped[groupId] || [];
                                const isChecked = selectedKeys.includes(groupId);
                                return (
                                    <div key={groupId} className="border-b border-gray-100 last:border-0 bg-white">
                                        {/* Mobile Group Header */}
                                        <div className="flex items-center gap-3 p-3 bg-gray-50/70 border-b border-gray-100">
                                            <Checkbox
                                                checked={isChecked}
                                                onCheckedChange={(checked) => {
                                                    if (checked) {
                                                        onSelectedKeysChange([...selectedKeys, groupId]);
                                                    } else {
                                                        onSelectedKeysChange(selectedKeys.filter(k => k !== groupId));
                                                    }
                                                }}
                                                className="data-[state=checked]:bg-[#2FA9D9] data-[state=checked]:border-[#2FA9D9] border-gray-300 shrink-0"
                                            />
                                            <div className="flex-1 min-w-0">
                                                {renderGroupHeader ? (
                                                    renderGroupHeader(groupId, groupItems)
                                                ) : (
                                                    <span className="font-bold text-sm text-gray-900">{groupId}</span>
                                                )}
                                            </div>
                                        </div>
                                        {/* Mobile Group Items */}
                                        <div className="divide-y divide-gray-100/50 pl-4">
                                            {groupItems.map((item) => (
                                                <div 
                                                    key={keyExtractor(item)}
                                                    onClick={() => onRowClick && onRowClick(item)}
                                                    className={onRowClick ? "cursor-pointer active:bg-gray-50 transition-colors" : ""}
                                                >
                                                    {renderMobileItem(item)}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })
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
                        )
                    )}
                </div>
            )}
        </div>
    )
}
