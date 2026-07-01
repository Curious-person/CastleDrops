"use client";

import { useState, useEffect } from "react";
import {
    Users, Plus, Search, Trash2, Edit, Eye, Phone, MapPin, Flag,
    ShoppingBag, Droplet, Waves, SlidersHorizontal, FileText, Loader2
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
import { Separator } from "@/components/ui/separator";

// Import types and actions from server actions
import {
    Customer,
    WaterPreference,
    getCustomers,
    createCustomer,
    updateCustomer,
    deleteCustomer
} from "@/app/actions/customers";

export default function Customers() {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [isMutating, setIsMutating] = useState(false);
    const [apiError, setApiError] = useState("");
    
    const [searchQuery, setSearchQuery] = useState("");
    const [prefFilter, setPrefFilter] = useState<"all" | WaterPreference>("all");

    // Modal States
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    // Form State — water_preference is excluded because it's auto-computed from order history
    const [formData, setFormData] = useState<Omit<Customer, "id" | "total_orders" | "alkaline_orders" | "mineral_orders" | "water_preference">>({
        name: "",
        address: "",
        phone: "",
        landmark: "",
        notes: ""
    });

    const fetchCustomers = async (showLoading = true) => {
        if (showLoading) setIsInitialLoading(true);
        setApiError("");
        try {
            const data = await getCustomers();
            setCustomers(data);
        } catch (err) {
            setApiError((err as Error).message || "Failed to load customers from database.");
        } finally {
            if (showLoading) setIsInitialLoading(false);
        }
    };

    useEffect(() => {
        fetchCustomers();
    }, []);

    // Handle Create Click
    const handleOpenCreate = () => {
        setEditingCustomer(null);
        setFormData({
            name: "",
            address: "",
            phone: "",
            landmark: "",
            notes: ""
        });
        setIsEditOpen(true);
    };

    // Handle Edit Click
    const handleEdit = (customer: Customer, e: React.MouseEvent) => {
        e.stopPropagation(); // Avoid triggering row selection details
        setEditingCustomer(customer);
        setFormData({
            name: customer.name,
            address: customer.address,
            phone: customer.phone,
            landmark: customer.landmark,
            notes: customer.notes
        });
        setIsEditOpen(true);
    };

    // Handle Delete Click
    const handleDeleteClick = (id: string, e: React.MouseEvent) => {
        e.stopPropagation(); // Avoid triggering row selection details
        setDeleteId(id);
    };

    // Confirm Delete Customer
    const confirmDelete = async () => {
        if (deleteId) {
            setIsMutating(true);
            setApiError("");
            try {
                await deleteCustomer(deleteId);
                setCustomers((prev) => prev.filter((c) => c.id !== deleteId));
                // If the deleted customer was open in details modal, close it
                if (selectedCustomer?.id === deleteId) {
                    setIsDetailsOpen(false);
                    setSelectedCustomer(null);
                }
                setDeleteId(null);
            } catch (err) {
                setApiError((err as Error).message || "Failed to delete customer.");
            } finally {
                setIsMutating(false);
            }
        }
    };

    // Handle Save Form (Add or Edit)
    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsMutating(true);
        setApiError("");
        try {
            if (editingCustomer) {
                // Update Existing
                await updateCustomer(editingCustomer.id, formData);
                setCustomers((prev) =>
                    prev.map((c) =>
                        c.id === editingCustomer.id
                            ? { ...c, ...formData }
                            : c
                    )
                );
                // Sync details view if open
                if (selectedCustomer?.id === editingCustomer.id) {
                    setSelectedCustomer((prev) => prev ? { ...prev, ...formData } : null);
                }
                setIsEditOpen(false);
            } else {
                // Add New
                const newCustomer = await createCustomer(formData);
                setCustomers((prev) => [newCustomer, ...prev]);
                setIsEditOpen(false);
            }
        } catch (err) {
            setApiError((err as Error).message || "Failed to save customer.");
        } finally {
            setIsMutating(false);
        }
    };

    // Trigger details modal on row selection
    const handleRowClick = (customer: Customer) => {
        setSelectedCustomer(customer);
        setIsDetailsOpen(true);
    };

    // Filtering & Searching Logic
    const filteredCustomers = customers.filter((c) => {
        const matchesSearch =
            c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (c.address || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
            (c.phone || "").includes(searchQuery) ||
            (c.landmark || "").toLowerCase().includes(searchQuery.toLowerCase());

        const matchesPref = prefFilter === "all" || c.water_preference === prefFilter;

        return matchesSearch && matchesPref;
    });

    // Stat Totals
    const totalCustomers = customers.length;
    const totalOrdersCount = customers.reduce((sum, c) => sum + c.total_orders, 0);
    const alkalineUsers = customers.filter(
        (c) => c.water_preference === "alkaline" || c.water_preference === "both"
    ).length;
    const mineralUsers = customers.filter(
        (c) => c.water_preference === "mineral" || c.water_preference === "both"
    ).length;


    // DataTable columns definition
    const columns: Column<Customer>[] = [
        {
            title: "Customer Name",
            key: "name",
            className: "w-[25%] font-semibold text-gray-900",
            render: (value) => value
        },
        {
            title: "Contact Number",
            key: "phone",
            className: "w-[20%] text-gray-700",
            render: (value) => (
                <div className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-gray-400" />
                    {value || "—"}
                </div>
            )
        },
        {
            title: "Address & Landmark",
            key: "address",
            className: "w-[30%] text-gray-500",
            render: (_, item) => (
                <div className="max-w-[280px]">
                    <p className="truncate text-gray-800" title={item.address}>{item.address || "—"}</p>
                    {item.landmark && (
                        <p className="truncate text-xs text-gray-400 flex items-center gap-1 mt-0.5" title={item.landmark}>
                            <Flag className="w-3 h-3 text-sky-400 shrink-0" />
                            {item.landmark}
                        </p>
                    )}
                </div>
            )
        },
        {
            title: "Preference",
            key: "water_preference",
            className: "w-[15%]",
            render: (value) => {
                let badgeClass = "";
                let badgeLabel = "";
                switch (value) {
                    case "alkaline":
                        badgeClass = "bg-sky-100 text-sky-700";
                        badgeLabel = "Alkaline";
                        break;
                    case "mineral":
                        badgeClass = "bg-emerald-100 text-emerald-700";
                        badgeLabel = "Mineral";
                        break;
                    case "both":
                        badgeClass = "bg-purple-100 text-purple-700";
                        badgeLabel = "Both Types";
                        break;
                    default:
                        badgeClass = "bg-gray-100 text-gray-500";
                        badgeLabel = "No order yet";
                        break;
                }
                return (
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${badgeClass}`}>
                        {badgeLabel}
                    </span>
                );
            }
        },
        {
            title: "Orders",
            key: "total_orders",
            className: "w-[10%] text-center font-medium text-gray-900",
            render: (value) => (
                <div className="flex items-center justify-center gap-1 text-[#2FA9D9]">
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>{value || 0}</span>
                </div>
            )
        },
        {
            title: "Actions",
            key: "actions",
            className: "w-[10%] text-right",
            render: (_, item) => (
                <div className="flex justify-end gap-1.5">
                    <Button
                        variant="outline"
                        size="icon-sm"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleRowClick(item);
                        }}
                        className="hover:text-[#2FA9D9]"
                        title="View Details"
                    >
                        <Eye className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                        variant="outline"
                        size="icon-sm"
                        onClick={(e) => handleEdit(item, e)}
                        className="hover:text-[#2FA9D9]"
                        title="Edit Customer"
                    >
                        <Edit className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                        variant="outline"
                        size="icon-sm"
                        onClick={(e) => handleDeleteClick(item.id, e)}
                        className="hover:text-rose-600"
                        title="Delete Customer"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                </div>
            )
        }
    ];

    // Mobile Card fallback layout
    const renderMobileItem = (customer: Customer) => {
        let badgeClass = "";
        let badgeLabel = "";
        switch (customer.water_preference) {
            case "alkaline":
                badgeClass = "bg-sky-100 text-sky-700";
                badgeLabel = "Alkaline";
                break;
            case "mineral":
                badgeClass = "bg-emerald-100 text-emerald-700";
                badgeLabel = "Mineral";
                break;
            case "both":
                badgeClass = "bg-purple-100 text-purple-700";
                badgeLabel = "Both";
                break;
            default:
                badgeClass = "bg-gray-100 text-gray-500";
                badgeLabel = "No order yet";
                break;
        }

        return (
            <div className="p-4 space-y-3">
                <div className="flex justify-between items-start">
                    <div>
                        <h4 className="font-bold text-gray-900 text-sm leading-snug">{customer.name}</h4>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold mt-1 ${badgeClass}`}>
                            {badgeLabel}
                        </span>
                    </div>
                    <div className="flex gap-1.5">
                        <Button
                            variant="outline"
                            size="icon-xs"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleRowClick(customer);
                            }}
                            className="hover:text-[#2FA9D9]"
                        >
                            <Eye className="w-3 h-3" />
                        </Button>
                        <Button
                            variant="outline"
                            size="icon-xs"
                            onClick={(e) => handleEdit(customer, e)}
                            className="hover:text-[#2FA9D9]"
                        >
                            <Edit className="w-3 h-3" />
                        </Button>
                        <Button
                            variant="outline"
                            size="icon-xs"
                            onClick={(e) => handleDeleteClick(customer.id, e)}
                            className="hover:text-rose-600"
                        >
                            <Trash2 className="w-3 h-3" />
                        </Button>
                    </div>
                </div>

                <div className="space-y-1.5 text-xs text-gray-600 bg-gray-50 rounded-lg p-2.5">
                    <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span>{customer.phone || "No phone number"}</span>
                    </div>
                    <div className="flex items-start gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
                        <span className="truncate">{customer.address || "No address"}</span>
                    </div>
                    {customer.landmark && (
                        <div className="flex items-center gap-1.5 pl-5 text-[11px] text-gray-400">
                            <Flag className="w-3 h-3 text-sky-400 shrink-0" />
                            <span>{customer.landmark}</span>
                        </div>
                    )}
                </div>

                <div className="flex justify-between items-center text-xs text-gray-400">
                    <div className="flex items-center gap-1 text-[#2FA9D9] font-medium">
                        <ShoppingBag className="w-3.5 h-3.5" />
                        <span>{customer.total_orders} Orders</span>
                    </div>
                    {customer.notes && (
                        <span className="text-[10px] text-gray-400 flex items-center gap-1 bg-slate-50 px-1.5 py-0.5 rounded border border-gray-100">
                            <FileText className="w-3 h-3" /> Has Notes
                        </span>
                    )}
                </div>
            </div>
        );
    };

    return (
        <PageContainer title="Customers">
            <div className="space-y-6 p-4 sm:p-6 lg:p-8">
                {apiError && (
                    <div className="p-3 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
                        {apiError}
                    </div>
                )}
                
                {/* ─── STATS CARDS GRID ─── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Total Customers */}
                    <div className="bg-white border border-gray-100 rounded-xl p-4 flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-sky-50 flex items-center justify-center text-sky-600 shrink-0">
                            <Users className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 font-medium font-sans">Total Customers</p>
                            <p className="text-xl font-bold text-gray-900 mt-0.5">{totalCustomers}</p>
                            <p className="text-[10px] text-gray-400 mt-1">Registered clients</p>
                        </div>
                    </div>

                    {/* Total Orders */}
                    <div className="bg-white border border-gray-100 rounded-xl p-4 flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                            <ShoppingBag className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 font-medium font-sans">Total Orders</p>
                            <p className="text-xl font-bold text-gray-900 mt-0.5">{totalOrdersCount}</p>
                            <p className="text-[10px] text-gray-400 mt-1">Aggregated refills</p>
                        </div>
                    </div>

                    {/* Alkaline Users */}
                    <div className="bg-white border border-gray-100 rounded-xl p-4 flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-sky-50/70 flex items-center justify-center text-[#2FA9D9] shrink-0">
                            <Droplet className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 font-medium font-sans">Alkaline Clients</p>
                            <p className="text-xl font-bold text-gray-900 mt-0.5">{alkalineUsers}</p>
                            <p className="text-[10px] text-gray-400 mt-1">Alkaline or both preference</p>
                        </div>
                    </div>

                    {/* Mineral Users */}
                    <div className="bg-white border border-gray-100 rounded-xl p-4 flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-emerald-50/70 flex items-center justify-center text-emerald-500 shrink-0">
                            <Waves className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 font-medium font-sans">Mineral Clients</p>
                            <p className="text-xl font-bold text-gray-900 mt-0.5">{mineralUsers}</p>
                            <p className="text-[10px] text-gray-400 mt-1">Mineral or both preference</p>
                        </div>
                    </div>
                </div>

                {/* ─── CONTROLS TOOLBAR ─── */}
                <div className="bg-white border border-gray-100 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1 max-w-2xl">
                        {/* Search Input */}
                        <div className="relative flex-1">
                            <Input
                                placeholder="Search by name, address, contact, landmark..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 w-full"
                            />
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        </div>

                        {/* Dropdown Filter */}
                        <div className="w-full sm:w-[200px]">
                            <Select
                                value={prefFilter}
                                onValueChange={(val) => setPrefFilter(val as "all" | WaterPreference)}
                            >
                                <SelectTrigger className="w-full">
                                    <div className="flex items-center gap-2">
                                        <SlidersHorizontal className="w-3.5 h-3.5 text-gray-400" />
                                        <SelectValue placeholder="Water Type Preference" />
                                    </div>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Preferences</SelectItem>
                                    <SelectItem value="alkaline">Alkaline Preference</SelectItem>
                                    <SelectItem value="mineral">Mineral Preference</SelectItem>
                                    <SelectItem value="both">Both Types Preference</SelectItem>
                                    <SelectItem value="no_order_yet">No Order Yet</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Add Button */}
                    <Button
                        onClick={handleOpenCreate}
                        className="bg-[#2FA9D9] hover:bg-[#2195c0] text-white w-full md:w-auto shrink-0 transition-colors"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Customer
                    </Button>
                </div>

                {/* ─── CUSTOMERS TABLE ─── */}
                {isInitialLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 bg-white border border-gray-100 rounded-xl space-y-3">
                        <Loader2 className="w-8 h-8 text-[#2FA9D9] animate-spin" />
                        <p className="text-sm text-gray-500 font-medium font-sans animate-pulse">Loading customer directory...</p>
                    </div>
                ) : (
                    <DataTable
                        columns={columns}
                        data={filteredCustomers}
                        keyExtractor={(item) => item.id}
                        onRowClick={handleRowClick}
                        emptyIcon={<Users className="w-10 h-10 text-gray-200" />}
                        emptyTitle="No customers found"
                        emptyDescription="Refine your search or click 'Add Customer' to create one"
                        renderMobileItem={renderMobileItem}
                    />
                )}

                {/* ─── ADD/EDIT DIALOG ─── */}
                <Dialog open={isEditOpen} onOpenChange={(open) => !isMutating && setIsEditOpen(open)}>
                    <DialogContent className="sm:max-w-md max-w-[95vw]">
                        <DialogHeader>
                            <DialogTitle className="text-lg font-bold text-gray-900">
                                {editingCustomer ? "Edit Customer Details" : "Add New Customer"}
                            </DialogTitle>
                            <DialogDescription>
                                Input client contact and address information. These fields map to the system&apos;s customer database schema.
                            </DialogDescription>
                        </DialogHeader>

                        <form onSubmit={handleSave} className="space-y-4 py-2">
                            {/* Customer Name */}
                            <div className="grid gap-2">
                                <Label htmlFor="name" className="text-xs font-semibold text-gray-700">Full Name</Label>
                                <Input
                                    id="name"
                                    placeholder="Juan Dela Cruz"
                                    required
                                    disabled={isMutating}
                                    value={formData.name}
                                    onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                                />
                            </div>

                            {/* Contact Number */}
                            <div className="grid gap-2">
                                <Label htmlFor="phone" className="text-xs font-semibold text-gray-700">Contact Number (Phone)</Label>
                                <Input
                                    id="phone"
                                    type="tel"
                                    placeholder="e.g. 0917 123 4567"
                                    disabled={isMutating}
                                    value={formData.phone}
                                    onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value }))}
                                />
                            </div>

                            {/* Address */}
                            <div className="grid gap-2">
                                <Label htmlFor="address" className="text-xs font-semibold text-gray-700">Delivery Address</Label>
                                <Input
                                    id="address"
                                    placeholder="House #, Street Name, Barangay, City"
                                    required
                                    disabled={isMutating}
                                    value={formData.address}
                                    onChange={(e) => setFormData((p) => ({ ...p, address: e.target.value }))}
                                />
                            </div>

                            {/* Landmark */}
                            <div className="grid gap-2">
                                <Label htmlFor="landmark" className="text-xs font-semibold text-gray-700">Landmark</Label>
                                <Input
                                    id="landmark"
                                    placeholder="e.g. Near Barangay Hall / Opposite Gas Station"
                                    disabled={isMutating}
                                    value={formData.landmark}
                                    onChange={(e) => setFormData((p) => ({ ...p, landmark: e.target.value }))}
                                />
                            </div>

                            {/* Water Preference — auto-determined from order history, not editable */}
                            <div className="grid gap-2">
                                <Label className="text-xs font-semibold text-gray-700">Water Type Preference</Label>
                                <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-md">
                                    <Droplet className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                    <span className="text-xs text-gray-500 leading-snug">
                                        Automatically determined from the customer&apos;s order history. Will show <strong>No order yet</strong> until the first order is placed.
                                    </span>
                                </div>
                            </div>

                            {/* Notes */}
                            <div className="grid gap-2">
                                <Label htmlFor="notes" className="text-xs font-semibold text-gray-700">Client / Delivery Notes</Label>
                                <Textarea
                                    id="notes"
                                    placeholder="Add delivery instructions, container requests, payment preferences, etc."
                                    disabled={isMutating}
                                    value={formData.notes}
                                    onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))}
                                />
                            </div>

                            <DialogFooter className="pt-4 flex-col sm:flex-row gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setIsEditOpen(false)}
                                    disabled={isMutating}
                                    className="w-full sm:w-auto"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={isMutating}
                                    className="bg-[#2FA9D9] hover:bg-[#2195c0] text-white w-full sm:w-auto transition-colors flex items-center justify-center gap-1.5"
                                >
                                    {isMutating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                    Save Customer
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* ─── CUSTOMER DETAILS DIALOG ─── */}
                <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
                    <DialogContent className="sm:max-w-lg max-w-[95vw] max-h-[90vh] overflow-y-auto">
                        {selectedCustomer && (
                            <>
                                <DialogHeader className="text-left">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-lg bg-sky-50 flex items-center justify-center text-[#2FA9D9] shrink-0">
                                            <Users className="w-4 h-4" />
                                        </div>
                                        <span className="text-xs text-gray-400 font-semibold tracking-wider uppercase font-mono">
                                            Customer File
                                        </span>
                                    </div>
                                    <DialogTitle className="text-2xl font-black text-gray-900 mt-1">
                                        {selectedCustomer.name}
                                    </DialogTitle>
                                    <DialogDescription className="text-xs text-gray-400 mt-0.5">
                                        Added to system: {selectedCustomer.created_at ? new Date(selectedCustomer.created_at).toLocaleDateString("en-US", { year: 'numeric', month: 'long', day: 'numeric' }) : "Initial Import"}
                                    </DialogDescription>
                                </DialogHeader>

                                <div className="space-y-6 py-4">
                                    {/* 1. Contact & Location Information */}
                                    <div className="space-y-3">
                                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Contact & Address</h3>
                                        <div className="space-y-2 bg-gray-50 rounded-xl p-3 border border-gray-100">
                                            <div className="flex items-start gap-2.5 text-sm text-gray-700">
                                                <Phone className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                                                <div>
                                                    <span className="text-xs text-gray-400 block">Contact Number</span>
                                                    <span className="font-semibold text-gray-900">{selectedCustomer.phone || "—"}</span>
                                                </div>
                                            </div>
                                            <Separator className="bg-gray-200/50" />
                                            <div className="flex items-start gap-2.5 text-sm text-gray-700">
                                                <MapPin className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                                                <div>
                                                    <span className="text-xs text-gray-400 block">Delivery Address</span>
                                                    <span className="text-gray-900 leading-snug font-medium">{selectedCustomer.address || "—"}</span>
                                                </div>
                                            </div>
                                            {selectedCustomer.landmark && (
                                                <>
                                                    <Separator className="bg-gray-200/50" />
                                                    <div className="flex items-start gap-2.5 text-sm text-gray-700">
                                                        <Flag className="w-4 h-4 text-sky-400 mt-0.5 shrink-0" />
                                                        <div>
                                                            <span className="text-xs text-gray-400 block">Address Landmark</span>
                                                            <span className="text-gray-900 font-medium">{selectedCustomer.landmark}</span>
                                                        </div>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* 2. Order Performance & Water Preference */}
                                    <div className="space-y-3">
                                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Order History & Preference</h3>
                                        <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-1">
                                                    <span className="text-xs text-gray-400 block">Water Preference</span>
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                                        selectedCustomer.water_preference === "alkaline"
                                                            ? "bg-sky-100 text-sky-700"
                                                            : selectedCustomer.water_preference === "mineral"
                                                            ? "bg-emerald-100 text-emerald-700"
                                                            : selectedCustomer.water_preference === "both"
                                                            ? "bg-purple-100 text-purple-700"
                                                            : "bg-gray-100 text-gray-500"
                                                    }`}>
                                                        {selectedCustomer.water_preference === "alkaline"
                                                            ? "Alkaline Water"
                                                            : selectedCustomer.water_preference === "mineral"
                                                            ? "Mineral Water"
                                                            : selectedCustomer.water_preference === "both"
                                                            ? "Both Types"
                                                            : "No order yet"}
                                                    </span>
                                                </div>
                                                <div className="space-y-1">
                                                    <span className="text-xs text-gray-400 block">Total Orders</span>
                                                    <div className="flex items-center gap-1.5 text-lg font-bold text-gray-900">
                                                        <ShoppingBag className="w-4.5 h-4.5 text-[#2FA9D9]" />
                                                        <span>{selectedCustomer.total_orders} Orders</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Water type breakdown progress bar */}
                                            {selectedCustomer.total_orders > 0 && (
                                                <div className="space-y-1.5 pt-2">
                                                    <div className="flex justify-between text-xs font-medium text-gray-600">
                                                        <span className="flex items-center gap-1 text-sky-600">
                                                            <Droplet className="w-3 h-3 fill-sky-200" />
                                                            Alkaline ({selectedCustomer.alkaline_orders})
                                                        </span>
                                                        <span className="flex items-center gap-1 text-emerald-600">
                                                            <Waves className="w-3 h-3" />
                                                            Mineral ({selectedCustomer.mineral_orders})
                                                        </span>
                                                    </div>
                                                    <div className="h-2.5 w-full bg-gray-100 rounded-full overflow-hidden flex">
                                                        <div
                                                            style={{ width: `${(selectedCustomer.alkaline_orders / selectedCustomer.total_orders) * 100}%` }}
                                                            className="h-full bg-sky-400"
                                                            title="Alkaline Orders"
                                                        />
                                                        <div
                                                            style={{ width: `${(selectedCustomer.mineral_orders / selectedCustomer.total_orders) * 100}%` }}
                                                            className="h-full bg-emerald-400"
                                                            title="Mineral Orders"
                                                        />
                                                    </div>
                                                    <span className="text-[10px] text-gray-400 block text-right font-medium">
                                                        Refill types ratio breakdown
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* 3. Delivery Notes */}
                                    <div className="space-y-3">
                                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                                            <FileText className="w-3.5 h-3.5" />
                                            Notes & Special Instructions
                                        </h3>
                                        <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-sm text-gray-700 leading-relaxed min-h-[60px] italic">
                                            {selectedCustomer.notes ? selectedCustomer.notes : "No special instructions or delivery notes logged for this customer."}
                                        </div>
                                    </div>
                                </div>

                                <DialogFooter className="pt-2">
                                    <div className="flex w-full justify-between items-center gap-2">
                                        <div className="flex gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={(e) => handleEdit(selectedCustomer, e)}
                                                className="hover:text-[#2FA9D9]"
                                            >
                                                <Edit className="w-4 h-4 mr-1.5" />
                                                Edit
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={(e) => handleDeleteClick(selectedCustomer.id, e)}
                                                className="hover:text-rose-600 text-gray-700"
                                            >
                                                <Trash2 className="w-4 h-4 mr-1.5 text-gray-400 hover:text-rose-600" />
                                                Delete
                                            </Button>
                                        </div>
                                        <Button
                                            type="button"
                                            onClick={() => setIsDetailsOpen(false)}
                                            className="bg-[#2FA9D9] hover:bg-[#2195c0] text-white"
                                        >
                                            Close Record
                                        </Button>
                                    </div>
                                </DialogFooter>
                            </>
                        )}
                    </DialogContent>
                </Dialog>

                {/* ─── DELETE CONFIRM DIALOG ─── */}
                <Dialog open={deleteId !== null} onOpenChange={(open) => !isMutating && !open && setDeleteId(null)}>
                    <DialogContent className="sm:max-w-md max-w-[95vw]">
                        <DialogHeader>
                            <DialogTitle className="text-lg font-bold text-gray-900">Delete Customer Record</DialogTitle>
                            <DialogDescription>
                                Are you sure you want to delete this customer? This action will permanently remove their contact info, address details, and stats. This cannot be undone.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter className="pt-4 flex-col sm:flex-row gap-2">
                            <Button
                                variant="outline"
                                onClick={() => setDeleteId(null)}
                                disabled={isMutating}
                                className="w-full sm:w-auto"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={confirmDelete}
                                disabled={isMutating}
                                className="bg-rose-600 hover:bg-rose-700 text-white w-full sm:w-auto transition-colors flex items-center justify-center gap-1.5"
                            >
                                {isMutating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                Yes, Delete Customer
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

            </div>
        </PageContainer>
    );
}
