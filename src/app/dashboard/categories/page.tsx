"use client";

import { toast } from "sonner";
import { useEffect, useState, useMemo } from "react";

import { Category } from "@/types/inventory";
import { useAuth } from "@/providers/auth-provider";
import { useBusinessStore } from "@/stores/business-store";
import { useCategoryStore } from "@/stores/category-store";
import { Dropdown } from "@/components/ui/dropdown";
import {
  Layers,
  Plus,
  Search,
  X,
  Loader2,
  Edit2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
] as const;

const FORM_STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
] as const;

export default function CategoriesPage() {
  const { activeBusinessId } = useBusinessStore();
  const { profile } = useAuth();
  const {
    categories,
    loading: categoriesLoading,
    error: storeError,
    fetchCategories,
    addCategory,
    updateCategory,
  } = useCategoryStore();

  const [loadingContext, setLoadingContext] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all");

  const [showDrawer, setShowDrawer] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formIcon, setFormIcon] = useState("other");
  const [formStatus, setFormStatus] = useState<"active" | "inactive">("active");

  const [saving, setSaving] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;

  useEffect(() => {
    if (!activeBusinessId) return;
    const businessId = activeBusinessId;

    async function loadContext() {
      try {
        setLoadingContext(true);
        await fetchCategories(businessId);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingContext(false);
      }
    }

    loadContext();
  }, [activeBusinessId, profile, fetchCategories]);

  useEffect(() => {
    if (storeError) {
      toast.error(storeError);
    }
  }, [storeError]);

  const openAddDrawer = () => {
    setEditId(null);
    setFormName("");
    setFormDescription("");
    setFormIcon("other");
    setFormStatus("active");
    setShowDrawer(true);
  };

  const openEditDrawer = (cat: Category) => {
    setEditId(cat.id);
    setFormName(cat.name);
    setFormDescription(cat.description || "");
    setFormIcon(cat.icon || "other");
    setFormStatus(cat.status);
    setShowDrawer(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = formName.trim();
    if (!activeBusinessId || !trimmedName) {
      toast.error("Please fill in all required fields.");
      return;
    }

    if (trimmedName.length > 100) {
      toast.error("Category name must be 100 characters or less.");
      return;
    }

    if (!/[a-zA-Z]/.test(trimmedName)) {
      toast.error(
        "Category name cannot contain only numbers or special characters.",
      );
      return;
    }
    const trimmedDescription = formDescription.trim();
    if (trimmedDescription) {
      if (trimmedDescription.length > 250) {
        toast.error("Category description must be 250 characters or less.");
        return;
      }
      if (!/[a-zA-Z0-9]/.test(trimmedDescription)) {
        toast.error(
          "Category description cannot contain only special characters.",
        );
        return;
      }
    }

    try {
      setSaving(true);

      const categoryData = {
        businessId: activeBusinessId,
        name: trimmedName,
        description: formDescription.trim() || undefined,
        icon: formIcon,
        status: formStatus,
      };

      if (editId) {
        await updateCategory(activeBusinessId, editId, categoryData);
        toast.success("Category updated successfully!");
      } else {
        await addCategory(activeBusinessId, categoryData);
        toast.success("Category added successfully!");
      }

      setShowDrawer(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const filteredCategories = useMemo(() => {
    return categories.filter((cat) => {
      const matchesSearch =
        cat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cat.description?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && cat.status === "active") ||
        (statusFilter === "inactive" && cat.status === "inactive");

      return matchesSearch && matchesStatus;
    });
  }, [categories, searchQuery, statusFilter]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredCategories.length / itemsPerPage),
  );
  const paginatedCategories = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredCategories.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredCategories, currentPage]);

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

  if (categoriesLoading || loadingContext) {
    return (
      <div className="h-[75vh] flex flex-col items-center justify-center bg-white text-[#0F172A]">
        <Loader2 className="h-7 w-7 text-[#0a2924] animate-spin mb-3" />
        <span className="text-[#64748B] text-xs font-bold uppercase tracking-wider">
          Loading categories...
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-white h-[calc(100vh-120px)] md:h-[85vh] min-h-0 relative select-none">
      <div className="flex-1 min-h-0 flex flex-col space-y-4 pr-0 lg:pr-4">
        <div className="bg-white border border-[#E2E8F0] rounded-2xl py-4 px-5 md:py-3 md:px-4  flex justify-between items-center shadow-sm">
          <h1 className="text-xl md:text-2xl font-extrabold text-zinc-900 tracking-tight">
            Categories
          </h1>
          <button
            onClick={openAddDrawer}
            className="bg-[#0a2924] hover:bg-[#09231f] text-white rounded-full px-6 py-2.5 text-xs font-bold transition-all duration-200 flex items-center gap-2 shadow-xs cursor-pointer"
          >
            <Plus className="h-4 w-4 stroke-[2.5px]" />
            Add Categories
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 items-center">
          <div className="relative w-full sm:w-80">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
              <Search className="h-4 w-4" />
            </span>
            <input
              type="text"
              placeholder="Search Categories"
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
            options={STATUS_OPTIONS}
            className="w-full sm:w-40"
            triggerClassName="rounded-2xl py-2.5 pl-3.5 pr-4"
          />
        </div>

        {filteredCategories.length === 0 ? (
          <div className="bg-white border border-zinc-200 rounded-2xl py-20 px-6 text-center flex flex-col items-center justify-center shadow-sm animate-fade-in">
            <Layers className="h-12 w-12 text-zinc-300 mb-3" />
            <h3 className="text-base font-bold text-[#0F172A]">
              No categories found
            </h3>
            <p className="text-[#64748B] text-xs mt-1 font-semibold max-w-xs leading-relaxed">
              No stock categories match your criteria. Click Add Categories to
              begin.
            </p>
          </div>
        ) : (
          <div className="bg-white border border-zinc-200 rounded-2xl shadow-xs overflow-hidden flex-1 min-h-0 flex flex-col">
            <div className="overflow-auto flex-1 min-h-0">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-200 text-[10px] uppercase font-extrabold tracking-wider text-[#64748B] bg-zinc-50 sticky top-0 z-10 text-center">
                    <th className="py-4 px-6 font-extrabold">Category Name</th>
                    <th className="py-4 px-6 font-extrabold">Description</th>
                    <th className="py-4 px-6 font-extrabold">ITEMS COUNT</th>
                    <th className="py-4 px-6 font-extrabold">Status</th>
                    <th className="py-4 px-6 font-extrabold text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 text-xs text-[#0F172A]">
                  {paginatedCategories.map((cat) => {
                    return (
                      <tr
                        key={cat.id}
                        className="hover:bg-zinc-50/40 transition-colors text-center"
                      >
                        <td className="py-4 px-6">
                          <span
                            className="font-semibold text-[#0F172A] hover:text-[#0a2924] transition-colors cursor-pointer underline underline-offset-4 decoration-zinc-300"
                            onClick={() => openEditDrawer(cat)}
                          >
                            {cat.name}
                          </span>
                        </td>

                        <td className="py-4 px-6 font-semibold">
                          {cat.description || "—"}
                        </td>

                        <td className="py-4 px-6 font-semibold text-center text-[#0F172A]">
                          {cat.itemsCount ?? 0}
                        </td>

                        <td className="py-4 px-6">
                          {cat.status === "active" ? (
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
                              onClick={() => openEditDrawer(cat)}
                              className="h-8 w-8 flex items-center justify-center text-zinc-500 hover:text-[#0a2924] hover:border-[#0a2924] bg-white transition-colors cursor-pointer"
                              title="Edit Category"
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
                  filteredCategories.length,
                  (currentPage - 1) * itemsPerPage + 1,
                )}{" "}
                to{" "}
                {Math.min(
                  filteredCategories.length,
                  currentPage * itemsPerPage,
                )}{" "}
                of {filteredCategories.length} categories
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
                    {editId ? "Edit Category" : "Add Category"}
                  </h3>
                  <p className="text-[#64748B] text-xs font-semibold mt-1">
                    {editId
                      ? "Edit the details for this category."
                      : "Enter the details for the new category."}
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
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#0F172A] block">
                      Category Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={100}
                      placeholder="Enter category name"
                      className="w-full bg-white border border-zinc-300 focus:border-[#0a2924] rounded-xl py-2.5 px-3.5 text-xs text-zinc-950 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-[#0a2924] transition-all"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold text-[#0F172A] block">
                        Description (Optional)
                      </label>
                      <span className="text-[10px] text-zinc-400 font-bold">
                        {formDescription.length}/250
                      </span>
                    </div>
                    <textarea
                      maxLength={250}
                      placeholder="Enter description"
                      rows={4}
                      className="w-full bg-white border border-zinc-300 focus:border-[#0a2924] rounded-xl py-2.5 px-3.5 text-xs text-zinc-950 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-[#0a2924] transition-all resize-none"
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                    />
                  </div>

                  {/* Reusable Dropdown component for Drawer Status Selector */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#0F172A] block">
                      Status <span className="text-rose-500">*</span>
                    </label>
                    <Dropdown
                      value={formStatus}
                      onChange={(val) =>
                        setFormStatus(val as "active" | "inactive")
                      }
                      options={FORM_STATUS_OPTIONS}
                      className="w-full"
                      triggerClassName="border-zinc-300 rounded-xl py-2.5 px-3.5 font-bold text-[#0F172A]"
                      optionClassName="font-bold text-[#0F172A]"
                    />
                    <p className="text-[10px] text-zinc-400 font-bold mt-1.5">
                      Inactive categories will not be available when adding
                      stock items.
                    </p>
                  </div>
                </div>
              </form>
            </div>

            <div className="border-t border-zinc-200 p-6 bg-zinc-50 flex items-center justify-end gap-3 rounded-b-2xl">
              <button
                type="button"
                onClick={() => setShowDrawer(false)}
                className="bg-white border border-zinc-200 hover:bg-zinc-100 text-zinc-700 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-150 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-[#0a2924] hover:bg-[#09231f] disabled:bg-[#0a2924]/60 text-white px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider shadow-sm flex items-center gap-1.5 transition-all duration-150 cursor-pointer"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Category"
                )}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
