"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";
import { useBusinessStore } from "@/stores/business-store";
import {
  getUserBusinesses,
  createBusinessAndLink,
  updateBusiness,
} from "@/lib/repositories/business.repository";
import {
  uploadFileToS3,
  getPresignedDownloadUrl,
} from "@/lib/repositories/s3.repository";
import {
  Building2,
  Plus,
  Pencil,
  Loader2,
  Search,
  Lock,
  MapPin,
  Package,
  FileText,
  Upload,
  X,
  ExternalLink,
} from "lucide-react";
import { Business } from "@/types/business";
import { toast } from "sonner";
import { Dropdown } from "@/components/ui/dropdown";

const ALLOWED_EXTENSIONS = [".pdf", ".doc", ".docx"];
const MAX_FILE_SIZE_MB = 15;

export default function DashboardBusinessPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();
  const { activeBusinessId, setActiveBusiness } = useBusinessStore();

  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [newBusinessName, setNewBusinessName] = useState("");
  const [addTermsFile, setAddTermsFile] = useState<File | null>(null);
  const [creating, setCreating] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // Edit Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingBusiness, setEditingBusiness] = useState<Business | null>(null);
  const [editName, setEditName] = useState("");
  const [editIsActive, setEditIsActive] = useState(true);
  const [editTermsUrl, setEditTermsUrl] = useState<string | null>(null);
  const [editTermsName, setEditTermsName] = useState<string | null>(null);
  const [editTermsFile, setEditTermsFile] = useState<File | null>(null);
  const [updating, setUpdating] = useState(false);

  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("active");

  useEffect(() => {
    async function loadBusinesses() {
      if (authLoading) return;
      if (!user || !profile) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const data = await getUserBusinesses();
        setBusinesses(data);

        const persistedActiveId =
          typeof window !== "undefined"
            ? localStorage.getItem("nexbrix_active_business_id")
            : null;
        if (data.length === 1 && !persistedActiveId) {
          const singleBus = data[0];
          setActiveBusiness(singleBus.id);
          localStorage.setItem("nexbrix_active_business_id", singleBus.id);
        }
      } catch (err) {
        console.error("Failed to load businesses:", err);
        toast.error("Could not load your businesses. Please reload.");
      } finally {
        setLoading(false);
      }
    }
    loadBusinesses();
  }, [user, profile, authLoading, setActiveBusiness]);

  const validateFile = (file: File): boolean => {
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      toast.error("Only PDF and Word documents (.pdf, .doc, .docx) are allowed.");
      return false;
    }
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      toast.error(`File size exceeds the limit of ${MAX_FILE_SIZE_MB}MB.`);
      return false;
    }
    return true;
  };

  const handleSelect = (businessId: string) => {
    setActiveBusiness(businessId);
    localStorage.setItem("nexbrix_active_business_id", businessId);
    router.push("/dashboard/locations");
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = newBusinessName.trim();
    if (!trimmedName || !user) return;

    if (trimmedName.length > 100) {
      toast.error("Business name must be 100 characters or less.");
      return;
    }

    if (!/[a-zA-Z0-9]/.test(trimmedName)) {
      toast.error("Business name cannot contain only special characters.");
      return;
    }

    try {
      setCreating(true);

      let termsUrl: string | undefined;
      let termsName: string | undefined;

      if (addTermsFile) {
        toast.info("Uploading terms document...");
        const uploadResult = await uploadFileToS3(addTermsFile);
        termsUrl = uploadResult.url;
        termsName = uploadResult.name;
      }

      const created = await createBusinessAndLink(user.uid, trimmedName, {
        termsUrl,
        termsName,
      });
      await refreshProfile();

      const newBusiness: Business = {
        id: created.id,
        name: created.name,
        createdBy: user.uid,
        createdAt: new Date().toISOString(),
        isActive: true,
        locationsCount: 0,
        itemsCount: 0,
        termsUrl,
        termsName,
      };

      setBusinesses([...businesses, newBusiness]);
      setNewBusinessName("");
      setAddTermsFile(null);
      setShowAddModal(false);
      toast.success("Business profile created successfully!");

      handleSelect(created.id);
    } catch (err: unknown) {
      console.error("Failed to create business:", err);
      toast.error(
        (err as Error).message ||
          "Failed to create business. Please try again."
      );
    } finally {
      setCreating(false);
    }
  };

  const openEditModal = (bus: Business, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent business selection redirect when clicking edit icon
    setEditingBusiness(bus);
    setEditName(bus.name);
    setEditIsActive(bus.isActive !== false);
    setEditTermsUrl(bus.termsUrl || null);
    setEditTermsName(bus.termsName || null);
    setEditTermsFile(null);
    setShowEditModal(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBusiness) return;

    const trimmedName = editName.trim();
    if (!trimmedName) {
      toast.error("Business name is required.");
      return;
    }

    if (trimmedName.length > 100) {
      toast.error("Business name must be 100 characters or less.");
      return;
    }

    try {
      setUpdating(true);

      let finalTermsUrl = editTermsUrl;
      let finalTermsName = editTermsName;

      if (editTermsFile) {
        toast.info("Uploading new terms document...");
        const uploadResult = await uploadFileToS3(editTermsFile);
        finalTermsUrl = uploadResult.url;
        finalTermsName = uploadResult.name;
      }

      const updated = await updateBusiness(editingBusiness.id, {
        name: trimmedName,
        isActive: editIsActive,
        termsUrl: finalTermsUrl,
        termsName: finalTermsName,
      });

      setBusinesses((prev) =>
        prev.map((b) => (b.id === updated.id ? { ...b, ...updated } : b))
      );

      setShowEditModal(false);
      setEditingBusiness(null);
      setEditTermsFile(null);
      toast.success("Business profile updated successfully!");
    } catch (err: unknown) {
      console.error("Failed to update business:", err);
      toast.error(
        (err as Error).message || "Failed to update business profile."
      );
    } finally {
      setUpdating(false);
    }
  };

  const handleViewTerms = async (keyOrUrl: string) => {
    try {
      toast.info("Preparing terms document...");
      const downloadUrl = await getPresignedDownloadUrl(keyOrUrl);
      window.open(downloadUrl, "_blank", "noopener,noreferrer");
    } catch (err) {
      console.error("Failed to open terms document:", err);
      toast.error("Could not open terms document.");
    }
  };

  const filteredBusinesses = businesses.filter((bus) => {
    const matchesSearch = bus.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const isActive = bus.isActive !== false;
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && isActive) ||
      (statusFilter === "inactive" && !isActive);
    return matchesSearch && matchesStatus;
  });

  if (authLoading || (loading && businesses.length === 0)) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-[#0F172A]">
        <Loader2 className="h-8 w-8 text-black animate-spin mb-4" />
        <p className="text-[#64748B] text-sm font-bold tracking-wide">
          Syncing workspaces...
        </p>
      </div>
    );
  }

  return (
    <div className="px-4 py-3 bg-white min-h-[80vh] scroll-y-auto">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b py-3 px-3 md:py-3 md:px-4 border border-[#E2E8F0] rounded-2xl shadow-sm mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold md:font-extrabold tracking-tight">
            Business
          </h1>
          <p className="text-[#64748B] text-xs font-bold mt-1.5">
            Choose the business you want to manage.
          </p>
        </div>

        {(profile?.role === "admin" || profile?.role === "super_admin") && (
          <button
            onClick={() => {
              setNewBusinessName("");
              setAddTermsFile(null);
              setShowAddModal(true);
            }}
            className="bg-black hover:bg-neutral-800 text-white rounded-full px-5 py-2.5 text-xs font-bold uppercase tracking-wider shadow-sm flex items-center gap-2 cursor-pointer transition-all duration-200"
          >
            <Plus className="h-4 w-4 stroke-[3px]" />
            Add business
          </button>
        )}
      </div>

      <div className="mt-6 flex flex-wrap justify-between gap-3 items-center mb-6">
        <div className="relative flex-1 w-full max-w-[50svw] md:max-w-[30svw]">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
            <Search className="h-4 w-4" />
          </span>
          <input
            type="text"
            placeholder="Search businesses..."
            className="w-full bg-white border border-zinc-200 focus:border-black rounded-xl py-2.5 pl-10 pr-4 text-xs text-zinc-950 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-black transition-all shadow-xs"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <Dropdown
          value={statusFilter}
          onChange={(val) => setStatusFilter(val)}
          options={
            [
              { value: "all", label: "All Statuses" },
              { value: "active", label: "Active" },
              { value: "inactive", label: "Inactive" },
            ] as const
          }
          className="min-w-[130px]"
          triggerClassName="rounded-xl py-2.5 px-3 font-bold text-zinc-950 focus:ring-black focus:border-black"
        />
      </div>

      {filteredBusinesses.length === 0 ? (
        <div className="bg-white border border-zinc-200 rounded-2xl py-16 px-6 text-center flex flex-col items-center justify-center shadow-sm">
          <Building2 className="h-10 w-10 text-zinc-300 mb-3" />
          <h3 className="text-base font-bold text-[#0F172A]">
            No businesses found
          </h3>
          <p className="text-[#64748B] text-xs mt-1 font-semibold max-w-xs leading-relaxed">
            No registered business profiles match your search criteria. Register
            a new business to begin.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredBusinesses.map((bus) => {
            const isSelected = bus.id === activeBusinessId;
            const isBusActive = bus.isActive !== false;
            return (
              <div
                key={bus.id}
                onClick={() => handleSelect(bus.id)}
                className={`w-full border p-5 rounded-2xl flex items-center justify-between transition-all duration-250 cursor-pointer shadow-xs group ${
                  isSelected
                    ? "border-neutral ring-1 ring-black shadow-md shadow-zinc-200/40"
                    : "border-zinc-200/80 hover:border-black/30 shadow-zinc-100 hover:shadow-md hover:shadow-zinc-200/40"
                } ${isBusActive ? "bg-white" : "bg-zinc-50"}`}
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div
                    className={`h-12 w-12 rounded-full flex items-center justify-center shrink-0 border shadow-xs ${
                      isBusActive
                        ? "bg-zinc-100 text-black border-zinc-200/60"
                        : "bg-zinc-200/50 text-zinc-400 border-zinc-200"
                    }`}
                  >
                    <Building2 className="h-5 w-5 stroke-[2.5px]" />
                  </div>

                  <div className="text-left min-w-0">
                    <h3
                      className={`text-base font-bold transition-colors truncate ${
                        isBusActive
                          ? "text-[#0F172A] group-hover:text-black"
                          : "text-zinc-500"
                      }`}
                    >
                      {bus.name}
                    </h3>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-[#64748B] mt-1.5 font-bold">
                      <span className="flex items-center gap-1 shrink-0">
                        <MapPin className="h-3.5 w-3.5 text-zinc-400" />
                        {bus.locationsCount || 0}{" "}
                        {bus.locationsCount === 1 ? "location" : "locations"}
                      </span>
                      <span className="text-zinc-300">•</span>
                      <span className="flex items-center gap-1 shrink-0">
                        <Package className="h-3.5 w-3.5 text-zinc-400" />
                        {bus.itemsCount || 0} stock{" "}
                        {bus.itemsCount === 1 ? "item" : "items"}
                      </span>
                      {bus.termsName && (
                        <>
                          <span className="text-zinc-300">•</span>
                          <span className="flex items-center gap-1 text-zinc-600 truncate max-w-[180px]">
                            <FileText className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                            <span className="truncate">{bus.termsName}</span>
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {isBusActive ? (
                    <span className="text-[11px] uppercase font-bold px-3 py-1 flex items-center gap-1.5 leading-none text-[#16A34A]">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#16A34A]" />
                      Active
                    </span>
                  ) : (
                    <span className="text-[10px] uppercase font-extrabold px-3 py-1 rounded-full flex items-center gap-1.5 border shadow-2xs leading-none bg-zinc-100 text-[#64748B] border-zinc-200">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#64748B]" />
                      Inactive
                    </span>
                  )}

                  <button
                    type="button"
                    title="Edit Business"
                    onClick={(e) => openEditModal(bus, e)}
                    className="p-2 rounded-xl text-zinc-400 hover:text-black hover:bg-zinc-100 border border-transparent hover:border-zinc-200 transition-all cursor-pointer"
                  >
                    <Pencil className="h-4 w-4 stroke-[2.2px]" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex items-center gap-1.5 justify-center py-4 mt-6 text-[#64748B] text-xs font-bold uppercase tracking-wider">
        <Lock className="h-3.5 w-3.5 text-zinc-400" />
        <span>Only businesses you have access to are shown.</span>
      </div>

      {/* CREATE BUSINESS MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-2xl max-w-md w-full mx-4 animate-scale-up">
            <h3 className="text-lg font-extrabold text-[#0F172A] mb-2">
              Create business profile
            </h3>
            <p className="text-[#64748B] text-xs mb-5 font-semibold leading-relaxed">
              Register a new business venue to manage inventory and
              reconciliation counts.
            </p>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1.5">
                  Business Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Starbucks"
                  required
                  maxLength={100}
                  className="w-full bg-white border border-zinc-300 focus:border-black rounded-xl py-2.5 px-4 text-sm text-zinc-950 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-black transition-all"
                  value={newBusinessName}
                  onChange={(e) => setNewBusinessName(e.target.value)}
                  disabled={creating}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1.5">
                  Terms Document (PDF / Word)
                </label>
                {!addTermsFile ? (
                  <label className="flex items-center justify-center gap-2 w-full p-3 border-2 border-dashed border-zinc-200 hover:border-black rounded-xl cursor-pointer bg-zinc-50 hover:bg-zinc-100/80 transition-all group">
                    <Upload className="h-4 w-4 text-zinc-400 group-hover:text-black transition-colors" />
                    <span className="text-xs font-semibold text-zinc-600 group-hover:text-black">
                      Upload PDF or Word document
                    </span>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file && validateFile(file)) {
                          setAddTermsFile(file);
                        }
                      }}
                      disabled={creating}
                    />
                  </label>
                ) : (
                  <div className="flex items-center justify-between p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-semibold text-zinc-800">
                    <div className="flex items-center gap-2 truncate">
                      <FileText className="h-4 w-4 text-black shrink-0" />
                      <span className="truncate">{addTermsFile.name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAddTermsFile(null)}
                      className="p-1 hover:bg-zinc-200 rounded-lg text-zinc-500 hover:text-red-600 transition-colors"
                      disabled={creating}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
                <p className="text-[11px] text-zinc-400 mt-1 font-medium">
                  This document will be displayed during staff onboarding.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setAddTermsFile(null);
                  }}
                  className="bg-[#F1F5F9] hover:bg-zinc-200 text-zinc-700 rounded-xl px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
                  disabled={creating}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || !newBusinessName.trim()}
                  className="bg-black hover:bg-neutral-800 text-white rounded-xl px-4 py-2.5 text-xs font-bold uppercase tracking-wider shadow-sm flex items-center gap-2 cursor-pointer transition-colors disabled:opacity-50 animate-fade-in"
                >
                  {creating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-white" />
                      Creating...
                    </>
                  ) : (
                    "Add business"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT BUSINESS MODAL */}
      {showEditModal && editingBusiness && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-2xl max-w-md w-full mx-4 animate-scale-up">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-extrabold text-[#0F172A]">
                Edit business profile
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowEditModal(false);
                  setEditingBusiness(null);
                }}
                className="p-1 rounded-lg text-zinc-400 hover:text-black hover:bg-zinc-100 transition-colors"
                disabled={updating}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-[#64748B] text-xs mb-5 font-semibold leading-relaxed">
              Update business details, status, and onboarding terms document.
            </p>

            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1.5">
                  Business Name *
                </label>
                <input
                  type="text"
                  required
                  maxLength={100}
                  className="w-full bg-white border border-zinc-300 focus:border-black rounded-xl py-2.5 px-4 text-sm text-zinc-950 focus:outline-none focus:ring-1 focus:ring-black transition-all"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  disabled={updating}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1.5">
                  Status
                </label>
                <Dropdown
                  value={editIsActive ? "active" : "inactive"}
                  onChange={(val) => setEditIsActive(val === "active")}
                  options={
                    [
                      { value: "active", label: "Active" },
                      { value: "inactive", label: "Inactive" },
                    ] as const
                  }
                  className="w-full"
                  triggerClassName="w-full rounded-xl py-2.5 px-3 font-semibold text-zinc-950 border-zinc-300 focus:ring-black focus:border-black"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1.5">
                  Terms Document
                </label>

                {/* Existing Document Banner */}
                {editTermsUrl && editTermsName && !editTermsFile && (
                  <div className="flex items-center justify-between p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-semibold text-zinc-800 mb-2">
                    <div className="flex items-center gap-2 truncate">
                      <FileText className="h-4 w-4 text-black shrink-0" />
                      <span className="truncate">{editTermsName}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleViewTerms(editTermsUrl)}
                        className="p-1 hover:bg-zinc-200 rounded-lg text-zinc-600 hover:text-black flex items-center gap-1 transition-colors"
                        title="View Document"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        <span className="text-[10px] uppercase font-bold">View</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditTermsUrl(null);
                          setEditTermsName(null);
                        }}
                        className="p-1 hover:bg-zinc-200 rounded-lg text-zinc-500 hover:text-red-600 transition-colors"
                        title="Remove Document"
                        disabled={updating}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )}

                {/* New file selected preview */}
                {editTermsFile && (
                  <div className="flex items-center justify-between p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-semibold text-zinc-800 mb-2">
                    <div className="flex items-center gap-2 truncate">
                      <FileText className="h-4 w-4 text-black shrink-0" />
                      <span className="truncate">{editTermsFile.name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditTermsFile(null)}
                      className="p-1 hover:bg-zinc-200 rounded-lg text-zinc-500 hover:text-red-600 transition-colors"
                      disabled={updating}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}

                {/* File Upload Selector */}
                {(!editTermsUrl || editTermsFile) && (
                  <label className="flex items-center justify-center gap-2 w-full p-3 border-2 border-dashed border-zinc-200 hover:border-black rounded-xl cursor-pointer bg-zinc-50 hover:bg-zinc-100/80 transition-all group">
                    <Upload className="h-4 w-4 text-zinc-400 group-hover:text-black transition-colors" />
                    <span className="text-xs font-semibold text-zinc-600 group-hover:text-black">
                      {editTermsFile ? "Change replacement file" : "Upload PDF or Word document"}
                    </span>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file && validateFile(file)) {
                          setEditTermsFile(file);
                        }
                      }}
                      disabled={updating}
                    />
                  </label>
                )}

                {editTermsUrl && !editTermsFile && (
                  <label className="inline-block mt-1 text-[11px] font-bold text-black hover:underline cursor-pointer">
                    + Replace with new document
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file && validateFile(file)) {
                          setEditTermsFile(file);
                        }
                      }}
                      disabled={updating}
                    />
                  </label>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingBusiness(null);
                  }}
                  className="bg-[#F1F5F9] hover:bg-zinc-200 text-zinc-700 rounded-xl px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
                  disabled={updating}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating || !editName.trim()}
                  className="bg-black hover:bg-neutral-800 text-white rounded-xl px-4 py-2.5 text-xs font-bold uppercase tracking-wider shadow-sm flex items-center gap-2 cursor-pointer transition-colors disabled:opacity-50 animate-fade-in"
                >
                  {updating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-white" />
                      Saving...
                    </>
                  ) : (
                    "Save changes"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
