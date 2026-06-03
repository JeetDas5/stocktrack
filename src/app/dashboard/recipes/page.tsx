"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useBusinessStore } from "@/store/business-store";
import { useRecipeStore } from "@/store/recipe-store";
import { useCategoryStore } from "@/store/category-store";
import { useAuth } from "@/providers/auth-provider";
import { getStockItems } from "@/lib/repositories/stock-item.repository";
import { getUserBusinesses } from "@/lib/repositories/business.repository";
import { Recipe, StockItem } from "@/types/inventory";
import { Business } from "@/types/business";
import {
  ChefHat,
  Plus,
  Search,
  ChevronDown,
  X,
  Loader2,
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  AlertCircle,
  PlusCircle,
} from "lucide-react";

export default function RecipesPage() {
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

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

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
    setError(null);
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
    setError(null);
    setShowDrawer(true);
    setActiveMenuId(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBusinessId || !formName.trim() || formYieldQty <= 0) {
      setError("Please fill in all required fields correctly.");
      return;
    }

    const invalidIngredient = formIngredients.some(
      (ing) => !ing.itemId || ing.qtyUsed <= 0,
    );
    if (invalidIngredient) {
      setError(
        "Please ensure all ingredients have an selected item and positive quantity.",
      );
      return;
    }

    try {
      setSaving(true);
      setError(null);

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
        recipeName: formName.trim(),
        recipeCode: formCode.trim() || undefined,
        categoryId: formCategoryId || undefined,
        yieldQty: formYieldQty,
        yieldUnit: formYieldUnit,
        description: formDescription.trim() || undefined,
        status: formStatus,
        ingredients: ingredientsData,
      };

      if (editId) {
        await updateRecipe(activeBusinessId, editId, recipeData);
      } else {
        await addRecipe(activeBusinessId, recipeData);
      }

      setShowDrawer(false);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to save recipe. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (recId: string) => {
    if (!activeBusinessId) return;
    if (!confirm("Are you sure you want to delete this recipe?")) return;

    try {
      await deleteRecipe(activeBusinessId, recId);
      setActiveMenuId(null);
    } catch (err) {
      console.error(err);
      alert("Failed to delete recipe.");
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
    value: any,
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

  const totalPages = Math.max(
    1,
    Math.ceil(filteredRecipes.length / itemsPerPage),
  );
  const paginatedRecipes = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredRecipes.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredRecipes, currentPage]);

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

  if (recipesLoading || loadingContext) {
    return (
      <div className="h-[75vh] flex flex-col items-center justify-center bg-white text-[#0F172A]">
        <Loader2 className="h-7 w-7 text-[#16A34A] animate-spin mb-3" />
        <span className="text-[#64748B] text-xs font-bold uppercase tracking-wider">
          Loading recipes book...
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
              Recipes
            </h1>
            <p className="text-[#64748B] text-xs font-bold mt-1.5">
              Create and manage recipes to track ingredients and portion costs.
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={() => alert("Import function coming soon!")}
              className="flex-1 sm:flex-initial bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-700 rounded-xl px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
            >
              Import Recipes
            </button>
            <button
              onClick={openAddDrawer}
              className="flex-1 sm:flex-initial bg-[#16A34A] hover:bg-[#15803D] text-white rounded-xl px-5 py-2.5 text-xs font-bold uppercase tracking-wider shadow-sm flex items-center justify-center gap-2 cursor-pointer transition-all duration-200"
            >
              <Plus className="h-4 w-4 stroke-[3px]" />
              Add Recipe
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
                placeholder="Search recipes..."
                className="w-full bg-white border border-zinc-200 focus:border-[#16A34A] rounded-xl py-2.5 pl-10 pr-4 text-xs text-zinc-950 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-[#16A34A] transition-all shadow-xs"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="relative min-w-[140px]">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full bg-white border border-zinc-200 rounded-xl py-2.5 pl-3.5 pr-8 text-xs font-bold text-zinc-700 shadow-xs appearance-none focus:outline-none focus:ring-1 focus:ring-[#16A34A] focus:border-[#16A34A] cursor-pointer"
              >
                <option value="all">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
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

        {(storeError || error) && (
          <div className="bg-rose-50 border border-rose-200 text-rose-600 text-xs rounded-xl p-3 flex items-center gap-2 justify-center font-bold">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {storeError || error}
          </div>
        )}

        {filteredRecipes.length === 0 ? (
          <div className="bg-white border border-zinc-200 rounded-2xl py-20 px-6 text-center flex flex-col items-center justify-center shadow-sm animate-fade-in">
            <ChefHat className="h-12 w-12 text-zinc-300 mb-3" />
            <h3 className="text-base font-bold text-[#0F172A]">
              No recipes found
            </h3>
            <p className="text-[#64748B] text-xs mt-1 font-semibold max-w-xs leading-relaxed">
              No registered recipe book profiles match your criteria. Click +
              Add Recipe to begin.
            </p>
          </div>
        ) : (
          <div className="bg-white border border-zinc-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-200 text-[10px] uppercase font-extrabold tracking-wider text-[#64748B] bg-zinc-50/50">
                    <th className="py-4 px-6 font-extrabold">Recipe Name</th>
                    <th className="py-4 px-6 font-extrabold">Category</th>
                    <th className="py-4 px-6 font-extrabold">
                      Yield / Serving
                    </th>
                    <th className="py-4 px-6 font-extrabold">Ingredients</th>
                    <th className="py-4 px-6 font-extrabold">
                      Cost per Serving
                    </th>
                    <th className="py-4 px-6 font-extrabold">Status</th>
                    <th className="py-4 px-6 font-extrabold text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 text-xs text-[#0F172A]">
                  {paginatedRecipes.map((rec) => (
                    <tr
                      key={rec.id}
                      className="hover:bg-zinc-50/40 transition-colors"
                    >
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3.5">
                          <div className="h-9 w-9 rounded-xl bg-emerald-50 text-[#16A34A] flex items-center justify-center shrink-0 border border-emerald-100/50 shadow-xs">
                            <ChefHat className="h-4 w-4" />
                          </div>
                          <div>
                            <span
                              className="font-extrabold text-[#0F172A] hover:text-[#16A34A] transition-colors cursor-pointer block"
                              onClick={() => openEditDrawer(rec)}
                            >
                              {rec.recipeName}
                            </span>
                            {rec.recipeCode && (
                              <span className="text-[10px] text-zinc-400 font-bold block mt-0.5 uppercase tracking-wider">
                                {rec.recipeCode}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-6 font-bold text-[#64748B]">
                        {rec.categoryName || "Uncategorized"}
                      </td>

                      <td className="py-4 px-6 font-bold text-zinc-700">
                        {rec.yieldQty} {rec.yieldUnit}
                      </td>

                      <td className="py-4 px-6 font-extrabold text-zinc-600">
                        {rec.ingredientsCount ?? 0}
                      </td>

                      <td className="py-4 px-6 font-extrabold text-zinc-950">
                        ${(rec.costPerServing ?? 0).toFixed(2)}
                      </td>

                      <td className="py-4 px-6">
                        <div className="inline-flex items-center gap-1.5">
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              rec.status === "active"
                                ? "bg-[#16A34A]"
                                : "bg-[#64748B]"
                            }`}
                          />
                          <span
                            className={`text-[10px] font-extrabold ${
                              rec.status === "active"
                                ? "text-[#16A34A]"
                                : "text-[#64748B]"
                            }`}
                          >
                            {rec.status === "active" ? "Active" : "Inactive"}
                          </span>
                        </div>
                      </td>

                      <td className="py-4 px-6 text-right relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuId(
                              activeMenuId === rec.id ? null : rec.id,
                            );
                          }}
                          className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-[#0F172A] transition-colors cursor-pointer"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>

                        {activeMenuId === rec.id && (
                          <div
                            ref={menuRef}
                            className="absolute right-6 top-10 w-32 bg-white border border-zinc-200 rounded-xl shadow-lg py-1.5 z-10 text-left animate-fade-in"
                          >
                            <button
                              onClick={() => openEditDrawer(rec)}
                              className="w-full px-4 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-50 hover:text-[#16A34A] transition-colors flex items-center gap-2 cursor-pointer"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                              Edit Details
                            </button>
                            <button
                              onClick={() => handleDelete(rec.id)}
                              className="w-full px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors flex items-center gap-2 cursor-pointer border-t border-zinc-100"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Delete
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="bg-zinc-50/50 border-t border-zinc-200 py-4 px-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-[#64748B] font-semibold">
              <span>
                Showing{" "}
                {Math.min(
                  filteredRecipes.length,
                  (currentPage - 1) * itemsPerPage + 1,
                )}{" "}
                to{" "}
                {Math.min(filteredRecipes.length, currentPage * itemsPerPage)}{" "}
                of {filteredRecipes.length} recipes
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
          <div className="fixed top-0 right-0 h-full w-[460px] bg-white border-l border-zinc-200 shadow-2xl flex flex-col justify-between z-100 animate-slide-in">
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-extrabold text-[#0F172A]">
                    {editId ? "Edit Recipe" : "Add Recipe"}
                  </h3>
                  <p className="text-[#64748B] text-xs font-semibold mt-1">
                    {editId
                      ? "Edit the details for this recipe."
                      : "Enter the details for the new recipe."}
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
                      Recipe Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Enter recipe name"
                      className="w-full bg-white border border-zinc-300 focus:border-[#16A34A] rounded-xl py-2.5 px-3.5 text-xs text-zinc-950 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-[#16A34A] transition-all font-semibold"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#0F172A] block">
                      Recipe Code
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. RC-0001"
                      className="w-full bg-white border border-zinc-300 focus:border-[#16A34A] rounded-xl py-2.5 px-3.5 text-xs text-zinc-950 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-[#16A34A] transition-all font-semibold"
                      value={formCode}
                      onChange={(e) => setFormCode(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#0F172A] block">
                      Category <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <select
                        required
                        className="w-full bg-white border border-zinc-300 focus:border-[#16A34A] rounded-xl py-2.5 px-3.5 text-xs text-[#0F172A] font-bold focus:outline-none focus:ring-1 focus:ring-[#16A34A] appearance-none cursor-pointer"
                        value={formCategoryId}
                        onChange={(e) => setFormCategoryId(e.target.value)}
                      >
                        <option value="">Select category</option>
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#0F172A] block">
                      Yield / Serving <span className="text-rose-500">*</span>
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        required
                        min={1}
                        step={1}
                        placeholder="1"
                        className="w-24 bg-white border border-zinc-300 focus:border-[#16A34A] rounded-xl py-2.5 px-3.5 text-xs text-zinc-950 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-[#16A34A] transition-all font-semibold"
                        value={formYieldQty}
                        onChange={(e) =>
                          setFormYieldQty(parseInt(e.target.value) || 1)
                        }
                      />
                      <input
                        type="text"
                        required
                        placeholder="Unit (e.g. Serving, Portion)"
                        className="flex-1 bg-white border border-zinc-300 focus:border-[#16A34A] rounded-xl py-2.5 px-3.5 text-xs text-zinc-950 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-[#16A34A] transition-all font-semibold"
                        value={formYieldUnit}
                        onChange={(e) => setFormYieldUnit(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="border-b border-zinc-100 pb-1 flex justify-between items-center">
                      <span className="text-[10px] font-extrabold tracking-widest text-[#64748B] uppercase">
                        Recipe Ingredients
                      </span>
                    </div>

                    {formIngredients.length === 0 ? (
                      <div className="border border-dashed border-zinc-200 rounded-xl p-6 text-center flex flex-col items-center justify-center">
                        <ChefHat className="h-8 w-8 text-zinc-300 mb-2" />
                        <p className="text-zinc-500 text-[11px] font-bold">
                          No ingredients added yet
                        </p>
                        <p className="text-zinc-400 text-[10px] font-semibold mt-0.5">
                          Click below to add ingredients to this recipe.
                        </p>
                        <button
                          type="button"
                          onClick={handleAddIngredientRow}
                          className="mt-3 bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-700 rounded-lg px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                        >
                          <PlusCircle className="h-3.5 w-3.5 text-[#16A34A]" />
                          Add Ingredient
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
                              className="bg-zinc-50/50 border border-zinc-150 rounded-xl p-3.5 space-y-3"
                            >
                              <div className="flex justify-between items-center">
                                <span className="text-[10px] font-extrabold text-[#16A34A] uppercase tracking-wider">
                                  Ingredient #{idx + 1}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveIngredientRow(idx)}
                                  className="text-zinc-400 hover:text-rose-600 transition-colors p-1 rounded hover:bg-zinc-100 shrink-0 cursor-pointer"
                                  title="Remove Ingredient"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>

                              <div className="space-y-2">
                                <div className="relative">
                                  <select
                                    value={ing.itemId}
                                    onChange={(e) =>
                                      handleIngredientChange(
                                        idx,
                                        "itemId",
                                        e.target.value,
                                      )
                                    }
                                    className="w-full bg-white border border-zinc-300 focus:border-[#16A34A] rounded-xl py-2 px-3 text-[11px] text-[#0F172A] font-bold focus:outline-none focus:ring-1 focus:ring-[#16A34A] appearance-none cursor-pointer"
                                  >
                                    <option value="">
                                      Select ingredient...
                                    </option>
                                    {stockItems.map((s) => (
                                      <option key={s.id} value={s.id}>
                                        {s.name} ({s.baseUnit})
                                      </option>
                                    ))}
                                  </select>
                                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400 pointer-events-none" />
                                </div>

                                <div className="flex items-center gap-2">
                                  <div className="flex items-center border border-zinc-300 bg-white rounded-xl py-2 px-3 focus-within:border-[#16A34A] focus-within:ring-1 focus-within:ring-[#16A34A] flex-1">
                                    <input
                                      type="number"
                                      step="any"
                                      min={0.0001}
                                      required
                                      placeholder="Quantity"
                                      className="w-full bg-transparent border-none text-[11px] text-zinc-950 focus:outline-none font-bold"
                                      value={ing.qtyUsed}
                                      onChange={(e) =>
                                        handleIngredientChange(
                                          idx,
                                          "qtyUsed",
                                          parseFloat(e.target.value) || 0,
                                        )
                                      }
                                    />
                                    <span className="text-[10px] text-zinc-400 font-extrabold uppercase tracking-wide pl-2 shrink-0">
                                      {item?.baseUnit || "pcs"}
                                    </span>
                                  </div>

                                  <div className="bg-zinc-100 border border-zinc-200 rounded-xl py-2 px-3 text-[11px] font-bold text-zinc-600 min-w-[100px] text-right shrink-0">
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
                          className="w-full bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-700 rounded-xl py-2 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-xs"
                        >
                          <PlusCircle className="h-4 w-4 text-[#16A34A]" />
                          Add Another Ingredient
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#0F172A] block">
                      Description (Optional)
                    </label>
                    <textarea
                      placeholder="Enter description"
                      rows={3}
                      className="w-full bg-white border border-zinc-300 focus:border-[#16A34A] rounded-xl py-2.5 px-3.5 text-xs text-zinc-950 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-[#16A34A] transition-all font-semibold resize-none"
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                    />
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
                  </div>
                </div>
              </form>
            </div>

            <div className="border-t border-zinc-200 p-6 bg-zinc-50 flex items-center justify-between gap-3 rounded-b-2xl">
              <div className="text-left shrink-0">
                <span className="text-[10px] text-zinc-400 font-extrabold uppercase tracking-wide block">
                  Serving Cost
                </span>
                <span className="text-sm font-extrabold text-zinc-950 block">
                  ${currentServingCost.toFixed(2)}
                </span>
              </div>

              <div className="flex items-center gap-3">
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
                    "Save Recipe"
                  )}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
