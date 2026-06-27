"use client";

import { useState } from "react";
import {
    Users, Plus, Search, Trash2, Edit, Eye, Phone, MapPin, Flag,
    ShoppingBag, Droplet, Waves, SlidersHorizontal, FileText
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

// Types
export type WaterPreference = "alkaline" | "mineral" | "both";

export interface Customer {
    id: string;
    name: string;
    address: string;
    phone: string; // Maps to phone in DB schema
    landmark: string;
    water_preference: WaterPreference;
    total_orders: number;
    alkaline_orders: number;
    mineral_orders: number;
    notes: string;
    created_at?: string;
}

// Initial Static Data based on sql.md database schema mapping
const INITIAL_CUSTOMERS: Customer[] = [
    {
        id: "cust-1",
        name: "Juan Dela Cruz",
        address: "123 Mabini St, Barangay 667, Ermita, Manila",
        phone: "0917 123 4567",
        landmark: "Near Ermita Barangay Hall",
        water_preference: "alkaline",
        total_orders: 15,
        alkaline_orders: 15,
        mineral_orders: 0,
        notes: "Prefers morning delivery around 9 AM. Always pays with GCash. Usually orders 3 round containers.",
        created_at: "2026-05-10T08:30:00Z"
    },
    {
        id: "cust-2",
        name: "Maria Santos",
        address: "456 Rizal Avenue, Pasay City",
        phone: "0918 765 4321",
        landmark: "Opposite Petron Gas Station",
        water_preference: "mineral",
        total_orders: 28,
        alkaline_orders: 4,
        mineral_orders: 24,
        notes: "Deliver to Santos Grocery Store. Prefers flat containers. Standard weekly drop-off on Wednesday afternoons.",
        created_at: "2026-05-12T10:15:00Z"
    },
    {
        id: "cust-3",
        name: "Pedro Penduko",
        address: "789 Bonifacio Street, Quezon City",
        phone: "0922 888 9999",
        landmark: "Beside 7-Eleven Convenience Store",
        water_preference: "both",
        total_orders: 42,
        alkaline_orders: 22,
        mineral_orders: 20,
        notes: "Requires both alkaline (for drinking) and mineral (for coffee maker). Usually orders 5 containers total. Cash on delivery.",
        created_at: "2026-05-15T14:22:00Z"
    },
    {
        id: "cust-4",
        name: "Ana Kalang",
        address: "101 Katipunan Avenue, Quezon City",
        phone: "0933 444 5555",
        landmark: "Near Gate 3 of Ateneo De Manila University",
        water_preference: "alkaline",
        total_orders: 9,
        alkaline_orders: 9,
        mineral_orders: 0,
        notes: "Leave with building guard at lobby if not home. Gate code is #4321.",
        created_at: "2026-06-01T09:45:00Z"
    },
    {
        id: "cust-5",
        name: "Jose Rizal",
        address: "202 Bagumbayan Lane, Calamba, Laguna",
        phone: "0999 000 1111",
        landmark: "Near Rizal Historical Shrine",
        water_preference: "mineral",
        total_orders: 12,
        alkaline_orders: 0,
        mineral_orders: 12,
        notes: "Prefers flat containers. Hard to reach on phone, send Viber message instead.",
        created_at: "2026-06-05T11:00:00Z"
    },
    {
        id: "cust-6",
        name: "Corazon Aquino",
        address: "777 Times Street, West Triangle, Quezon City",
        phone: "0915 222 3333",
        landmark: "Near West Triangle Park",
        water_preference: "both",
        total_orders: 31,
        alkaline_orders: 16,
        mineral_orders: 15,
        notes: "Orders every Monday. Deliver to the back gate. Ring bell twice.",
        created_at: "2026-06-10T16:40:00Z"
    }
];

export default function Customers() {
    const [customers, setCustomers] = useState<Customer[]>(INITIAL_CUSTOMERS);
    const [searchQuery, setSearchQuery] = useState("");
    const [prefFilter, setPrefFilter] = useState<"all" | WaterPreference>("all");

    // Modal States
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    // Form State
    const [formData, setFormData] = useState<Omit<Customer, "id" | "total_orders" | "alkaline_orders" | "mineral_orders">>({
        name: "",
        address: "",
        phone: "",
        landmark: "",
        water_preference: "alkaline",
        notes: ""
    });

    // Handle Create Click
    const handleOpenCreate = () => {
        setEditingCustomer(null);
        setFormData({
            name: "",
            address: "",
            phone: "",
            landmark: "",
            water_preference: "alkaline",
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
            water_preference: customer.water_preference,
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
    const confirmDelete = () => {
        if (deleteId) {
            setCustomers((prev) => prev.filter((c) => c.id !== deleteId));
            // If the deleted customer was open in details modal, close it
            if (selectedCustomer?.id === deleteId) {
                setIsDetailsOpen(false);
                setSelectedCustomer(null);
            }
            setDeleteId(null);
        }
    };

    // Handle Save Form (Add or Edit)
    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingCustomer) {
            // Update Existing
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
        } else {
            // Add New
            const newCustomer: Customer = {
                id: `cust-${Math.random().toString(36).substring(2, 9)}`,
                ...formData,
                total_orders: 0,
                alkaline_orders: 0,
                mineral_orders: 0,
                created_at: new Date().toISOString()
            };
            setCustomers((prev) => [newCustomer, ...prev]);
        }
        setIsEditOpen(false);
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

                {/* ─── ADD/EDIT DIALOG ─── */}
                <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
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
                                    value={formData.landmark}
                                    onChange={(e) => setFormData((p) => ({ ...p, landmark: e.target.value }))}
                                />
                            </div>

                            {/* Water Preference */}
                            <div className="grid gap-2">
                                <Label htmlFor="water_preference" className="text-xs font-semibold text-gray-700">Water Type Preference</Label>
                                <Select
                                    value={formData.water_preference}
                                    onValueChange={(val) => setFormData((p) => ({ ...p, water_preference: val as WaterPreference }))}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select water type preference" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="alkaline">Alkaline Water</SelectItem>
                                        <SelectItem value="mineral">Mineral Water</SelectItem>
                                        <SelectItem value="both">Both (Alkaline & Mineral)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Notes */}
                            <div className="grid gap-2">
                                <Label htmlFor="notes" className="text-xs font-semibold text-gray-700">Client / Delivery Notes</Label>
                                <Textarea
                                    id="notes"
                                    placeholder="Add delivery instructions, container requests, payment preferences, etc."
                                    value={formData.notes}
                                    onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))}
                                />
                            </div>

                            <DialogFooter className="pt-4 flex-col sm:flex-row gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setIsEditOpen(false)}
                                    className="w-full sm:w-auto"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    className="bg-[#2FA9D9] hover:bg-[#2195c0] text-white w-full sm:w-auto transition-colors"
                                >
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
                                                            : "bg-purple-100 text-purple-700"
                                                    }`}>
                                                        {selectedCustomer.water_preference === "alkaline"
                                                            ? "Alkaline Water"
                                                            : selectedCustomer.water_preference === "mineral"
                                                            ? "Mineral Water"
                                                            : "Both Types"}
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
                <Dialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
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
                                className="w-full sm:w-auto"
                            >
                                Cancel
                                </Button>
                            <Button
                                onClick={confirmDelete}
                                className="bg-rose-600 hover:bg-rose-700 text-white w-full sm:w-auto transition-colors"
                            >
                                Yes, Delete Customer
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

            </div>
        </PageContainer>
    );
}
