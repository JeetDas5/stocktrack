"use client";

import { toast } from "sonner";
import { useEffect, useState, useMemo } from "react";

import { useAuth } from "@/providers/auth-provider";
import { Dropdown } from "@/components/ui/dropdown";
import { useBusinessStore } from "@/stores/business-store";
import { useSupplierStore } from "@/stores/supplier-store";
import { Supplier, OrderingMethod } from "@/types/inventory";
import { getUserBusinesses } from "@/lib/repositories/business.repository";
import {
  Truck,
  Building2,
  Plus,
  Search,
  X,
  Loader2,
  Edit2,
  ChevronLeft,
  ChevronRight,
  Upload,
  Globe,
  Mail,
  Phone,
  FileText,
  User as UserIcon,
  MapPin,
} from "lucide-react";
import { Business } from "@/types/business";

const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
] as const;

const FORM_STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
] as const;

const COUNTRY_OPTIONS = [
  { value: "Australia", label: "Australia" },
  { value: "United States", label: "United States" },
  { value: "Canada", label: "Canada" },
  { value: "India", label: "India" },
  { value: "United Kingdom", label: "United Kingdom" },
  { value: "Germany", label: "Germany" },
  { value: "France", label: "France" },
  { value: "Singapore", label: "Singapore" },
  { value: "Japan", label: "Japan" },
] as const;

const ORDERING_METHOD_OPTIONS = [
  { value: "none", label: "Select ordering method (Optional)" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "website", label: "Website" },
  { value: "manual", label: "Manual" },
] as const;

export default function SuppliersPage() {
  const { activeBusinessId } = useBusinessStore();
  const { profile } = useAuth();
  const {
    suppliers,
    loading: suppliersLoading,
    fetchSuppliers,
    addSupplier,
    updateSupplier,
  } = useSupplierStore();

  const [activeBusiness, setActiveBusiness] = useState<Business | null>(null);
  const [loadingContext, setLoadingContext] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all");

  const [showDrawer, setShowDrawer] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [isViewOnly, setIsViewOnly] = useState(true);

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
    OrderingMethod | "none"
  >("none");
  const [formActive, setFormActive] = useState(true);

  const [saving, setSaving] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;

  useEffect(() => {
    if (!activeBusinessId) return;
    const businessId = activeBusinessId;

    async function loadContext() {
      try {
        setLoadingContext(true);
        await fetchSuppliers(businessId);

        const list = await getUserBusinesses([]);
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
    setFormOrderingMethod("none");
    setFormActive(true);
    setIsViewOnly(false);
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
    setFormOrderingMethod(sup.orderingMethod || "none");
    setFormActive(sup.isActive !== false);
    setIsViewOnly(true);
    setShowDrawer(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = formName.trim();
    const trimmedContact = formContactPerson.trim();
    const trimmedPhone = formPhone.trim();
    const trimmedEmail = formEmail.trim();
    const trimmedAddress1 = formAddressLine1.trim();
    const trimmedAddress2 = formAddressLine2.trim();
    const trimmedCity = formCity.trim();
    const trimmedState = formStateProvince.trim();
    const trimmedPostal = formPostalCode.trim();
    const trimmedCountry = formCountry.trim();
    const trimmedWebsite = formWebsite.trim();
    const trimmedNotes = formNotes.trim();

    if (
      !activeBusinessId ||
      !trimmedName ||
      !trimmedAddress1 ||
      !trimmedCity ||
      !trimmedCountry
    ) {
      toast.error("Please fill in all required fields.");
      return;
    }

    if (trimmedName.length > 100) {
      toast.error("Supplier name must be 100 characters or less.");
      return;
    }

    if (!/^[a-zA-Z0-9\s]+$/.test(trimmedName)) {
      toast.error(
        "Supplier name can only contain letters, numbers, and spaces.",
      );
      return;
    }

    if (/^\d+$/.test(trimmedName)) {
      toast.error("Supplier name cannot consist only of numbers.");
      return;
    }

    const isDuplicate = suppliers.some(
      (sup) =>
        sup.name.trim().toLowerCase() === trimmedName.toLowerCase() &&
        sup.id !== editId,
    );
    if (isDuplicate) {
      toast.error("A supplier with this name already exists in this business.");
      return;
    }

    if (trimmedContact) {
      if (trimmedContact.length > 100) {
        toast.error("Contact person must be 100 characters or less.");
        return;
      }
      if (!/^[a-zA-Z\s]+$/.test(trimmedContact)) {
        toast.error("Contact person can only contain letters and spaces.");
        return;
      }
    }

    if (trimmedPhone.length > 20) {
      toast.error("Phone number must be 20 characters or less.");
      return;
    }

    if (trimmedEmail.length > 100) {
      toast.error("Email must be 100 characters or less.");
      return;
    }

    if (trimmedAddress1.length > 100) {
      toast.error("Address Line 1 must be 100 characters or less.");
      return;
    }

    if (trimmedAddress2.length > 100) {
      toast.error("Address Line 2 must be 100 characters or less.");
      return;
    }

    if (trimmedCity.length > 50) {
      toast.error("City must be 50 characters or less.");
      return;
    }

    if (!/^[a-zA-Z\s]+$/.test(trimmedCity)) {
      toast.error("City can only contain letters and spaces.");
      return;
    }

    if (trimmedState) {
      if (trimmedState.length > 50) {
        toast.error("State / Province must be 50 characters or less.");
        return;
      }
      if (!/^[a-zA-Z\s]+$/.test(trimmedState)) {
        toast.error("State / Province can only contain letters and spaces.");
        return;
      }
    }

    if (trimmedPostal) {
      if (trimmedPostal.length > 10) {
        toast.error("Postal code must be 10 characters or less.");
        return;
      }
      if (!/^[a-zA-Z0-9\s]+$/.test(trimmedPostal)) {
        toast.error(
          "Postal code can only contain letters, numbers, and spaces.",
        );
        return;
      }
    }

    if (trimmedCountry) {
      if (trimmedCountry.length > 50) {
        toast.error("Country must be 50 characters or less.");
        return;
      }
      if (!/^[a-zA-Z\s]+$/.test(trimmedCountry)) {
        toast.error("Country can only contain letters and spaces.");
        return;
      }
    }

    if (trimmedWebsite.length > 200) {
      toast.error("Website URL must be 200 characters or less.");
      return;
    }

    const fieldsToCheck = [
      { label: "Supplier name", value: trimmedName },
      { label: "Contact person", value: trimmedContact },
      { label: "Phone number", value: trimmedPhone },
      { label: "Email", value: trimmedEmail },
      { label: "Address Line 1", value: trimmedAddress1 },
      { label: "Address Line 2", value: trimmedAddress2 },
      { label: "City", value: trimmedCity },
      { label: "State / Province", value: trimmedState },
      { label: "Postal code", value: trimmedPostal },
      { label: "Website", value: trimmedWebsite },
      { label: "Notes", value: trimmedNotes },
    ];

    for (const field of fieldsToCheck) {
      if (field.value && !/[a-zA-Z0-9]/.test(field.value)) {
        toast.error(`${field.label} cannot contain only special characters.`);
        return;
      }
    }

    if (trimmedPhone && !/^\+?[0-9\s\-()]{5,20}$/.test(trimmedPhone)) {
      toast.error("Please enter a valid phone number (5 to 20 digits).");
      return;
    }

    if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      toast.error("Please enter a valid email address.");
      return;
    }

    if (trimmedWebsite && !/^https?:\/\/.+\..+/.test(trimmedWebsite)) {
      toast.error(
        "Website must start with http:// or https:// (e.g. https://example.com).",
      );
      return;
    }

    if (trimmedNotes.length > 250) {
      toast.error("Notes must be 250 characters or less.");
      return;
    }

    try {
      setSaving(true);

      const supplierData = {
        businessId: activeBusinessId,
        name: trimmedName,
        contactPerson: trimmedContact || undefined,
        phone: trimmedPhone || undefined,
        email: trimmedEmail || undefined,
        addressLine1: trimmedAddress1,
        addressLine2: trimmedAddress2 || undefined,
        city: trimmedCity,
        stateProvince: trimmedState || undefined,
        postalCode: trimmedPostal || undefined,
        country: trimmedCountry,
        website: trimmedWebsite || undefined,
        notes: trimmedNotes || undefined,
        orderingMethod:
          formOrderingMethod !== "none" ? formOrderingMethod : undefined,
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
    } catch (err) {
      if (err instanceof Error) {
        toast.error(err.message);
      } else {
        toast.error("Failed to save supplier. Please try again.");
      }
    } finally {
      setSaving(false);
    }
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
      // eslint-disable-next-line react-hooks/set-state-in-effect
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
        <Loader2 className="h-7 w-7 text-[#0a2924] animate-spin mb-3" />
        <span className="text-[#64748B] text-xs font-bold uppercase tracking-wider">
          Loading suppliers directory...
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-white h-[calc(100vh-120px)] md:h-[85vh] min-h-0 relative select-none">
      <div className="flex-1 min-h-0 flex flex-col space-y-4 pr-0 lg:pr-4">
        <div className="bg-white border border-[#E2E8F0] rounded-2xl py-3 px-3 md:py-3 md:px-4 flex justify-between items-center shadow-sm">
          <h1 className="text-xl md:text-2xl font-bold md:font-extrabold text-zinc-900 tracking-tight">
            Suppliers
          </h1>
          <div className="flex items-center gap-1 md:gap-3">
            <button
              onClick={() => toast.info("Import function coming soon!")}
              className="bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-700 rounded-full px-3 py-2 md:px-5 md:py-2.5 text-xs font-bold transition-all duration-200 flex items-center justify-center gap-0 md:gap-2 cursor-pointer"
            >
              <Upload className="h-4 w-4" />
              Import CSV
            </button>
            <button
              onClick={openAddDrawer}
              className="bg-[#0a2924] hover:bg-[#09231f] text-white rounded-full py-3 px-2 md:px-6 md:py-2.5 text-xs font-bold transition-all duration-200 flex items-center justify-center gap-0 md:gap-2 shadow-xs cursor-pointer"
            >
              <Plus className="h-4 w-4 stroke-[2.5px]" />
              Add Suppliers
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 items-center">
          <div className="relative w-full sm:w-80">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
              <Search className="h-4 w-4" />
            </span>
            <input
              type="text"
              placeholder="Search Suppliers"
              className="w-full bg-white border border-zinc-200 focus:border-[#0a2924] rounded-2xl py-2.5 pl-10 pr-4 text-xs text-zinc-950 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-[#0a2924] transition-all shadow-xs"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <Dropdown
            value={statusFilter}
            onChange={(val) =>
              setStatusFilter(val as "all" | "active" | "inactive")
            }
            options={STATUS_FILTER_OPTIONS}
            className="w-full sm:w-40"
            triggerClassName="rounded-2xl py-2.5 pl-3.5 pr-4"
          />
        </div>

        {filteredSuppliers.length === 0 ? (
          <div className="bg-white border border-zinc-200 rounded-2xl py-20 px-6 text-center flex flex-col items-center justify-center shadow-sm animate-fade-in flex-1">
            <Truck className="h-12 w-12 text-zinc-300 mb-3" />
            <h3 className="text-base font-bold text-[#0F172A]">
              No suppliers found
            </h3>
            <p className="text-[#64748B] text-xs mt-1 font-semibold max-w-xs leading-relaxed">
              No registered supplier profiles match your criteria. Click Add
              Suppliers to begin.
            </p>
          </div>
        ) : (
          <div className="bg-white border border-zinc-200 rounded-2xl shadow-xs overflow-hidden flex-1 min-h-0 flex flex-col">
            <div className="overflow-auto flex-1 min-h-0">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-200 text-[10px] uppercase font-extrabold tracking-wider text-[#64748B] bg-zinc-50 sticky top-0 z-10 text-center">
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
                    return (
                      <tr
                        key={sup.id}
                        onClick={() => openEditDrawer(sup)}
                        className="hover:bg-zinc-50/40 transition-colors text-center cursor-pointer"
                      >
                        <td className="py-4 px-6">
                          <span className="font-semibold text-[#0F172A] hover:text-[#0a2924] transition-colors underline underline-offset-4 decoration-zinc-300">
                            {sup.name}
                          </span>
                        </td>

                        <td className="py-4 px-6 font-semibold">
                          {activeBusiness?.name || "Active"}
                        </td>

                        <td className="py-4 px-6 font-semibold">
                          {sup.contactPerson || "—"}
                        </td>

                        <td className="py-4 px-6 font-semibold">
                          {sup.phone || "—"}
                        </td>

                        <td className="py-4 px-6 font-semibold">
                          {sup.email || "—"}
                        </td>

                        <td className="py-4 px-6">
                          {sup.isActive ? (
                            <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[10px] font-extrabold bg-[#DEF7EC] text-[#03543F]">
                              <span className="h-1.5 w-1.5 rounded-full bg-[#0E9F6E]" />
                              ACTIVE
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[10px] font-extrabold bg-[#FDE8E8] text-[#9B1C1C]">
                              <span className="h-1.5 w-1.5 rounded-full bg-[#F05252]" />
                              INACTIVE
                            </span>
                          )}
                        </td>

                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end">
                            <button
                              onClick={() => openEditDrawer(sup)}
                              className="h-8 w-8 flex items-center justify-center text-zinc-500 hover:text-[#0a2924] hover:border-[#0a2924] bg-white transition-colors cursor-pointer"
                              title="View Supplier"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="bg-zinc-50/50 border-t border-zinc-200 py-4 px-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-[#64748B] font-semibold sticky bottom-0 z-10">
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
                            ? "bg-[#0a2924] text-white shadow-xs"
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
                    {isViewOnly
                      ? "Supplier Details"
                      : editId
                        ? "Edit Supplier"
                        : "Add Supplier"}
                  </h3>
                  <p className="text-[#64748B] text-xs font-semibold mt-1">
                    {isViewOnly
                      ? "View information details for this supplier profile."
                      : "Enter the details for the supplier."}
                  </p>
                </div>
                <button
                  onClick={() => setShowDrawer(false)}
                  className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {isViewOnly ? (
                <div className="space-y-6">
                  <div className="space-y-4">
                    <div className="border-b border-zinc-100 pb-1">
                      <span className="text-[10px] font-extrabold tracking-widest text-[#64748B] uppercase">
                        Basic Information
                      </span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase">
                        Supplier Name
                      </span>
                      <div className="text-xs font-semibold text-[#0F172A]">
                        {formName}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase">
                        Business
                      </span>
                      <div className="text-xs font-semibold text-[#0F172A]">
                        {activeBusiness?.name || "—"}
                      </div>
                    </div>
                    {formContactPerson && (
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase">
                          Contact Person
                        </span>
                        <div className="text-xs font-semibold text-[#0F172A]">
                          {formContactPerson}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div className="border-b border-zinc-100 pb-1">
                      <span className="text-[10px] font-extrabold tracking-widest text-[#64748B] uppercase">
                        Contact Information
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      {formPhone && (
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-zinc-400 uppercase">
                            Phone
                          </span>
                          <div className="text-xs font-semibold text-[#0F172A]">
                            {formPhone}
                          </div>
                        </div>
                      )}
                      {formEmail && (
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-zinc-400 uppercase">
                            Email
                          </span>
                          <div className="text-xs font-semibold text-[#0F172A] truncate">
                            {formEmail}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="border-b border-zinc-100 pb-1">
                      <span className="text-[10px] font-extrabold tracking-widest text-[#64748B] uppercase">
                        Address
                      </span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase">
                        Address Line 1
                      </span>
                      <div className="text-xs font-semibold text-[#0F172A]">
                        {formAddressLine1}
                      </div>
                    </div>
                    {formAddressLine2 && (
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase">
                          Address Line 2
                        </span>
                        <div className="text-xs font-semibold text-[#0F172A]">
                          {formAddressLine2}
                        </div>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase">
                          City
                        </span>
                        <div className="text-xs font-semibold text-[#0F172A]">
                          {formCity}
                        </div>
                      </div>
                      {formStateProvince && (
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-zinc-400 uppercase">
                            State / Province
                          </span>
                          <div className="text-xs font-semibold text-[#0F172A]">
                            {formStateProvince}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      {formPostalCode && (
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-zinc-400 uppercase">
                            Postal Code
                          </span>
                          <div className="text-xs font-semibold text-[#0F172A]">
                            {formPostalCode}
                          </div>
                        </div>
                      )}
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase">
                          Country
                        </span>
                        <div className="text-xs font-semibold text-[#0F172A]">
                          {formCountry}
                        </div>
                      </div>
                    </div>
                  </div>

                  {(formOrderingMethod !== "none" ||
                    formWebsite ||
                    formNotes) && (
                    <div className="space-y-4">
                      <div className="border-b border-zinc-100 pb-1">
                        <span className="text-[10px] font-extrabold tracking-widest text-[#64748B] uppercase">
                          Additional Information
                        </span>
                      </div>
                      {formOrderingMethod !== "none" && (
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-zinc-400 uppercase">
                            Ordering Method
                          </span>
                          <div className="text-xs font-semibold text-[#0F172A] capitalize">
                            {formOrderingMethod}
                          </div>
                        </div>
                      )}
                      {formWebsite && (
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-zinc-400 uppercase">
                            Website
                          </span>
                          <div className="text-xs font-semibold text-[#0F172A] truncate">
                            <a
                              href={formWebsite}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[#0a2924] underline hover:no-underline"
                            >
                              {formWebsite}
                            </a>
                          </div>
                        </div>
                      )}
                      {formNotes && (
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-zinc-400 uppercase">
                            Notes
                          </span>
                          <div className="text-xs font-semibold text-[#0F172A] whitespace-pre-wrap">
                            {formNotes}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="space-y-4">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase">
                        Status
                      </span>
                      <div className="mt-1">
                        {formActive ? (
                          <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[10px] font-extrabold bg-[#DEF7EC] text-[#03543F]">
                            <span className="h-1.5 w-1.5 rounded-full bg-[#0E9F6E]" />
                            ACTIVE
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[10px] font-extrabold bg-[#FDE8E8] text-[#9B1C1C]">
                            <span className="h-1.5 w-1.5 rounded-full bg-[#F05252]" />
                            INACTIVE
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
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
                          maxLength={100}
                          placeholder="Enter supplier name"
                          className="w-full bg-white border border-zinc-300 focus:border-[#0a2924] rounded-xl py-2.5 pl-10 pr-3.5 text-xs text-zinc-950 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-[#0a2924] transition-all"
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
                        <div className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-2.5 pl-10 pr-3.5 text-xs text-zinc-500 font-bold">
                          {activeBusiness?.name || "Select business"}
                        </div>
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
                          maxLength={100}
                          placeholder="Enter contact person name"
                          className="w-full bg-white border border-zinc-300 focus:border-[#0a2924] rounded-xl py-2.5 pl-10 pr-3.5 text-xs text-zinc-950 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-[#0a2924] transition-all"
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
                            maxLength={20}
                            placeholder="Enter phone number"
                            className="w-full bg-white border border-zinc-300 focus:border-[#0a2924] rounded-xl py-2.5 pl-10 pr-3.5 text-xs text-zinc-950 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-[#0a2924] transition-all"
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
                            maxLength={100}
                            placeholder="Enter email address"
                            className="w-full bg-white border border-zinc-300 focus:border-[#0a2924] rounded-xl py-2.5 pl-10 pr-3.5 text-xs text-zinc-950 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-[#0a2924] transition-all"
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
                          maxLength={100}
                          placeholder="Enter address line 1"
                          className="w-full bg-white border border-zinc-300 focus:border-[#0a2924] rounded-xl py-2.5 pl-10 pr-3.5 text-xs text-zinc-950 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-[#0a2924] transition-all"
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
                        maxLength={100}
                        placeholder="Apartment, suite, unit, building, floor, etc."
                        className="w-full bg-white border border-zinc-300 focus:border-[#0a2924] rounded-xl py-2.5 px-3.5 text-xs text-zinc-950 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-[#0a2924] transition-all"
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
                          maxLength={50}
                          placeholder="Enter city"
                          className="w-full bg-white border border-zinc-300 focus:border-[#0a2924] rounded-xl py-2.5 px-3.5 text-xs text-zinc-950 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-[#0a2924] transition-all"
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
                          maxLength={50}
                          placeholder="Enter state / province"
                          className="w-full bg-white border border-zinc-300 focus:border-[#0a2924] rounded-xl py-2.5 px-3.5 text-xs text-zinc-950 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-[#0a2924] transition-all"
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
                          maxLength={10}
                          placeholder="Enter postal code"
                          className="w-full bg-white border border-zinc-300 focus:border-[#0a2924] rounded-xl py-2.5 px-3.5 text-xs text-zinc-950 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-[#0a2924] transition-all"
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
                        <Dropdown
                          value={formCountry}
                          onChange={setFormCountry}
                          options={COUNTRY_OPTIONS}
                          className="w-full"
                          triggerClassName="border-zinc-300 rounded-xl py-2.5 px-3.5 font-bold text-[#0F172A]"
                          optionClassName="font-bold text-[#0F172A]"
                        />
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
                      <Dropdown
                        value={formOrderingMethod}
                        onChange={(val) =>
                          setFormOrderingMethod(val as OrderingMethod | "none")
                        }
                        options={ORDERING_METHOD_OPTIONS}
                        className="w-full"
                        triggerClassName="border-zinc-300 rounded-xl py-2.5 px-3.5 font-bold text-[#0F172A]"
                        optionClassName="font-bold text-[#0F172A]"
                      />
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
                          maxLength={200}
                          placeholder="Enter website URL (e.g. https://example.com)"
                          className="w-full bg-white border border-zinc-300 focus:border-[#0a2924] rounded-xl py-2.5 pl-10 pr-3.5 text-xs text-zinc-950 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-[#0a2924] transition-all"
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
                        className="w-full bg-white border border-zinc-300 focus:border-[#0a2924] rounded-xl py-2.5 px-3.5 text-xs text-zinc-950 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-[#0a2924] transition-all resize-none shadow-xs"
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
                      <Dropdown
                        value={formActive ? "active" : "inactive"}
                        onChange={(val) => setFormActive(val === "active")}
                        options={FORM_STATUS_OPTIONS}
                        className="w-full"
                        triggerClassName="border-zinc-300 rounded-xl py-2.5 px-3.5 font-bold text-[#0F172A]"
                        optionClassName="font-bold text-[#0F172A]"
                      />
                    </div>
                  </div>
                </form>
              )}
            </div>

            <div className="p-6 border-t border-zinc-200 bg-zinc-50 flex justify-end gap-3 shrink-0">
              {isViewOnly ? (
                <>
                  <button
                    type="button"
                    onClick={() => setShowDrawer(false)}
                    className="bg-white hover:bg-zinc-100 border border-zinc-200 text-zinc-700 rounded-xl px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsViewOnly(false)}
                    className="bg-[#0a2924] hover:bg-[#09231f] text-white rounded-xl px-5 py-2.5 text-xs font-bold uppercase tracking-wider shadow-sm flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    Edit Details
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      if (editId) {
                        setIsViewOnly(true);
                      } else {
                        setShowDrawer(false);
                      }
                    }}
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
                    className="bg-[#0a2924] hover:bg-[#09231f] text-white rounded-xl px-5 py-2.5 text-xs font-bold uppercase tracking-wider shadow-sm flex items-center gap-2 cursor-pointer transition-colors disabled:opacity-50"
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
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
