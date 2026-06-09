"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { toast } from "sonner";
import AlertDialog from "@/components/alert-dialog";
import { useBusinessStore } from "@/store/business-store";
import { useCategoryStore } from "@/store/category-store";
import { useAuth } from "@/providers/auth-provider";
import { getUserBusinesses } from "@/lib/repositories/business.repository";
import { Category } from "@/types/inventory";
import { Business } from "@/types/business";
import {
  Layers,
  Plus,
  Search,
  ChevronDown,
  X,
  Loader2,
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Package,
  CupSoda,
  Beef,
  Milk,
  Leaf,
  Wheat,
  Flame,
  Boxes,
  MoreVertical,
  AlertCircle,
} from "lucide-react";

const AVAILABLE_ICONS = [
  { key: "beverage", label: "Beverages", icon: CupSoda },
  { key: "meat", label: "Meat & Poultry", icon: Beef },
  { key: "dairy", label: "Dairy", icon: Milk },
  { key: "produce", label: "Produce", icon: Leaf },
  { key: "drygoods", label: "Dry Goods", icon: Wheat },
  { key: "sauce", label: "Condiments & Sauces", icon: Flame },
  { key: "package", label: "Packaging", icon: Package },
  { key: "other", label: "Other", icon: Boxes },
];

const ICON_MAP: Record<string, any> = {
  package: Package,
  beverage: CupSoda,
  meat: Beef,
  dairy: Milk,
  produce: Leaf,
  drygoods: Wheat,
  sauce: Flame,
  other: Boxes,
};

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
    deleteCategory,
  } = useCategoryStore();

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
  const [formDescription, setFormDescription] = useState("");
  const [formIcon, setFormIcon] = useState("other");
  const [formStatus, setFormStatus] = useState<"active" | "inactive">("active");

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
        await fetchCategories(businessId);

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
  }, [activeBusinessId, profile, fetchCategories]);

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
    setActiveMenuId(null);
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

    if (!/[a-zA-Z0-9]/.test(trimmedName)) {
      toast.error("Category name cannot contain only special characters.");
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
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to save category. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (catId: string) => {
    setActiveMenuId(null);
    setDeleteTarget(catId);
  };

  const handleConfirmDelete = async () => {
    if (!activeBusinessId || !deleteTarget) return;
    try {
      await deleteCategory(activeBusinessId, deleteTarget);
      toast.success("Category deleted successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete category.");
    } finally {
      setDeleteTarget(null);
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
        <Loader2 className="h-7 w-7 text-[#16A34A] animate-spin mb-3" />
        <span className="text-[#64748B] text-xs font-bold uppercase tracking-wider">
          Loading categories...
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
              Categories
            </h1>
            <p className="text-[#64748B] text-xs font-bold mt-1.5">
              Organize your stock items into categories for easier management
              and reporting.
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={openAddDrawer}
              className="flex-1 sm:flex-initial bg-[#16A34A] hover:bg-[#15803D] text-white rounded-xl px-5 py-2.5 text-xs font-bold uppercase tracking-wider shadow-sm flex items-center justify-center gap-2 cursor-pointer transition-all duration-200"
            >
              <Plus className="h-4 w-4 stroke-[3px]" />
              Add Category
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
                placeholder="Search categories..."
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
        </div>

        {storeError && (
          <div className="bg-rose-50 border border-rose-200 text-rose-600 text-xs rounded-xl p-3 flex items-center gap-2 justify-center font-bold">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {storeError}
          </div>
        )}

        {filteredCategories.length === 0 ? (
          <div className="bg-white border border-zinc-200 rounded-2xl py-20 px-6 text-center flex flex-col items-center justify-center shadow-sm animate-fade-in">
            <Layers className="h-12 w-12 text-zinc-300 mb-3" />
            <h3 className="text-base font-bold text-[#0F172A]">
              No categories found
            </h3>
            <p className="text-[#64748B] text-xs mt-1 font-semibold max-w-xs leading-relaxed">
              No stock categories match your criteria. Click Add Category to
              begin.
            </p>
          </div>
        ) : (
          <div className="bg-white border border-zinc-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-200 text-[10px] uppercase font-extrabold tracking-wider text-[#64748B] bg-zinc-50/50">
                    <th className="py-4 px-6 font-extrabold">Category Name</th>
                    <th className="py-4 px-6 font-extrabold">Description</th>
                    <th className="py-4 px-6 font-extrabold">Items</th>
                    <th className="py-4 px-6 font-extrabold">Status</th>
                    <th className="py-4 px-6 font-extrabold text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 text-xs text-[#0F172A]">
                  {paginatedCategories.map((cat) => {
                    const IconComponent =
                      ICON_MAP[cat.icon || "other"] || Layers;
                    return (
                      <tr
                        key={cat.id}
                        className="hover:bg-zinc-50/40 transition-colors"
                      >
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3.5">
                            <div className="h-9 w-9 rounded-xl bg-emerald-50 text-[#16A34A] flex items-center justify-center shrink-0 border border-emerald-100/50 shadow-xs">
                              <IconComponent className="h-4 w-4" />
                            </div>
                            <span
                              className="font-extrabold text-[#0F172A] hover:text-[#16A34A] transition-colors cursor-pointer"
                              onClick={() => openEditDrawer(cat)}
                            >
                              {cat.name.length > 15
                                ? cat.name.substring(0, 15) + "..."
                                : cat.name}
                            </span>
                          </div>
                        </td>

                        <td className="py-4 px-6 font-semibold text-zinc-600 max-w-sm truncate">
                          {cat.description
                            ? cat.description.length > 30
                              ? cat.description.substring(0, 30) + "..."
                              : cat.description
                            : "—"}
                        </td>

                        <td className="py-4 px-6 font-extrabold text-zinc-700">
                          {cat.itemsCount ?? 0}
                        </td>

                        <td className="py-4 px-6">
                          <div className="inline-flex items-center gap-1.5">
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                cat.status === "active"
                                  ? "bg-[#16A34A]"
                                  : "bg-[#64748B]"
                              }`}
                            />
                            <span
                              className={`text-[10px] font-extrabold ${
                                cat.status === "active"
                                  ? "text-[#16A34A]"
                                  : "text-[#64748B]"
                              }`}
                            >
                              {cat.status === "active" ? "Active" : "Inactive"}
                            </span>
                          </div>
                        </td>

                        <td className="py-4 px-6 text-right relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuId(
                                activeMenuId === cat.id ? null : cat.id,
                              );
                            }}
                            className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-[#0F172A] transition-colors cursor-pointer"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>

                          {activeMenuId === cat.id && (
                            <div
                              ref={menuRef}
                              className="absolute right-6 top-10 w-32 bg-white border border-zinc-200 rounded-xl shadow-lg py-1.5 z-10 text-left animate-fade-in"
                            >
                              <button
                                onClick={() => openEditDrawer(cat)}
                                className="w-full px-4 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-50 hover:text-[#16A34A] transition-colors flex items-center gap-2 cursor-pointer"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                                Edit Details
                              </button>
                              <button
                                onClick={() => handleDelete(cat.id)}
                                className="w-full px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors flex items-center gap-2 cursor-pointer border-t border-zinc-100"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Delete
                              </button>
                            </div>
                          )}
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
                      className="w-full bg-white border border-zinc-300 focus:border-[#16A34A] rounded-xl py-2.5 px-3.5 text-xs text-zinc-950 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-[#16A34A] transition-all"
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
                      className="w-full bg-white border border-zinc-300 focus:border-[#16A34A] rounded-xl py-2.5 px-3.5 text-xs text-zinc-950 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-[#16A34A] transition-all resize-none"
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[#0F172A] block">
                      Icon (Optional)
                    </label>
                    <p className="text-[10px] text-zinc-400 font-bold mb-1.5">
                      Choose an icon to represent this category.
                    </p>
                    <div className="grid grid-cols-4 gap-2">
                      {AVAILABLE_ICONS.map((item) => {
                        const IconComponent = item.icon;
                        const isSelected = formIcon === item.key;
                        return (
                          <button
                            key={item.key}
                            type="button"
                            onClick={() => setFormIcon(item.key)}
                            className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                              isSelected
                                ? "border-[#16A34A] bg-emerald-50/60 text-[#16A34A] ring-1 ring-[#16A34A]"
                                : "border-zinc-200 hover:bg-zinc-50 text-zinc-600 hover:text-zinc-950"
                            }`}
                            title={item.label}
                          >
                            <IconComponent className="h-5 w-5 mb-1" />
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#0F172A] block">
                      Status <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <select
                        required
                        className="w-full bg-white border border-zinc-300 focus:border-[#16A34A] rounded-xl py-2.5 px-3.5 text-xs text-[#0F172A] font-bold focus:outline-none focus:ring-1 focus:ring-[#16A34A] appearance-none cursor-pointer"
                        value={formStatus}
                        onChange={(e) => setFormStatus(e.target.value as any)}
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                      <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
                    </div>
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
                className="bg-[#16A34A] hover:bg-[#15803D] disabled:bg-[#16A34A]/60 text-white px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider shadow-sm flex items-center gap-1.5 transition-all duration-150 cursor-pointer"
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

      <AlertDialog
        open={deleteTarget !== null}
        title="Delete Category"
        description="Are you sure you want to delete this category? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
