/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { toast } from "sonner";
import { useEffect, useState, useMemo, useRef } from "react";

import { Business } from "@/types/business";
import { useAuth } from "@/providers/auth-provider";
import AlertDialog from "@/components/ui/alert-dialog";
import { Recipe, StockItem } from "@/types/inventory";
import { useRecipeStore } from "@/stores/recipe-store";
import { useCategoryStore } from "@/stores/category-store";
import { useBusinessStore } from "@/stores/business-store";
import { getStockItems } from "@/lib/repositories/stock-item.repository";
import { getUserBusinesses } from "@/lib/repositories/business.repository";
import {
  ChefHat,
  Plus,
  Search,
  ChevronDown,
  X,
  Loader2,
  Edit2,
  Trash2,
  PlusCircle,
  AlertTriangle,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export default function ProductsPage() {
  const { activeBusinessId } = useBusinessStore();
  const { profile } = useAuth();
  const {
    recipes,
    loading: recipesLoading,
    error: storeError,
    fetchRecipes,
    addRecipe,
    updateRecipe,
    deleteRecipe,
  } = useRecipeStore();

  const { categories, fetchCategories } = useCategoryStore();

  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [activeBusiness, setActiveBusiness] = useState<Business | null>(null);
  const [loadingContext, setLoadingContext] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all");

  const [visibleCount, setVisibleCount] = useState(20);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const [showDrawer, setShowDrawer] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const [formName, setFormName] = useState("");
  const [formCode, setFormCode] = useState("");
  const [formCategoryId, setFormCategoryId] = useState("");
  const [formYieldQty, setFormYieldQty] = useState(1);
  const [formYieldUnit, setFormYieldUnit] = useState("Serving");
  const [formDescription, setFormDescription] = useState("");
  const [formStatus, setFormStatus] = useState<"active" | "inactive">("active");
  const [formIngredients, setFormIngredients] = useState<
    { itemId: string; qtyUsed: number }[]
  >([]);
  const [formSalesAmount, setFormSalesAmount] = useState("");
  const [isSalesAmountManuallySet, setIsSalesAmountManuallySet] =
    useState(false);

  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  useEffect(() => {
    if (!activeBusinessId) return;
    const businessId = activeBusinessId;

    async function loadContext() {
      try {
        setLoadingContext(true);
        await Promise.all([
          fetchRecipes(businessId),
          fetchCategories(businessId),
        ]);

        const [itemsList, list] = await Promise.all([
          getStockItems(businessId),
          getUserBusinesses([]),
        ]);
        setStockItems(itemsList);
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
  }, [activeBusinessId, profile, fetchRecipes, fetchCategories]);

  useEffect(() => {
    if (storeError) {
      toast.error(storeError);
    }
  }, [storeError]);

  const openAddDrawer = () => {
    setEditId(null);
    setFormName("");
    setFormCode("");
    setFormCategoryId(categories[0]?.id || "");
    setFormYieldQty(1);
    setFormYieldUnit("Serving");
    setFormDescription("");
    setFormStatus("active");
    setFormIngredients([]);
    setFormSalesAmount("");
    setIsSalesAmountManuallySet(false);
    setShowDrawer(true);
  };

  const openEditDrawer = (rec: Recipe) => {
    setEditId(rec.id);
    setFormName(rec.recipeName);
    setFormCode(rec.recipeCode || "");
    setFormCategoryId(rec.categoryId || "");
    setFormYieldQty(rec.yieldQty);
    setFormYieldUnit(rec.yieldUnit);
    setFormDescription(rec.description || "");
    setFormStatus(rec.status);
    setFormIngredients(
      (rec.ingredients || []).map((ing) => ({
        itemId: ing.itemId,
        qtyUsed: ing.qtyUsed,
      })),
    );
    setFormSalesAmount(
      rec.salesAmount !== undefined && rec.salesAmount !== null
        ? String(rec.salesAmount)
        : "",
    );
    setIsSalesAmountManuallySet(true);
    setShowDrawer(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!activeBusinessId) {
      toast.error("Active business ID not found.");
      return;
    }

    const trimmedName = formName.trim();
    if (!trimmedName) {
      toast.error("Product Name is required.");
      return;
    }
    if (trimmedName.length > 50) {
      toast.error("Product Name cannot exceed 50 characters.");
      return;
    }
    if (!/^[a-zA-Z0-9\s]+$/.test(trimmedName)) {
      toast.error("Product Name can only contain letters, numbers, and spaces.");
      return;
    }
    if (/^\d+$/.test(trimmedName)) {
      toast.error("Product Name cannot consist only of numbers.");
      return;
    }

    const trimmedCode = formCode.trim();
    if (trimmedCode) {
      if (trimmedCode.length > 20) {
        toast.error("Product Code cannot exceed 20 characters.");
        return;
      }
      if (!/^[a-zA-Z0-9-]+$/.test(trimmedCode)) {
        toast.error("Product Code can only contain letters, numbers, and hyphens (-).");
        return;
      }
    }

    if (!formCategoryId) {
      toast.error("Category is required.");
      return;
    }

    if (formYieldQty <= 0) {
      toast.error("Yield / Serving quantity must be a positive integer.");
      return;
    }

    const trimmedYieldUnit = formYieldUnit.trim();
    if (!trimmedYieldUnit) {
      toast.error("Yield Unit is required.");
      return;
    }
    if (trimmedYieldUnit.length > 20) {
      toast.error("Yield Unit cannot exceed 20 characters.");
      return;
    }
    if (!/^[a-zA-Z\s]+$/.test(trimmedYieldUnit)) {
      toast.error("Yield Unit can only contain letters and spaces.");
      return;
    }

    if (!formSalesAmount.trim() || parseFloat(formSalesAmount) < 0) {
      toast.error("Sales Amount must be a non-negative number.");
      return;
    }

    const trimmedDescription = formDescription.trim();
    if (trimmedDescription && trimmedDescription.length > 200) {
      toast.error("Description cannot exceed 200 characters.");
      return;
    }

    const invalidIngredient = formIngredients.some(
      (ing) => !ing.itemId || ing.qtyUsed <= 0,
    );
    if (invalidIngredient) {
      toast.error(
        "Please ensure all ingredients have a selected item and positive quantity.",
      );
      return;
    }

    try {
      setSaving(true);

      const ingredientsData = formIngredients.map((ing) => {
        const item = stockItems.find((s) => s.id === ing.itemId);
        return {
          itemId: ing.itemId,
          qtyUsed: ing.qtyUsed,
          unit: item?.baseUnit || "pcs",
          costPerUnit: item?.costPerBaseUnit || 0.0,
          totalCost: ing.qtyUsed * (item?.costPerBaseUnit || 0.0),
        };
      });

      const recipeData = {
        businessId: activeBusinessId,
        recipeName: trimmedName,
        recipeCode: trimmedCode || undefined,
        categoryId: formCategoryId || undefined,
        yieldQty: formYieldQty,
        yieldUnit: trimmedYieldUnit,
        description: trimmedDescription || undefined,
        status: formStatus,
        salesAmount: parseFloat(formSalesAmount),
        ingredients: ingredientsData,
      };

      if (editId) {
        await updateRecipe(activeBusinessId, editId, recipeData);
        toast.success("Product updated successfully!");
      } else {
        await addRecipe(activeBusinessId, recipeData);
        toast.success("Product added successfully!");
      }

      setShowDrawer(false);
    } catch (err) {
      if (err instanceof Error) {
        toast.error(err.message);
      } else {
        toast.error("Failed to save product. Please try again.");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (recId: string) => {
    setDeleteTarget(recId);
  };

  const handleConfirmDelete = async () => {
    if (!activeBusinessId || !deleteTarget) return;
    try {
      await deleteRecipe(activeBusinessId, deleteTarget);
      toast.success("Product deleted successfully!");
    } catch (err) {
      if (err instanceof Error) {
        toast.error(err.message);
      } else {
        toast.error("Failed to delete product.");
      }
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleAddIngredientRow = () => {
    const available = stockItems.find(
      (s) => !formIngredients.some((ing) => ing.itemId === s.id),
    );
    setFormIngredients([
      ...formIngredients,
      { itemId: available?.id || stockItems[0]?.id || "", qtyUsed: 1 },
    ]);
  };

  const handleRemoveIngredientRow = (index: number) => {
    const updated = [...formIngredients];
    updated.splice(index, 1);
    setFormIngredients(updated);
  };

  const handleIngredientChange = (
    index: number,
    field: "itemId" | "qtyUsed",
    value: string | number,
  ) => {
    const updated = [...formIngredients];
    updated[index] = {
      ...updated[index],
      [field]: value,
    };
    setFormIngredients(updated);
  };

  const currentServingCost = useMemo(() => {
    let total = 0;
    for (const ing of formIngredients) {
      const item = stockItems.find((s) => s.id === ing.itemId);
      if (item) {
        total += ing.qtyUsed * (item.costPerBaseUnit || 0);
      }
    }
    return formYieldQty > 0 ? total / formYieldQty : 0;
  }, [formIngredients, stockItems, formYieldQty]);

  // Sync sales amount with serving cost if not manually set
  useEffect(() => {
    if (!editId && !isSalesAmountManuallySet) {
      setFormSalesAmount(
        currentServingCost > 0 ? currentServingCost.toFixed(2) : "",
      );
    }
  }, [currentServingCost, isSalesAmountManuallySet, editId]);

  const filteredRecipes = useMemo(() => {
    return recipes.filter((rec) => {
      const matchesSearch =
        rec.recipeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rec.recipeCode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rec.description?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory =
        categoryFilter === "all" || rec.categoryId === categoryFilter;

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && rec.status === "active") ||
        (statusFilter === "inactive" && rec.status === "inactive");

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [recipes, searchQuery, categoryFilter, statusFilter]);

  useEffect(() => {
    setVisibleCount(20);
  }, [searchQuery, categoryFilter, statusFilter]);

  // Infinite Scroll Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + 20, filteredRecipes.length));
        }
      },
      { threshold: 0.1 },
    );

    const currentRef = loadMoreRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [filteredRecipes.length]);

  const visibleRecipes = useMemo(() => {
    return filteredRecipes.slice(0, visibleCount);
  }, [filteredRecipes, visibleCount]);

  if (!activeBusinessId) {
    return null;
  }

  if (recipesLoading || loadingContext) {
    return (
      <div className="min-h-[75vh] flex flex-col items-center justify-center bg-white text-neutral-900">
        <Loader2 className="h-7 w-7 text-neutral-900 animate-spin mb-3" />
        <p className="text-neutral-400 text-xs font-bold uppercase tracking-wider">
          Loading products...
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 bg-white min-h-0 w-full pb-8 select-none font-sans antialiased text-neutral-900">
      <div className="w-full space-y-4">
        {/* Header Card */}
        <div className="bg-white border border-neutral-200 rounded-3xl py-4 px-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm">
          <div>
            <h1 className="text-[24px] font-bold text-neutral-900 tracking-tight">
              Products
            </h1>
            <p className="text-neutral-500 text-xs font-medium mt-0.5">
              Create and manage products to track ingredients and portion costs.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={openAddDrawer}
              className="inline-flex items-center gap-2 bg-[#0A2924] hover:bg-[#0A2924]/90 border border-[#0A2924] text-white px-5 py-2.5 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer shadow-sm"
            >
              <Plus className="h-4 w-4 stroke-[2.5]" />
              <span>Add Product</span>
            </button>
          </div>
        </div>

        {/* Filter Controls Row */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 w-full">
          <div className="relative flex-1 max-w-md">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
              <Search className="h-4 w-4" />
            </span>
            <input
              type="text"
              placeholder="Search products..."
              className="w-full bg-white border border-neutral-200 focus:border-neutral-900 focus:ring-4 focus:ring-neutral-900/5 rounded-full py-2.5 pl-10 pr-4 text-xs font-medium text-neutral-900 placeholder:text-neutral-400 focus:outline-none transition shadow-2xs h-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            <div className="w-full sm:w-44">
              <Select
                value={categoryFilter}
                onValueChange={(val) => setCategoryFilter(val)}
              >
                <SelectTrigger className="w-full h-10 rounded-full border border-neutral-200 bg-white px-4 text-xs font-semibold text-neutral-800 hover:bg-neutral-50 transition cursor-pointer shadow-2xs">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border border-neutral-200 bg-white p-1 max-h-56 z-50">
                  <SelectItem
                    value="all"
                    className="rounded-lg px-3 py-2 text-xs font-semibold cursor-pointer"
                  >
                    All Categories
                  </SelectItem>
                  {categories.map((cat) => (
                    <SelectItem
                      key={cat.id}
                      value={cat.id}
                      className="rounded-lg px-3 py-2 text-xs font-semibold cursor-pointer"
                    >
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Products Table */}
        {visibleRecipes.length === 0 ? (
          <div className="bg-white border border-neutral-200 rounded-3xl py-20 px-6 text-center flex flex-col items-center justify-center shadow-xs">
            <ChefHat className="h-10 w-10 text-neutral-300 mb-3" />
            <h3 className="text-base font-bold text-neutral-900">
              No products found
            </h3>
            <p className="text-neutral-500 text-xs mt-1 font-medium max-w-xs leading-relaxed">
              No registered product profiles match your criteria. Click Add
              Product to begin.
            </p>
          </div>
        ) : (
          <div className="bg-white border border-neutral-200 rounded-3xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-neutral-200 text-[11px] font-bold text-neutral-500 uppercase tracking-wider bg-white">
                    <th className="py-4 px-6 font-bold">Product Name</th>
                    <th className="py-4 px-6 font-bold">Category</th>
                    <th className="py-4 px-6 font-bold">Yield / Serving</th>
                    <th className="py-4 px-6 font-bold">Ingredients</th>
                    <th className="py-4 px-6 font-bold">Cost per Serving</th>
                    <th className="py-4 px-6 font-bold">Sales Amount</th>
                    <th className="py-4 px-6 font-bold">Status</th>
                    <th className="py-4 px-6 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 text-xs text-neutral-900 bg-white">
                  {visibleRecipes.map((rec) => {
                    const salesAmountNum =
                      rec.salesAmount ?? rec.costPerServing ?? 0;
                    const servingCostNum = rec.costPerServing ?? 0;
                    const isBelowCost =
                      salesAmountNum < servingCostNum && servingCostNum > 0;

                    return (
                      <tr
                        key={rec.id}
                        onClick={() => openEditDrawer(rec)}
                        className="hover:bg-neutral-50/50 transition-colors cursor-pointer"
                      >
                        <td className="py-4 px-6">
                          <div>
                            <p className="font-bold text-neutral-900 text-xs hover:underline">
                              {rec.recipeName}
                            </p>
                            {rec.recipeCode && (
                              <p className="text-[10px] text-neutral-400 font-medium mt-0.5 uppercase tracking-wider">
                                {rec.recipeCode}
                              </p>
                            )}
                          </div>
                        </td>

                        <td className="py-4 px-6 font-semibold text-neutral-600">
                          {rec.categoryName || "Uncategorized"}
                        </td>

                        <td className="py-4 px-6 font-semibold text-neutral-800">
                          {rec.yieldQty} {rec.yieldUnit}
                        </td>

                        <td className="py-4 px-6 font-bold text-neutral-700">
                          {rec.ingredientsCount ?? 0}
                        </td>

                        <td className="py-4 px-6 font-bold text-neutral-900">
                          ${servingCostNum.toFixed(2)}
                        </td>

                        <td className="py-4 px-6 font-bold text-neutral-900">
                          <div>
                            <span>${salesAmountNum.toFixed(2)}</span>
                            {isBelowCost && (
                              <div className="flex items-center gap-1 text-[10px] text-amber-600 font-bold mt-0.5">
                                <AlertTriangle className="h-3 w-3 shrink-0 text-amber-500" />
                                <span>Below cost</span>
                              </div>
                            )}
                          </div>
                        </td>

                        <td className="py-4 px-6">
                          <span
                            className={cn(
                              "px-2.5 py-1.5 rounded-md font-bold text-[10px] uppercase tracking-wider inline-flex items-center gap-1.5 border",
                              rec.status === "active"
                                ? "bg-emerald-50 text-emerald-800 border-emerald-200/70"
                                : "bg-neutral-100 text-neutral-600 border-neutral-200",
                            )}
                          >
                            <span
                              className={cn(
                                "h-1.5 w-1.5 rounded-full",
                                rec.status === "active"
                                  ? "bg-emerald-600"
                                  : "bg-neutral-400",
                              )}
                            />
                            {rec.status === "active" ? "Active" : "Inactive"}
                          </span>
                        </td>

                        <td className="py-4 px-6 text-right relative">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openEditDrawer(rec);
                              }}
                              className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-400 hover:text-neutral-800 transition-colors cursor-pointer"
                              title="Edit Product"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(rec.id);
                              }}
                              className="p-1.5 rounded-lg hover:bg-rose-50 text-neutral-400 hover:text-rose-600 transition-colors cursor-pointer"
                              title="Delete Product"
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

            {/* Infinite Scroll Loader Sentinel */}
            {visibleCount < filteredRecipes.length && (
              <div
                ref={loadMoreRef}
                className="py-4 border-t border-neutral-100 flex items-center justify-center text-xs font-semibold text-neutral-400 gap-2 bg-neutral-50/30"
              >
                <Loader2 className="h-4 w-4 animate-spin text-neutral-600" />
                <span>Loading more products...</span>
              </div>
            )}
          </div>
        )}
      </div>

      {showDrawer && (
        <>
          <div
            className="fixed inset-0 bg-black/30 z-40 transition-opacity"
            onClick={() => setShowDrawer(false)}
          />
          <div className="fixed top-0 right-0 h-full w-[520px] sm:w-[560px] max-w-[95vw] bg-white border-l border-neutral-200 shadow-2xl flex flex-col justify-between z-50 animate-slide-in">
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              <div className="flex justify-between items-start border-b border-neutral-100 pb-4">
                <div>
                  <h3 className="text-base font-bold text-neutral-900">
                    {editId ? "Edit Product" : "Add Product"}
                  </h3>
                  <p className="text-neutral-500 text-xs font-medium mt-0.5">
                    {editId
                      ? "Edit the details for this product."
                      : "Enter the details for the new product."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDrawer(false)}
                  className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700 cursor-pointer transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-5">
                <div className="space-y-4">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 border-b border-neutral-100 pb-1">
                    Basic Information
                  </h4>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-neutral-700 uppercase tracking-wider block">
                        Product Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={50}
                        placeholder="Enter product name"
                        className="w-full bg-white border border-neutral-200 focus:border-neutral-900 focus:ring-4 focus:ring-neutral-900/5 rounded-xl py-2 px-3 text-xs font-semibold text-neutral-900 placeholder:text-neutral-400 focus:outline-none transition"
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-neutral-700 uppercase tracking-wider block">
                        Product Code
                      </label>
                      <input
                        type="text"
                        maxLength={20}
                        placeholder="e.g. PRD-0001 or RC-0001"
                        className="w-full bg-white border border-neutral-200 focus:border-neutral-900 focus:ring-4 focus:ring-neutral-900/5 rounded-xl py-2 px-3 text-xs font-semibold text-neutral-900 placeholder:text-neutral-400 focus:outline-none transition"
                        value={formCode}
                        onChange={(e) => setFormCode(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-neutral-700 uppercase tracking-wider block">
                      Category <span className="text-rose-500">*</span>
                    </label>
                    <Select
                      value={formCategoryId}
                      onValueChange={(val) => setFormCategoryId(val)}
                    >
                      <SelectTrigger className="w-full h-10 rounded-xl border border-neutral-200 bg-white px-3 text-xs font-semibold text-neutral-900 focus:outline-none focus:ring-4 focus:ring-neutral-900/5 focus:border-neutral-900 transition cursor-pointer shadow-2xs">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border border-neutral-200 bg-white p-1 max-h-56 z-60">
                        {categories.map((cat) => (
                          <SelectItem
                            key={cat.id}
                            value={cat.id}
                            className="rounded-lg px-3 py-2 text-xs font-semibold cursor-pointer"
                          >
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-neutral-700 uppercase tracking-wider block">
                      Yield / Serving <span className="text-rose-500">*</span>
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        required
                        min={1}
                        step={1}
                        placeholder="1"
                        className="w-24 bg-white border border-neutral-200 focus:border-neutral-900 focus:ring-4 focus:ring-neutral-900/5 rounded-xl py-2 px-3 text-xs font-semibold text-neutral-900 placeholder:text-neutral-400 focus:outline-none transition"
                        value={formYieldQty}
                        onChange={(e) =>
                          setFormYieldQty(parseInt(e.target.value) || 1)
                        }
                      />
                      <input
                        type="text"
                        required
                        maxLength={20}
                        placeholder="Unit (e.g. Serving, Portion)"
                        className="flex-1 bg-white border border-neutral-200 focus:border-neutral-900 focus:ring-4 focus:ring-neutral-900/5 rounded-xl py-2 px-3 text-xs font-semibold text-neutral-900 placeholder:text-neutral-400 focus:outline-none transition"
                        value={formYieldUnit}
                        onChange={(e) => setFormYieldUnit(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="w-1/2 space-y-1.5">
                      <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">
                        Calculated Serving Cost
                      </label>
                      <div className="bg-neutral-100 border border-neutral-200 rounded-xl py-2 px-3 text-xs text-neutral-700 font-bold flex items-center h-10 cursor-not-allowed">
                        ${currentServingCost.toFixed(2)}
                      </div>
                    </div>
                    <div className="w-1/2 space-y-1.5">
                      <label className="text-[10px] font-bold text-neutral-700 uppercase tracking-wider block">
                        Sales Amount <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400 text-xs font-semibold">
                          $
                        </span>
                        <input
                          type="number"
                          step="any"
                          min={0}
                          required
                          placeholder="0.00"
                          className={cn(
                            "w-full bg-white border rounded-xl py-2 pl-8 pr-3 text-xs font-semibold text-neutral-900 placeholder:text-neutral-400 focus:outline-none transition h-10",
                            formSalesAmount.trim() !== "" &&
                              parseFloat(formSalesAmount) < currentServingCost &&
                              currentServingCost > 0
                              ? "border-amber-400 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10"
                              : "border-neutral-200 focus:border-neutral-900 focus:ring-4 focus:ring-neutral-900/5",
                          )}
                          value={formSalesAmount}
                          onChange={(e) => {
                            setFormSalesAmount(e.target.value);
                            setIsSalesAmountManuallySet(true);
                          }}
                        />
                      </div>
                      {formSalesAmount.trim() !== "" &&
                        parseFloat(formSalesAmount) < currentServingCost &&
                        currentServingCost > 0 && (
                          <div className="flex items-start gap-1 text-[11px] text-amber-600 font-semibold mt-1 animate-fade-in">
                            <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-500 mt-0.5" />
                            <span>
                              Warning: Sales amount (${parseFloat(formSalesAmount).toFixed(2)}) is less than calculated serving cost (${currentServingCost.toFixed(2)}).
                            </span>
                          </div>
                        )}
                    </div>
                  </div>

                  <div className="space-y-3 pt-2">
                    <div className="border-b border-neutral-100 pb-1 flex justify-between items-center">
                      <h4 className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                        Product Ingredients
                      </h4>
                    </div>

                    {formIngredients.length === 0 ? (
                      <div className="border border-dashed border-neutral-200 rounded-2xl p-6 text-center flex flex-col items-center justify-center">
                        <ChefHat className="h-8 w-8 text-neutral-300 mb-2" />
                        <p className="text-neutral-700 text-xs font-bold">
                          No ingredients added yet
                        </p>
                        <p className="text-neutral-400 text-[10px] font-medium mt-0.5">
                          Click below to add ingredients to this product.
                        </p>
                        <button
                          type="button"
                          onClick={handleAddIngredientRow}
                          className="mt-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-lg px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <PlusCircle className="h-3.5 w-3.5 text-[#0A2924]" />
                          <span>Add Ingredient</span>
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {formIngredients.map((ing, idx) => {
                          const item = stockItems.find(
                            (s) => s.id === ing.itemId,
                          );
                          const rowCost =
                            ing.qtyUsed * (item?.costPerBaseUnit || 0);
                          return (
                            <div
                              key={idx}
                              className="bg-neutral-50 border border-neutral-200 rounded-xl p-3.5 space-y-3"
                            >
                              <div className="flex justify-between items-center">
                                <span className="text-[10px] font-bold text-[#0A2924] uppercase tracking-wider">
                                  Ingredient #{idx + 1}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveIngredientRow(idx)}
                                  className="text-neutral-400 hover:text-rose-600 transition-colors p-1 rounded hover:bg-neutral-200 shrink-0 cursor-pointer"
                                  title="Remove Ingredient"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>

                              <div className="space-y-2">
                                <Select
                                  value={ing.itemId}
                                  onValueChange={(val) =>
                                    handleIngredientChange(
                                      idx,
                                      "itemId",
                                      val,
                                    )
                                  }
                                >
                                  <SelectTrigger className="w-full h-9 rounded-xl border border-neutral-200 bg-white px-3 text-xs font-semibold text-neutral-900 focus:outline-none focus:ring-4 focus:ring-neutral-900/5 focus:border-neutral-900 transition cursor-pointer shadow-2xs">
                                    <SelectValue placeholder="Select ingredient..." />
                                  </SelectTrigger>
                                  <SelectContent className="rounded-xl border border-neutral-200 bg-white p-1 max-h-56 z-60">
                                    {stockItems.map((s) => (
                                      <SelectItem
                                        key={s.id}
                                        value={s.id}
                                        className="rounded-lg px-3 py-2 text-xs font-semibold cursor-pointer"
                                      >
                                        {s.name} ({s.baseUnit})
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>

                                <div className="flex items-center gap-2">
                                  <div className="flex items-center border border-neutral-200 bg-white rounded-xl py-1.5 px-3 focus-within:border-neutral-900 focus-within:ring-4 focus-within:ring-neutral-900/5 flex-1 h-9">
                                    <input
                                      type="number"
                                      step="any"
                                      min={0.0001}
                                      required
                                      placeholder="Quantity"
                                      className="w-full bg-transparent border-none text-xs text-neutral-900 focus:outline-none font-bold"
                                      value={ing.qtyUsed}
                                      onChange={(e) =>
                                        handleIngredientChange(
                                          idx,
                                          "qtyUsed",
                                          parseFloat(e.target.value) || 0,
                                        )
                                      }
                                    />
                                    <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wide pl-2 shrink-0">
                                      {item?.baseUnit || "pcs"}
                                    </span>
                                  </div>

                                  <div className="bg-neutral-100 border border-neutral-200 rounded-xl py-1.5 px-3 text-xs font-bold text-neutral-700 min-w-[90px] text-right shrink-0 h-9 flex items-center justify-end">
                                    ${rowCost.toFixed(2)}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}

                        <button
                          type="button"
                          onClick={handleAddIngredientRow}
                          className="w-full bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-xl py-2 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                        >
                          <PlusCircle className="h-4 w-4 text-[#0A2924]" />
                          <span>Add Another Ingredient</span>
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-neutral-700 uppercase tracking-wider block">
                      Description (Optional)
                    </label>
                    <textarea
                      placeholder="Enter description"
                      rows={2}
                      maxLength={200}
                      className="w-full bg-white border border-neutral-200 focus:border-neutral-900 focus:ring-4 focus:ring-neutral-900/5 rounded-xl py-2 px-3 text-xs font-medium text-neutral-900 placeholder:text-neutral-400 focus:outline-none transition resize-none"
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-neutral-700 uppercase tracking-wider block">
                      Status <span className="text-rose-500">*</span>
                    </label>
                    <Select
                      value={formStatus}
                      onValueChange={(val) =>
                        setFormStatus(val as "active" | "inactive")
                      }
                    >
                      <SelectTrigger className="w-full h-10 rounded-xl border border-neutral-200 bg-white px-3 text-xs font-semibold text-neutral-900 focus:outline-none focus:ring-4 focus:ring-neutral-900/5 focus:border-neutral-900 transition cursor-pointer shadow-2xs">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border border-neutral-200 bg-white p-1 max-h-56 z-60">
                        <SelectItem
                          value="active"
                          className="rounded-lg px-3 py-2 text-xs font-semibold cursor-pointer"
                        >
                          Active
                        </SelectItem>
                        <SelectItem
                          value="inactive"
                          className="rounded-lg px-3 py-2 text-xs font-semibold cursor-pointer"
                        >
                          Inactive
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </form>
            </div>

            <div className="border-t border-neutral-200 p-6 bg-white flex items-center justify-between gap-3 shrink-0">
              <div className="text-left shrink-0">
                <span className="text-[9px] text-neutral-400 font-bold uppercase tracking-wider block">
                  Serving Cost
                </span>
                <span className="text-sm font-bold text-neutral-900 block">
                  ${currentServingCost.toFixed(2)}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowDrawer(false)}
                  className="bg-white border border-neutral-200 hover:bg-neutral-50 text-neutral-700 rounded-full px-5 py-2.5 text-xs font-semibold transition cursor-pointer shadow-2xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center gap-2 bg-[#0A2924] hover:bg-[#0A2924]/90 disabled:opacity-40 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-full text-xs font-semibold transition cursor-pointer shadow-sm"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Product</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      <AlertDialog
        open={deleteTarget !== null}
        title="Delete Product"
        description="Are you sure you want to delete this product? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
