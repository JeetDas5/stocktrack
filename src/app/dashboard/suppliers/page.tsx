"use client";

import { toast } from "sonner";
import AlertDialog from "@/components/alert-dialog";
import { Business } from "@/types/business";
import { useAuth } from "@/providers/auth-provider";
import { useBusinessStore } from "@/store/business-store";
import { useSupplierStore } from "@/store/supplier-store";
import { Supplier, OrderingMethod } from "@/types/inventory";
import { useEffect, useState, useMemo, useRef } from "react";
import { getUserBusinesses } from "@/lib/repositories/business.repository";
import {
  Truck,
  Building2,
  Plus,
  Search,
  ChevronDown,
  X,
  Loader2,
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Upload,
  Globe,
  Mail,
  Phone,
  FileText,
  User as UserIcon,
  MapPin,
  AlertCircle,
} from "lucide-react";

export default function SuppliersPage() {
  const { activeBusinessId } = useBusinessStore();
  const { profile } = useAuth();
  const {
    suppliers,
    loading: suppliersLoading,
    error: storeError,
    fetchSuppliers,
    addSupplier,
    updateSupplier,
    deleteSupplier,
  } = useSupplierStore();

  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [activeBusiness, setActiveBusiness] = useState<Business | null>(null);
  const [loadingContext, setLoadingContext] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all");

  const [showDrawer, setShowDrawer] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const [formName, setFormName] = useState("");
  const [formContactPerson, setFormContactPerson] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formAddressLine1, setFormAddressLine1] = useState("");
  const [formAddressLine2, setFormAddressLine2] = useState("");
  const [formCity, setFormCity] = useState("");
  const [formStateProvince, setFormStateProvince] = useState("");
  const [formPostalCode, setFormPostalCode] = useState("");
  const [formCountry, setFormCountry] = useState("Australia");
  const [formWebsite, setFormWebsite] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formOrderingMethod, setFormOrderingMethod] = useState<
    OrderingMethod | ""
  >("");
  const [formActive, setFormActive] = useState(true);

  const [saving, setSaving] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;

  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenuId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!activeBusinessId) return;
    const businessId = activeBusinessId;

    async function loadContext() {
      try {
        setLoadingContext(true);
        await fetchSuppliers(businessId);

        const list = await getUserBusinesses([]);
        setBusinesses(list);
        const activeDoc = list.find((b) => b.id === businessId) || null;
        setActiveBusiness(activeDoc);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingContext(false);
      }
    }

    loadContext();
  }, [activeBusinessId, profile, fetchSuppliers]);

  const openAddDrawer = () => {
    setEditId(null);
    setFormName("");
    setFormContactPerson("");
    setFormPhone("");
    setFormEmail("");
    setFormAddressLine1("");
    setFormAddressLine2("");
    setFormCity("");
    setFormStateProvince("");
    setFormPostalCode("");
    setFormCountry("Australia");
    setFormWebsite("");
    setFormNotes("");
    setFormOrderingMethod("");
    setFormActive(true);
    setShowDrawer(true);
  };

  const openEditDrawer = (sup: Supplier) => {
    setEditId(sup.id);
    setFormName(sup.name);
    setFormContactPerson(sup.contactPerson || "");
    setFormPhone(sup.phone || "");
    setFormEmail(sup.email || "");
    setFormAddressLine1(sup.addressLine1);
    setFormAddressLine2(sup.addressLine2 || "");
    setFormCity(sup.city);
    setFormStateProvince(sup.stateProvince || "");
    setFormPostalCode(sup.postalCode || "");
    setFormCountry(sup.country || "Australia");
    setFormWebsite(sup.website || "");
    setFormNotes(sup.notes || "");
    setFormOrderingMethod(sup.orderingMethod || "");
    setFormActive(sup.isActive !== false);
    setShowDrawer(true);
    setActiveMenuId(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !activeBusinessId ||
      !formName.trim() ||
      !formAddressLine1.trim() ||
      !formCity.trim() ||
      !formCountry.trim()
    ) {
      toast.error("Please fill in all required fields.");
      return;
    }

    if (
      formEmail.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formEmail.trim())
    ) {
      toast.error("Please enter a valid email address.");
      return;
    }

    if (formWebsite.trim() && !/^https?:\/\/.+\..+/.test(formWebsite.trim())) {
      toast.error(
        "Website must start with http:// or https:// (e.g. https://example.com).",
      );
      return;
    }

    try {
      setSaving(true);

      const supplierData = {
        businessId: activeBusinessId,
        name: formName.trim(),
        contactPerson: formContactPerson.trim() || undefined,
        phone: formPhone.trim() || undefined,
        email: formEmail.trim() || undefined,
        addressLine1: formAddressLine1.trim(),
        addressLine2: formAddressLine2.trim() || undefined,
        city: formCity.trim(),
        stateProvince: formStateProvince.trim() || undefined,
        postalCode: formPostalCode.trim() || undefined,
        country: formCountry,
        website: formWebsite.trim() || undefined,
        notes: formNotes.trim() || undefined,
        orderingMethod:
          formOrderingMethod !== "" ? formOrderingMethod : undefined,
        isActive: formActive,
      };

      if (editId) {
        await updateSupplier(activeBusinessId, editId, supplierData);
        toast.success("Supplier updated successfully!");
      } else {
        await addSupplier(activeBusinessId, supplierData);
        toast.success("Supplier added successfully!");
      }

      setShowDrawer(false);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to save supplier. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (supId: string) => {
    setActiveMenuId(null);
    setDeleteTarget(supId);
  };

  const handleConfirmDelete = async () => {
    if (!activeBusinessId || !deleteTarget) return;
    try {
      await deleteSupplier(activeBusinessId, deleteTarget);
      toast.success("Supplier deleted successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete supplier.");
    } finally {
      setDeleteTarget(null);
    }
  };

  const getInitials = (name: string) => {
    if (!name) return "";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  const getAvatarColors = (name: string) => {
    const hash = name
      .split("")
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const colors = [
      {
        bg: "bg-emerald-50 text-emerald-600 border-emerald-100",
        dot: "bg-emerald-500",
      },
      {
        bg: "bg-indigo-50 text-indigo-600 border-indigo-100",
        dot: "bg-indigo-500",
      },
      { bg: "bg-sky-50 text-sky-600 border-sky-100", dot: "bg-sky-500" },
      {
        bg: "bg-amber-50 text-amber-600 border-amber-100",
        dot: "bg-amber-500",
      },
      { bg: "bg-rose-50 text-rose-600 border-rose-100", dot: "bg-rose-500" },
      {
        bg: "bg-violet-50 text-violet-600 border-violet-100",
        dot: "bg-violet-500",
      },
      { bg: "bg-teal-50 text-teal-600 border-teal-100", dot: "bg-teal-500" },
    ];
    return colors[hash % colors.length];
  };

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((sup) => {
      const matchesSearch =
        sup.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sup.contactPerson?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sup.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sup.phone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sup.city?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && sup.isActive) ||
        (statusFilter === "inactive" && !sup.isActive);

      return matchesSearch && matchesStatus;
    });
  }, [suppliers, searchQuery, statusFilter]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredSuppliers.length / itemsPerPage),
  );
  const paginatedSuppliers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredSuppliers.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredSuppliers, currentPage]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  if (suppliersLoading || loadingContext) {
    return (
      <div className="h-[75vh] flex flex-col items-center justify-center bg-white text-[#0F172A]">
        <Loader2 className="h-7 w-7 text-[#16A34A] animate-spin mb-3" />
        <span className="text-[#64748B] text-xs font-bold uppercase tracking-wider">
          Loading suppliers directory...
        </span>
      </div>
    );
  }

  return (
    <div className="flex bg-white min-h-[80vh] relative select-none">
      <div className="flex-1 space-y-6 pr-0 lg:pr-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-zinc-200 pb-5">
          <div>
            <h1 className="text-3xl font-extrabold text-[#0F172A] tracking-tight">
              Suppliers
            </h1>
            <p className="text-[#64748B] text-xs font-bold mt-1.5">
              Manage your suppliers and their contact information.
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={() => toast.info("Import function coming soon!")}
              className="flex-1 sm:flex-initial bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-700 rounded-xl px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Upload className="h-4 w-4" />
              Import Suppliers
            </button>
            <button
              onClick={openAddDrawer}
              className="flex-1 sm:flex-initial bg-[#16A34A] hover:bg-[#15803D] text-white rounded-xl px-5 py-2.5 text-xs font-bold uppercase tracking-wider shadow-sm flex items-center justify-center gap-2 cursor-pointer transition-all duration-200"
            >
              <Plus className="h-4 w-4 stroke-[3px]" />
              Add Supplier
            </button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
          <div className="flex flex-col sm:flex-row gap-3 flex-1">
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                <Search className="h-4 w-4" />
              </span>
              <input
                type="text"
                placeholder="Search suppliers..."
                className="w-full bg-white border border-zinc-200 focus:border-[#16A34A] rounded-xl py-2.5 pl-10 pr-4 text-xs text-zinc-950 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-[#16A34A] transition-all shadow-xs"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="relative min-w-[140px]">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="w-full bg-white border border-zinc-200 rounded-xl py-2.5 pl-3.5 pr-8 text-xs font-bold text-zinc-700 shadow-xs appearance-none focus:outline-none focus:ring-1 focus:ring-[#16A34A] focus:border-[#16A34A] cursor-pointer"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
            </div>

            <div className="relative min-w-[180px]">
              <select
                disabled
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-2.5 pl-3.5 pr-8 text-xs font-bold text-zinc-500 shadow-xs appearance-none cursor-not-allowed"
              >
                <option>{activeBusiness?.name || "All Businesses"}</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
            </div>
          </div>

          <button
            onClick={() => toast.info("Advanced filters coming soon!")}
            className="flex items-center justify-center gap-2 bg-white border border-zinc-200 rounded-xl px-4 py-2.5 text-xs font-bold text-zinc-700 shadow-xs cursor-pointer hover:bg-zinc-50 transition-colors"
          >
            <ChevronDown className="h-4 w-4 text-zinc-400 rotate-90" />
            <span>Filters</span>
          </button>
        </div>

        {storeError && (
          <div className="bg-rose-50 border border-rose-200 text-rose-600 text-xs rounded-xl p-3 flex items-center gap-2 justify-center font-bold">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {storeError}
          </div>
        )}

        {filteredSuppliers.length === 0 ? (
          <div className="bg-white border border-zinc-200 rounded-2xl py-20 px-6 text-center flex flex-col items-center justify-center shadow-sm animate-fade-in">
            <Truck className="h-12 w-12 text-zinc-300 mb-3" />
            <h3 className="text-base font-bold text-[#0F172A]">
              No suppliers found
            </h3>
            <p className="text-[#64748B] text-xs mt-1 font-semibold max-w-xs leading-relaxed">
              No registered supplier profiles match your criteria. Click + Add
              Supplier to begin.
            </p>
          </div>
        ) : (
          <div className="bg-white border border-zinc-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-200 text-[10px] uppercase font-extrabold tracking-wider text-[#64748B] bg-zinc-50/50">
                    <th className="py-4 px-6 font-extrabold">Supplier Name</th>
                    <th className="py-4 px-6 font-extrabold">Business</th>
                    <th className="py-4 px-6 font-extrabold">Contact Person</th>
                    <th className="py-4 px-6 font-extrabold">Phone</th>
                    <th className="py-4 px-6 font-extrabold">Email</th>
                    <th className="py-4 px-6 font-extrabold">Status</th>
                    <th className="py-4 px-6 font-extrabold text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 text-xs text-[#0F172A]">
                  {paginatedSuppliers.map((sup) => {
                    const avatarStyle = getAvatarColors(sup.name);
                    return (
                      <tr
                        key={sup.id}
                        className="hover:bg-zinc-50/40 transition-colors"
                      >
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3.5">
                            <div
                              className={`h-9 w-9 rounded-full ${avatarStyle.bg} flex items-center justify-center shrink-0 border border-zinc-100 shadow-xs font-extrabold text-[11px]`}
                            >
                              {getInitials(sup.name)}
                            </div>
                            <div>
                              <p
                                className="font-extrabold text-[#0F172A] hover:text-[#16A34A] transition-colors cursor-pointer"
                                onClick={() => openEditDrawer(sup)}
                              >
                                {sup.name}
                              </p>
                              {sup.orderingMethod && (
                                <p className="text-[10px] text-zinc-400 font-bold mt-0.5 uppercase tracking-wider flex items-center gap-1">
                                  <FileText className="h-3 w-3" />
                                  Via {sup.orderingMethod}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="py-4 px-6 font-bold text-[#64748B]">
                          {activeBusiness?.name || "Active"}
                        </td>

                        <td className="py-4 px-6 font-bold text-zinc-700">
                          {sup.contactPerson || "—"}
                        </td>

                        <td className="py-4 px-6 text-[#64748B] font-bold">
                          {sup.phone || "—"}
                        </td>

                        <td className="py-4 px-6 text-[#64748B] font-bold max-w-xs truncate">
                          {sup.email || "—"}
                        </td>

                        <td className="py-4 px-6">
                          <div className="inline-flex items-center gap-1.5">
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${sup.isActive ? "bg-[#16A34A]" : "bg-[#1E293B]"}`}
                            />
                            <span
                              className={`text-[10px] font-bold ${sup.isActive ? "text-[#16A34A]" : "text-[#1E293B]"}`}
                            >
                              {sup.isActive ? "Active" : "Inactive"}
                            </span>
                          </div>
                        </td>

                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openEditDrawer(sup)}
                              className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-500 hover:text-[#16A34A] transition-colors cursor-pointer inline-flex items-center justify-center"
                              title="Edit Details"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(sup.id)}
                              className="p-1.5 rounded-lg hover:bg-rose-50 text-zinc-500 hover:text-[#EF4444] transition-colors cursor-pointer inline-flex items-center justify-center"
                              title="Delete Supplier"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="bg-zinc-50/50 border-t border-zinc-200 py-4 px-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-[#64748B] font-semibold">
              <span>
                Showing{" "}
                {Math.min(
                  filteredSuppliers.length,
                  (currentPage - 1) * itemsPerPage + 1,
                )}{" "}
                to{" "}
                {Math.min(filteredSuppliers.length, currentPage * itemsPerPage)}{" "}
                of {filteredSuppliers.length} suppliers
              </span>

              {totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    className="p-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-500 disabled:opacity-40 disabled:hover:bg-white cursor-pointer disabled:cursor-not-allowed"
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                    (page) => (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        className={`h-8 w-8 rounded-lg font-bold text-xs cursor-pointer transition-all duration-150 ${
                          currentPage === page
                            ? "bg-[#16A34A] text-white shadow-xs"
                            : "border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700"
                        }`}
                      >
                        {page}
                      </button>
                    ),
                  )}

                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    className="p-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-500 disabled:opacity-40 disabled:hover:bg-white cursor-pointer disabled:cursor-not-allowed"
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {showDrawer && (
        <>
          <div
            className="fixed inset-0 bg-black/25 backdrop-blur-xs z-90 animate-fade-in"
            onClick={() => setShowDrawer(false)}
          />
          <div className="fixed top-0 right-0 h-full w-[450px] bg-white border-l border-zinc-200 shadow-2xl flex flex-col justify-between z-100 animate-slide-in">
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-extrabold text-[#0F172A]">
                    {editId ? "Edit Supplier" : "Add Supplier"}
                  </h3>
                  <p className="text-[#64748B] text-xs font-semibold mt-1">
                    Enter the details for the supplier.
                  </p>
                </div>
                <button
                  onClick={() => setShowDrawer(false)}
                  className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-6">
                <div className="space-y-4">
                  <div className="border-b border-zinc-100 pb-1">
                    <span className="text-[10px] font-extrabold tracking-widest text-[#64748B] uppercase">
                      Basic Information
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#0F172A] block">
                      Supplier Name <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                        <Truck className="h-4 w-4" />
                      </span>
                      <input
                        type="text"
                        required
                        placeholder="Enter supplier name"
                        className="w-full bg-white border border-zinc-300 focus:border-[#16A34A] rounded-xl py-2.5 pl-10 pr-3.5 text-xs text-zinc-950 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-[#16A34A] transition-all"
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#0F172A] block">
                      Business <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                        <Building2 className="h-4 w-4" />
                      </span>
                      <select
                        className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-2.5 pl-10 pr-10 text-xs text-zinc-500 font-bold appearance-none cursor-not-allowed"
                        disabled
                        value={activeBusinessId || ""}
                      >
                        <option value={activeBusinessId || ""}>
                          {activeBusiness?.name || "Select business"}
                        </option>
                      </select>
                      <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#0F172A] block">
                      Contact Person
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                        <UserIcon className="h-4 w-4" />
                      </span>
                      <input
                        type="text"
                        placeholder="Enter contact person name"
                        className="w-full bg-white border border-zinc-300 focus:border-[#16A34A] rounded-xl py-2.5 pl-10 pr-3.5 text-xs text-zinc-950 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-[#16A34A] transition-all"
                        value={formContactPerson}
                        onChange={(e) => setFormContactPerson(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="border-b border-zinc-100 pb-1">
                    <span className="text-[10px] font-extrabold tracking-widest text-[#64748B] uppercase">
                      Contact Information
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[#0F172A] block">
                        Phone
                      </label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                          <Phone className="h-4 w-4" />
                        </span>
                        <input
                          type="tel"
                          placeholder="Enter phone number"
                          className="w-full bg-white border border-zinc-300 focus:border-[#16A34A] rounded-xl py-2.5 pl-10 pr-3.5 text-xs text-zinc-950 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-[#16A34A] transition-all"
                          value={formPhone}
                          onChange={(e) =>
                            setFormPhone(
                              e.target.value.replace(/[^0-9+\-\s]/g, ""),
                            )
                          }
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[#0F172A] block">
                        Email
                      </label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                          <Mail className="h-4 w-4" />
                        </span>
                        <input
                          type="email"
                          placeholder="Enter email address"
                          className="w-full bg-white border border-zinc-300 focus:border-[#16A34A] rounded-xl py-2.5 pl-10 pr-3.5 text-xs text-zinc-950 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-[#16A34A] transition-all"
                          value={formEmail}
                          onChange={(e) => setFormEmail(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="border-b border-zinc-100 pb-1">
                    <span className="text-[10px] font-extrabold tracking-widest text-[#64748B] uppercase">
                      Address
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#0F172A] block">
                      Address Line 1 <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                        <MapPin className="h-4 w-4" />
                      </span>
                      <input
                        type="text"
                        required
                        placeholder="Enter address line 1"
                        className="w-full bg-white border border-zinc-300 focus:border-[#16A34A] rounded-xl py-2.5 pl-10 pr-3.5 text-xs text-zinc-950 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-[#16A34A] transition-all"
                        value={formAddressLine1}
                        onChange={(e) => setFormAddressLine1(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#0F172A] block">
                      Address Line 2 (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="Apartment, suite, unit, building, floor, etc."
                      className="w-full bg-white border border-zinc-300 focus:border-[#16A34A] rounded-xl py-2.5 px-3.5 text-xs text-zinc-950 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-[#16A34A] transition-all"
                      value={formAddressLine2}
                      onChange={(e) => setFormAddressLine2(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[#0F172A] block">
                        City <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Enter city"
                        className="w-full bg-white border border-zinc-300 focus:border-[#16A34A] rounded-xl py-2.5 px-3.5 text-xs text-zinc-950 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-[#16A34A] transition-all"
                        value={formCity}
                        onChange={(e) => setFormCity(e.target.value)}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[#0F172A] block">
                        State / Province
                      </label>
                      <input
                        type="text"
                        placeholder="Enter state / province"
                        className="w-full bg-white border border-zinc-300 focus:border-[#16A34A] rounded-xl py-2.5 px-3.5 text-xs text-zinc-950 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-[#16A34A] transition-all"
                        value={formStateProvince}
                        onChange={(e) => setFormStateProvince(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[#0F172A] block">
                        Postal Code
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="Enter postal code"
                        className="w-full bg-white border border-zinc-300 focus:border-[#16A34A] rounded-xl py-2.5 px-3.5 text-xs text-zinc-950 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-[#16A34A] transition-all"
                        value={formPostalCode}
                        onChange={(e) =>
                          setFormPostalCode(e.target.value.replace(/\D/g, ""))
                        }
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[#0F172A] block">
                        Country <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <select
                          required
                          className="w-full bg-white border border-zinc-300 focus:border-[#16A34A] rounded-xl py-2.5 px-3.5 text-xs text-[#0F172A] font-bold focus:outline-none focus:ring-1 focus:ring-[#16A34A] appearance-none cursor-pointer"
                          value={formCountry}
                          onChange={(e) => setFormCountry(e.target.value)}
                        >
                          <option value="Australia">Australia</option>
                          <option value="United States">United States</option>
                          <option value="Canada">Canada</option>
                          <option value="India">India</option>
                          <option value="United Kingdom">United Kingdom</option>
                          <option value="Australia">Australia</option>
                          <option value="Germany">Germany</option>
                          <option value="France">France</option>
                          <option value="Singapore">Singapore</option>
                          <option value="Japan">Japan</option>
                        </select>
                        <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="border-b border-zinc-100 pb-1">
                    <span className="text-[10px] font-extrabold tracking-widest text-[#64748B] uppercase">
                      Additional Information (Optional)
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#0F172A] block">
                      Ordering Method
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                        <FileText className="h-4 w-4" />
                      </span>
                      <select
                        className="w-full bg-white border border-zinc-300 focus:border-[#16A34A] rounded-xl py-2.5 pl-10 pr-10 text-xs text-[#0F172A] font-bold focus:outline-none focus:ring-1 focus:ring-[#16A34A] appearance-none cursor-pointer"
                        value={formOrderingMethod}
                        onChange={(e) =>
                          setFormOrderingMethod(e.target.value as any)
                        }
                      >
                        <option value="">
                          Select ordering method (Optional)
                        </option>
                        <option value="email">Email</option>
                        <option value="phone">Phone</option>
                        <option value="website">Website</option>
                        <option value="manual">Manual</option>
                      </select>
                      <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#0F172A] block">
                      Website
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                        <Globe className="h-4 w-4" />
                      </span>
                      <input
                        type="url"
                        placeholder="Enter website URL (e.g. https://example.com)"
                        className="w-full bg-white border border-zinc-300 focus:border-[#16A34A] rounded-xl py-2.5 pl-10 pr-3.5 text-xs text-zinc-950 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-[#16A34A] transition-all"
                        value={formWebsite}
                        onChange={(e) => setFormWebsite(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold text-[#0F172A] block">
                        Notes
                      </label>
                      <span className="text-[10px] font-bold text-[#64748B]">
                        {formNotes.length} / 250
                      </span>
                    </div>
                    <textarea
                      maxLength={250}
                      placeholder="Enter notes (optional)"
                      rows={3}
                      className="w-full bg-white border border-zinc-300 focus:border-[#16A34A] rounded-xl py-2.5 px-3.5 text-xs text-zinc-950 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-[#16A34A] transition-all resize-none shadow-xs"
                      value={formNotes}
                      onChange={(e) => setFormNotes(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-4 pt-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#0F172A] block">
                      Status <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${formActive ? "bg-[#16A34A]" : "bg-[#1E293B]"}`}
                        />
                      </span>
                      <select
                        required
                        className="w-full bg-white border border-zinc-300 focus:border-[#16A34A] rounded-xl py-2.5 pl-10 pr-10 text-xs text-[#0F172A] font-bold focus:outline-none focus:ring-1 focus:ring-[#16A34A] appearance-none cursor-pointer"
                        value={formActive ? "active" : "inactive"}
                        onChange={(e) =>
                          setFormActive(e.target.value === "active")
                        }
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                      <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
                    </div>
                  </div>
                </div>
              </form>
            </div>

            <div className="p-6 border-t border-zinc-200 bg-zinc-50 flex justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setShowDrawer(false)}
                className="bg-white hover:bg-zinc-100 border border-zinc-200 text-zinc-700 rounded-xl px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="submit"
                onClick={handleSave}
                disabled={
                  saving ||
                  !formName.trim() ||
                  !formAddressLine1.trim() ||
                  !formCity.trim() ||
                  !formCountry.trim()
                }
                className="bg-[#16A34A] hover:bg-[#15803D] text-white rounded-xl px-5 py-2.5 text-xs font-bold uppercase tracking-wider shadow-sm flex items-center gap-2 cursor-pointer transition-colors disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Supplier"
                )}
              </button>
            </div>
          </div>
        </>
      )}

      <AlertDialog
        open={deleteTarget !== null}
        variant="danger"
        title="Delete Supplier"
        description="Are you sure you want to delete this supplier? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
