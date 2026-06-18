"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import AlertDialog from "@/components/ui/alert-dialog";
import { useBusinessStore } from "@/stores/business-store";
import { useLocationStore } from "@/stores/location-store";
import { useSaleStore } from "@/stores/sale-store";
import { getLocations } from "@/lib/repositories/location.repository";
import { getRecipes } from "@/lib/repositories/recipe.repository";
import { getUserBusinesses } from "@/lib/repositories/business.repository";
import { Location, Recipe } from "@/types/inventory";
import { Business } from "@/types/business";
import {
  ShoppingCart,
  DollarSign,
  FileText,
  Trash2,
  Plus,
  CheckCircle2,
  Loader2,
  Calendar,
  User,
  ArrowRight,
  TrendingUp,
  X,
  Search,
  Receipt,
  Eye,
} from "lucide-react";

export default function SalesEntryPage() {
  const { activeBusinessId } = useBusinessStore();
  const { activeLocationId } = useLocationStore();
  const {
    sales,
    loading: salesLoading,
    fetchSales,
    addSale,
    updateSaleStatus,
  } = useSaleStore();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [locations, setLocations] = useState<Location[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);

  const [saleDate, setSaleDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [selectedLocationId, setSelectedLocationId] = useState("");
  const [customerName, setCustomerName] = useState("Walk-in Customer");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [reference, setReference] = useState("");
  const [remarks, setRemarks] = useState("");
  const [taxRate, setTaxRate] = useState(10);
  const [showAllSales, setShowAllSales] = useState(false);
  const [viewingSale, setViewingSale] = useState<any | null>(null);
  const [salesSearch, setSalesSearch] = useState("");
  const [salesStatusFilter, setSalesStatusFilter] = useState<
    "all" | "completed" | "draft"
  >("all");

  const [items, setItems] = useState<
    {
      recipeId: string;
      name: string;
      recipeCode: string;
      unit: string;
      quantity: number;
      unitPrice: number;
      discountPercentage: number;
    }[]
  >([]);
  const [saleToComplete, setSaleToComplete] = useState<any | null>(null);

  async function loadInitialData() {
    if (!activeBusinessId) return;
    try {
      setLoading(true);
      const [locList, recipeList, busList] = await Promise.all([
        getLocations(activeBusinessId),
        getRecipes(activeBusinessId),
        getUserBusinesses([]),
      ]);

      const activeLocs = locList.filter((l) => l.isActive !== false);
      setLocations(activeLocs);
      setRecipes(recipeList.filter((r: Recipe) => r.isActive !== false));
      setBusinesses(busList);

      if (
        activeLocationId &&
        activeLocs.some((l) => l.id === activeLocationId)
      ) {
        setSelectedLocationId(activeLocationId);
      } else if (activeLocs.length > 0) {
        setSelectedLocationId(activeLocs[0].id);
      }

      await fetchSales(activeBusinessId);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadInitialData();
  }, [activeBusinessId]);

  useEffect(() => {
    if (activeLocationId && locations.some((l) => l.id === activeLocationId)) {
      setSelectedLocationId(activeLocationId);
    }
  }, [activeLocationId, locations]);

  const handleAddItemRow = () => {
    setItems((prev) => [
      ...prev,
      {
        recipeId: "",
        name: "",
        recipeCode: "",
        unit: "serving",
        quantity: 1,
        unitPrice: 0.0,
        discountPercentage: 0,
      },
    ]);
  };

  const handleItemSelect = (index: number, recipeId: string) => {
    const selectedRecipe = recipes.find((r) => r.id === recipeId);
    if (!selectedRecipe) return;

    setItems((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        recipeId: selectedRecipe.id,
        name: selectedRecipe.recipeName,
        recipeCode: selectedRecipe.recipeCode || "",
        unit: selectedRecipe.yieldUnit || "serving",
        unitPrice:
          selectedRecipe.salesAmount || selectedRecipe.costPerServing || 0.0,
      };
      return updated;
    });
  };

  const handleFieldChange = (
    index: number,
    field: "quantity" | "discountPercentage" | "unitPrice",
    val: number,
  ) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [field]: val,
      };
      return updated;
    });
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSaveSale = async (status: "draft" | "completed") => {
    if (!activeBusinessId) return;
    if (items.length === 0) {
      toast.error("Please add at least one item to save the sale.");
      return;
    }

    const unselectedItem = items.find((i) => !i.recipeId);
    if (unselectedItem) {
      toast.error("Please select a valid Recipe for all rows.");
      return;
    }

    try {
      setSaving(true);
      const itemsPayload = items.map((i) => ({
        recipeId: i.recipeId,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        discountPercentage: i.discountPercentage,
      }));

      await addSale(activeBusinessId, {
        saleDate,
        locationId: selectedLocationId || undefined,
        customerName,
        paymentMethod,
        reference: reference.trim() || undefined,
        remarks: remarks.trim() || undefined,
        status,
        taxRate,
        items: itemsPayload,
      });

      toast.success(`Sale successfully saved as ${status}!`);
      setItems([]);
      setReference("");
      setRemarks("");
      await loadInitialData();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to save the sale.");
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmCompleteSale = async () => {
    if (!activeBusinessId || !saleToComplete) return;
    try {
      await updateSaleStatus(activeBusinessId, saleToComplete.id, "completed");
      toast.success(
        `Sale ${saleToComplete.saleNumber || ""} successfully completed!`,
      );
      if (viewingSale && viewingSale.id === saleToComplete.id) {
        setViewingSale(null);
        setShowAllSales(false);
      }
      await loadInitialData();
    } catch (err) {
      console.error(err);
      toast.error("Failed to complete sale.");
    } finally {
      setSaleToComplete(null);
    }
  };

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const grossTotal = items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0,
  );
  const discountTotal = items.reduce(
    (sum, item) =>
      sum + (item.quantity * item.unitPrice * item.discountPercentage) / 100,
    0,
  );
  const totalAmount = grossTotal - discountTotal;
  const subtotal = Math.round((totalAmount / (1 + taxRate / 100)) * 100) / 100;
  const tax = Math.round((totalAmount - subtotal) * 100) / 100;

  if (loading) {
    return (
      <div className="min-h-[75vh] flex flex-col items-center justify-center bg-white text-[#0F172A]">
        <Loader2 className="h-8 w-8 text-[#16A34A] animate-spin mb-4" />
        <p className="text-[#64748B] text-xs font-bold uppercase tracking-wider">
          Syncing Sales Dashboard...
        </p>
      </div>
    );
  }

  return (
    <div className="relative min-h-[85vh] bg-white text-[#0F172A]">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-2 border-b border-zinc-200">
        <div>
          <h1 className="text-3xl font-extrabold text-[#0F172A] tracking-tight">
            Sales Entry
          </h1>
          <p className="text-[#64748B] text-xs font-bold mt-1.5">
            Create a new sale and update inventory in real-time.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => handleSaveSale("draft")}
            disabled={saving}
            className="border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 rounded-xl px-5 py-2.5 text-xs font-extrabold transition-all cursor-pointer shadow-xs flex items-center gap-2 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <FileText className="h-4 w-4 text-zinc-400" />
            )}
            Save as Draft
          </button>
          <button
            onClick={() => handleSaveSale("completed")}
            disabled={saving}
            className="bg-[#16A34A] hover:bg-[#15803D] text-white rounded-xl px-6 py-2.5 text-xs font-extrabold uppercase tracking-wider shadow-sm flex items-center gap-2 cursor-pointer transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            Complete Sale
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        <div className="bg-white border border-zinc-200/90 rounded-2xl p-4 flex items-center gap-4 shadow-xs">
          <div className="h-10 w-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
            <ShoppingCart className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
              Total Items
            </p>
            <h3 className="text-xl font-extrabold text-[#0F172A] mt-0.5">
              {totalItems}
            </h3>
            <p className="text-[9px] text-[#64748B] font-bold mt-0.5">
              Items Selected
            </p>
          </div>
        </div>

        <div className="bg-white border border-zinc-200/90 rounded-2xl p-4 flex items-center gap-4 shadow-xs">
          <div className="h-10 w-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
            <DollarSign className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
              Subtotal
            </p>
            <h3 className="text-xl font-extrabold text-[#0F172A] mt-0.5">
              ${subtotal.toFixed(2)}
            </h3>
            <p className="text-[9px] text-[#64748B] font-bold mt-0.5">
              Net Subtotal (Total - Tax)
            </p>
          </div>
        </div>

        <div className="bg-white border border-zinc-200/90 rounded-2xl p-4 flex items-center gap-4 shadow-xs">
          <div className="h-10 w-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center shrink-0">
            <FileText className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
              Tax ({taxRate}%)
            </p>
            <h3 className="text-xl font-extrabold text-[#0F172A] mt-0.5">
              ${tax.toFixed(2)}
            </h3>
            <p className="text-[9px] text-[#64748B] font-bold mt-0.5">
              Tax Portion (Tax Included)
            </p>
          </div>
        </div>

        <div className="bg-white border border-zinc-200/90 rounded-2xl p-4 flex items-center gap-4 shadow-xs">
          <div className="h-10 w-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0">
            <TrendingUp className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
              Total Amount
            </p>
            <h3 className="text-xl font-extrabold text-[#16A34A] mt-0.5">
              ${totalAmount.toFixed(2)}
            </h3>
            <p className="text-[9px] text-[#64748B] font-bold mt-0.5">
              Grand Total
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 mt-6">
        <div className="flex-1 min-w-0 space-y-6">
          <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-xs space-y-5">
            <h2 className="text-xs font-extrabold text-[#0F172A] uppercase tracking-wider pb-3 border-b border-zinc-100">
              Sale Details
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider block">
                  Sale Date *
                </label>
                <div className="relative">
                  <input
                    type="date"
                    className="w-full bg-white border border-zinc-200 rounded-xl py-2 px-3 text-xs font-bold text-zinc-700 focus:outline-none focus:border-[#16A34A]"
                    value={saleDate}
                    onChange={(e) => setSaleDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider block">
                  Sale No.
                </label>
                <input
                  type="text"
                  placeholder="SALE-250410-001"
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-2 px-3 text-xs font-semibold text-zinc-400 focus:outline-none"
                  disabled
                />
                <span className="text-[9px] text-zinc-400 font-bold block mt-0.5">
                  Auto-generated
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider block">
                  Customer Name
                </label>
                <input
                  type="text"
                  className="w-full bg-white border border-zinc-200 rounded-xl py-2.5 px-3.5 text-xs font-bold text-zinc-700 focus:outline-none focus:border-[#16A34A]"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider block">
                  Payment Method
                </label>
                <select
                  className="w-full bg-white border border-zinc-200 rounded-xl py-2.5 px-3.5 text-xs font-bold text-zinc-700 focus:outline-none focus:border-[#16A34A] cursor-pointer"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                >
                  <option value="Cash">Cash</option>
                  <option value="Card">Card</option>
                  <option value="UPI">UPI</option>
                  <option value="On Credit">On Credit</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider block">
                  Reference (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Order No., Note"
                  className="w-full bg-white border border-zinc-200 rounded-xl py-2.5 px-3.5 text-xs font-bold text-zinc-700 focus:outline-none focus:border-[#16A34A]"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider block">
                  Tax (%)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  className="w-full bg-white border border-zinc-200 rounded-xl py-2.5 px-3.5 text-xs font-bold text-zinc-700 focus:outline-none focus:border-[#16A34A]"
                  value={taxRate}
                  onChange={(e) =>
                    setTaxRate(Math.max(0, parseFloat(e.target.value) || 0))
                  }
                />
              </div>
            </div>
          </div>

          <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-zinc-100">
              <h2 className="text-xs font-extrabold text-[#0F172A] uppercase tracking-wider">
                Items
              </h2>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleAddItemRow}
                  className="border-2 border-[#16A34A] bg-[#DCFCE7]/20 hover:bg-[#DCFCE7]/40 text-[#16A34A] rounded-xl px-3.5 py-1.5 text-[11px] font-extrabold shadow-2xs transition-all cursor-pointer flex items-center gap-1"
                >
                  <Plus className="h-4 w-4 stroke-[3px]" />
                  Add Item
                </button>
              </div>
            </div>

            <div className="border border-zinc-200 rounded-xl overflow-hidden bg-white">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-zinc-200 text-[10px] uppercase font-extrabold tracking-wider text-[#64748B] bg-zinc-50/50">
                      <th className="py-3 px-4 w-8 text-center">#</th>
                      <th className="py-3 px-3 min-w-[200px]">Recipe</th>
                      <th className="py-3 px-2 text-center w-24">Unit</th>
                      <th className="py-3 px-2 text-center w-24">Quantity</th>
                      <th className="py-3 px-2 text-right w-28">
                        Unit Price (AUD)
                      </th>
                      <th className="py-3 px-2 text-center w-24">
                        Discount (%)
                      </th>
                      <th className="py-3 px-2 text-right w-28">
                        Amount (AUD)
                      </th>
                      <th className="py-3 px-4 text-center w-12">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 font-bold text-zinc-700">
                    {items.length === 0 ? (
                      <tr>
                        <td
                          colSpan={8}
                          className="py-12 text-center text-zinc-400 font-semibold"
                        >
                          No items added yet. Click &quot;Add Item&quot; to
                          begin.
                        </td>
                      </tr>
                    ) : (
                      items.map((item, idx) => {
                        const rowAmount =
                          item.quantity *
                          item.unitPrice *
                          (1 - item.discountPercentage / 100);

                        return (
                          <tr
                            key={`${item.recipeId}-${idx}`}
                            className="hover:bg-zinc-50/30 transition-colors"
                          >
                            <td className="py-3 px-4 text-center text-zinc-400">
                              {idx + 1}
                            </td>
                            <td className="py-2.5 px-3">
                              <select
                                className="w-full bg-white border border-zinc-200 rounded-lg p-1.5 font-semibold text-zinc-700 focus:outline-none focus:border-[#16A34A]"
                                value={item.recipeId}
                                onChange={(e) =>
                                  handleItemSelect(idx, e.target.value)
                                }
                              >
                                <option value="">Select Recipe</option>
                                {recipes.map((rc) => (
                                  <option key={rc.id} value={rc.id}>
                                    {rc.recipeName}{" "}
                                    {rc.recipeCode ? `(${rc.recipeCode})` : ""}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="py-2.5 px-2 text-center">
                              <span className="bg-zinc-100 text-zinc-600 px-2.5 py-1 rounded-md text-[10px] uppercase font-extrabold tracking-wider border border-zinc-200/50">
                                {item.unit}
                              </span>
                            </td>
                            <td className="py-2.5 px-2 text-center">
                              <input
                                type="number"
                                min="1"
                                className="w-16 bg-white border border-zinc-200 rounded-lg p-1.5 text-center font-bold text-zinc-700 focus:outline-none focus:border-[#16A34A]"
                                value={item.quantity === 0 ? "" : item.quantity}
                                onChange={(e) =>
                                  handleFieldChange(
                                    idx,
                                    "quantity",
                                    Math.max(
                                      1,
                                      parseFloat(e.target.value) || 0,
                                    ),
                                  )
                                }
                              />
                            </td>
                            <td className="py-2.5 px-2 text-right text-zinc-600">
                              <input
                                type="number"
                                step="0.01"
                                className="w-20 bg-white border border-zinc-200 rounded-lg p-1.5 text-right font-bold text-zinc-700 focus:outline-none focus:border-[#16A34A]"
                                value={
                                  item.unitPrice === 0 ? "" : item.unitPrice
                                }
                                onChange={(e) =>
                                  handleFieldChange(
                                    idx,
                                    "unitPrice",
                                    Math.max(
                                      0,
                                      parseFloat(e.target.value) || 0,
                                    ),
                                  )
                                }
                              />
                            </td>
                            <td className="py-2.5 px-2 text-center">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                className="w-16 bg-white border border-zinc-200 rounded-lg p-1.5 text-center font-bold text-zinc-700 focus:outline-none focus:border-[#16A34A]"
                                value={item.discountPercentage}
                                onChange={(e) =>
                                  handleFieldChange(
                                    idx,
                                    "discountPercentage",
                                    Math.min(
                                      100,
                                      Math.max(
                                        0,
                                        parseFloat(e.target.value) || 0,
                                      ),
                                    ),
                                  )
                                }
                              />
                            </td>
                            <td className="py-2.5 px-2 text-right text-[#0F172A] font-extrabold">
                              ${rowAmount.toFixed(2)}
                            </td>
                            <td className="py-2.5 px-4 text-center">
                              <button
                                onClick={() => handleRemoveItem(idx)}
                                className="text-zinc-400 hover:text-red-600 p-1 rounded-lg hover:bg-red-50 transition-all cursor-pointer"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-xs space-y-3">
            <label className="text-xs font-extrabold text-[#0F172A] uppercase tracking-wider block pb-2 border-b border-zinc-100">
              Remarks (Optional)
            </label>
            <div className="relative">
              <textarea
                placeholder="Enter any additional notes..."
                maxLength={250}
                rows={3}
                className="w-full bg-white border border-zinc-200 rounded-xl py-3 px-4 text-xs font-semibold text-zinc-800 placeholder-zinc-400 focus:outline-none focus:border-[#16A34A] resize-none"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
              />
              <span className="absolute bottom-3 right-3 text-[10px] font-bold text-zinc-400">
                {remarks.length} / 250
              </span>
            </div>
          </div>
        </div>

        <div className="w-full lg:w-[360px] xl:w-[400px] shrink-0 space-y-6">
          <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-zinc-100">
              <h3 className="text-xs font-extrabold text-[#0F172A] uppercase tracking-wider">
                Customer Info
              </h3>
              <button
                onClick={() => {
                  const newName = prompt("Enter Customer Name:", customerName);
                  if (newName) setCustomerName(newName);
                }}
                className="text-[10px] font-extrabold text-[#16A34A] uppercase tracking-widest hover:underline cursor-pointer"
              >
                Edit
              </button>
            </div>

            <div className="flex items-center gap-3.5 bg-zinc-50 border border-zinc-200 rounded-xl p-3.5 shadow-2xs">
              <div className="h-10 w-10 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
                <User className="h-5 w-5 text-emerald-600" />
              </div>
              <div className="leading-tight">
                <h4 className="text-xs font-extrabold text-[#0F172A]">
                  {customerName}
                </h4>
                <p className="text-[10px] text-zinc-400 font-bold mt-1 uppercase tracking-wider">
                  {customerName === "Walk-in Customer"
                    ? "Walk-in"
                    : "Regular customer"}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-xs space-y-4">
            <h3 className="text-xs font-extrabold text-[#0F172A] uppercase tracking-wider pb-2 border-b border-zinc-100">
              Summary
            </h3>

            <div className="space-y-3.5 text-xs font-bold text-zinc-500">
              <div className="flex justify-between">
                <span>Gross Total</span>
                <span className="text-[#0F172A]">${grossTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Discount</span>
                <span className="text-red-500">
                  -${discountTotal.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Subtotal (Excl. Tax)</span>
                <span className="text-[#0F172A]">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax ({taxRate}%)</span>
                <span className="text-[#0F172A]">${tax.toFixed(2)}</span>
              </div>

              <div className="border-t border-zinc-200/80 pt-3.5 flex justify-between items-baseline">
                <span className="text-sm font-extrabold text-[#0F172A]">
                  Total Amount
                </span>
                <span className="text-2xl font-extrabold text-[#16A34A]">
                  ${totalAmount.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => handleSaveSale("draft")}
              disabled={saving}
              className="flex-1 border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 rounded-xl py-3 text-xs font-extrabold transition-all cursor-pointer shadow-xs flex items-center justify-center gap-2 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <FileText className="h-4 w-4 text-zinc-400" />
              )}
              Draft
            </button>
            <button
              onClick={() => handleSaveSale("completed")}
              disabled={saving}
              className="flex-1 bg-[#16A34A] hover:bg-[#15803D] text-white rounded-xl py-3 text-xs font-extrabold uppercase tracking-wider shadow-sm flex items-center justify-center gap-2 cursor-pointer transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              Complete
            </button>
          </div>

          <div className="bg-[#DCFCE7]/25 border border-[#16A34A]/25 rounded-2xl p-4.5 flex items-start gap-3.5 shadow-2xs">
            <div className="h-9 w-9 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0 mt-0.5">
              <CheckCircle2 className="h-5 w-5 text-[#16A34A]" />
            </div>
            <div className="leading-tight">
              <h4 className="text-xs font-extrabold text-[#16A34A]">
                Stock will be deducted from inventory
              </h4>
              <p className="text-[10px] text-zinc-500 font-bold mt-1.5 leading-normal">
                {totalItems} {totalItems === 1 ? "item" : "items"} will be
                updated across 1 location.
              </p>
            </div>
          </div>

          <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-zinc-100">
              <h3 className="text-xs font-extrabold text-[#0F172A] uppercase tracking-wider">
                Recent Sales
              </h3>
              <button
                onClick={() => setShowAllSales(true)}
                className="text-[10px] font-extrabold text-[#16A34A] uppercase tracking-widest hover:underline cursor-pointer flex items-center gap-0.5"
              >
                View All
                <ArrowRight className="h-3 w-3 stroke-[2.5px]" />
              </button>
            </div>

            <div className="divide-y divide-zinc-100 max-h-[300px] overflow-y-auto pr-1">
              {salesLoading && sales.length === 0 ? (
                <div className="py-8 text-center text-zinc-400 font-semibold text-xs">
                  Loading recent sales...
                </div>
              ) : sales.length === 0 ? (
                <div className="py-8 text-center text-zinc-400 font-semibold text-xs">
                  No completed sales yet.
                </div>
              ) : (
                sales.slice(0, 5).map((sale) => {
                  const saleDateFormatted = new Date(
                    sale.saleDate,
                  ).toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  });

                  return (
                    <div
                      key={sale.id}
                      className="py-3 flex justify-between items-center hover:bg-zinc-50/50 rounded-lg px-1 transition-colors animate-none"
                    >
                      <div className="leading-tight">
                        <p className="text-xs font-extrabold text-[#0F172A]">
                          {sale.saleNumber}
                        </p>
                        <p className="text-[10px] text-zinc-400 font-bold mt-1.5 flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5 text-zinc-300" />
                          {saleDateFormatted}
                        </p>
                      </div>
                      <div className="text-right leading-tight">
                        <p className="text-xs font-extrabold text-zinc-800">
                          ${sale.totalAmount.toFixed(2)}
                        </p>
                        <p
                          className={`text-[9px] font-bold mt-1 uppercase tracking-wider inline-flex items-center gap-1 ${
                            sale.status === "completed"
                              ? "text-[#16A34A]"
                              : "text-amber-600"
                          }`}
                        >
                          <span className="h-1 w-1 rounded-full bg-current" />
                          {sale.status}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {showAllSales &&
        (() => {
          const filtered = sales.filter((s) => {
            const matchesStatus =
              salesStatusFilter === "all" || s.status === salesStatusFilter;
            const q = salesSearch.toLowerCase();
            const matchesSearch =
              !q ||
              (s.saleNumber || "").toLowerCase().includes(q) ||
              (s.customerName || "").toLowerCase().includes(q) ||
              (s.locationName || "").toLowerCase().includes(q);
            return matchesStatus && matchesSearch;
          });

          return (
            <div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              onClick={(e) => {
                if (e.target === e.currentTarget) setShowAllSales(false);
              }}
            >
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden border border-zinc-200">
                <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                      <Receipt className="h-4.5 w-4.5 text-emerald-600" />
                    </div>
                    <div>
                      <h2 className="text-sm font-extrabold text-[#0F172A]">
                        All Sales
                      </h2>
                      <p className="text-[10px] text-zinc-400 font-bold mt-0.5">
                        {sales.length} total record
                        {sales.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowAllSales(false)}
                    className="h-8 w-8 rounded-lg hover:bg-zinc-100 flex items-center justify-center text-zinc-400 hover:text-zinc-700 transition-colors cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="px-6 py-3 border-b border-zinc-100 flex flex-col sm:flex-row gap-3 shrink-0 bg-zinc-50/50">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
                    <input
                      type="text"
                      placeholder="Search by sale number, customer, or location..."
                      value={salesSearch}
                      onChange={(e) => setSalesSearch(e.target.value)}
                      className="w-full pl-8 pr-4 py-2 bg-white border border-zinc-200 rounded-xl text-xs font-semibold text-zinc-700 placeholder-zinc-400 focus:outline-none focus:border-[#16A34A]"
                    />
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    {(["all", "completed", "draft"] as const).map((f) => (
                      <button
                        key={f}
                        onClick={() => setSalesStatusFilter(f)}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition-all cursor-pointer ${
                          salesStatusFilter === f
                            ? "bg-[#16A34A] text-white shadow-sm"
                            : "bg-white border border-zinc-200 text-zinc-500 hover:border-zinc-300"
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                  {filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                      <Receipt className="h-10 w-10 text-zinc-200 mb-3" />
                      <p className="text-sm font-bold text-zinc-400">
                        No sales found
                      </p>
                      <p className="text-[10px] text-zinc-300 mt-1 font-semibold">
                        {salesSearch || salesStatusFilter !== "all"
                          ? "Try adjusting your filters."
                          : "No sales recorded yet."}
                      </p>
                    </div>
                  ) : (
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="sticky top-0 bg-white z-10">
                        <tr className="border-b border-zinc-200 text-[10px] uppercase font-extrabold tracking-wider text-[#64748B]">
                          <th className="py-3 px-6">Sale #</th>
                          <th className="py-3 px-4">Date</th>
                          <th className="py-3 px-4">Customer</th>
                          <th className="py-3 px-4">Location</th>
                          <th className="py-3 px-4 text-center">Items</th>
                          <th className="py-3 px-4">Payment</th>
                          <th className="py-3 px-4 text-right">Total</th>
                          <th className="py-3 px-6 text-center">Status</th>
                          <th className="py-3 px-6 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {filtered.map((sale) => {
                          const formattedDate = sale.saleDate
                            ? new Date(sale.saleDate).toLocaleDateString(
                                "en-GB",
                                {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                },
                              )
                            : "—";
                          return (
                            <tr
                              key={sale.id}
                              className="hover:bg-zinc-50/60 transition-colors"
                            >
                              <td className="py-3.5 px-6 font-extrabold text-[#0F172A]">
                                {sale.saleNumber || "—"}
                              </td>
                              <td className="py-3.5 px-4 font-bold text-zinc-500">
                                <span className="flex items-center gap-1.5">
                                  <Calendar className="h-3 w-3 text-zinc-300 shrink-0" />
                                  {formattedDate}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 font-bold text-zinc-700">
                                <span className="flex items-center gap-1.5">
                                  <User className="h-3 w-3 text-zinc-300 shrink-0" />
                                  {sale.customerName || "Walk-in Customer"}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 font-bold text-zinc-500">
                                {sale.locationName || (
                                  <span className="text-zinc-300">—</span>
                                )}
                              </td>
                              <td className="py-3.5 px-4 text-center">
                                <span className="bg-zinc-100 border border-zinc-200 text-zinc-600 px-2 py-0.5 rounded-md text-[10px] font-extrabold">
                                  {sale.itemsCount ?? sale.items?.length ?? 0}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 font-bold text-zinc-500 capitalize">
                                {sale.paymentMethod || "—"}
                              </td>
                              <td className="py-3.5 px-4 text-right font-extrabold text-[#0F172A]">
                                ${sale.totalAmount.toFixed(2)}
                              </td>
                              <td className="py-3.5 px-6 text-center">
                                <span
                                  className={`inline-flex items-center gap-1 text-[9px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                                    sale.status === "completed"
                                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                      : "bg-amber-50 text-amber-700 border-amber-200"
                                  }`}
                                >
                                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                                  {sale.status}
                                </span>
                              </td>
                              <td className="py-3.5 px-6 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => setViewingSale(sale)}
                                    className="p-1 rounded-lg border border-zinc-200 hover:border-zinc-300 bg-white hover:bg-zinc-50 text-zinc-500 hover:text-[#0F172A] transition-all cursor-pointer shadow-2xs"
                                    title="View Details"
                                  >
                                    <Eye className="h-3.5 w-3.5" />
                                  </button>
                                  {sale.status === "draft" && (
                                    <button
                                      onClick={() => setSaleToComplete(sale)}
                                      className="p-1 rounded-lg border border-emerald-200 hover:border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-[#16A34A] transition-all cursor-pointer shadow-2xs"
                                      title="Complete Drafted Sale"
                                    >
                                      <CheckCircle2 className="h-3.5 w-3.5" />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>

                <div className="px-6 py-3 border-t border-zinc-100 bg-zinc-50/50 flex items-center justify-between shrink-0">
                  <span className="text-[10px] text-zinc-400 font-bold">
                    Showing {filtered.length} of {sales.length} records
                  </span>
                  <button
                    onClick={() => setShowAllSales(false)}
                    className="text-xs font-extrabold text-zinc-500 hover:text-zinc-800 border border-zinc-200 bg-white hover:bg-zinc-50 px-4 py-1.5 rounded-xl transition-all cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

      {viewingSale && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-60 p-4 animate-fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) setViewingSale(null);
          }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden border border-zinc-200 animate-scale-up">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 shrink-0">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                  <Receipt className="h-4.5 w-4.5 text-emerald-600" />
                </div>
                <div>
                  <h2 className="text-sm font-extrabold text-[#0F172A]">
                    Sale Details
                  </h2>
                  <p className="text-[10px] text-zinc-400 font-bold mt-0.5">
                    {viewingSale.saleNumber || "Draft Transaction"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewingSale(null)}
                className="h-8 w-8 rounded-lg hover:bg-zinc-100 flex items-center justify-center text-zinc-400 hover:text-zinc-700 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4 text-xs font-bold">
                <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-3.5 space-y-1">
                  <p className="text-[9px] font-extrabold text-[#64748B] uppercase tracking-wider">
                    Customer
                  </p>
                  <p className="font-extrabold text-zinc-800">
                    {viewingSale.customerName || "Walk-in Customer"}
                  </p>
                </div>
                <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-3.5 space-y-1">
                  <p className="text-[9px] font-extrabold text-[#64748B] uppercase tracking-wider">
                    Date
                  </p>
                  <p className="font-extrabold text-zinc-800">
                    {new Date(viewingSale.saleDate).toLocaleDateString(
                      "en-GB",
                      {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      },
                    )}
                  </p>
                </div>
                <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-3.5 space-y-1">
                  <p className="text-[9px] font-extrabold text-[#64748B] uppercase tracking-wider">
                    Location
                  </p>
                  <p className="font-extrabold text-zinc-800">
                    {viewingSale.locationName || "Main Kitchen"}
                  </p>
                </div>
                <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-3.5 space-y-1">
                  <p className="text-[9px] font-extrabold text-[#64748B] uppercase tracking-wider">
                    Payment Method
                  </p>
                  <p className="font-extrabold text-zinc-800 capitalize">
                    {viewingSale.paymentMethod || "—"}
                  </p>
                </div>
                {viewingSale.reference && (
                  <div className="col-span-2 bg-zinc-50 border border-zinc-200 rounded-xl p-3.5 space-y-1">
                    <p className="text-[9px] font-extrabold text-[#64748B] uppercase tracking-wider">
                      Reference
                    </p>
                    <p className="font-extrabold text-zinc-800">
                      {viewingSale.reference}
                    </p>
                  </div>
                )}
                {viewingSale.remarks && (
                  <div className="col-span-2 bg-zinc-50 border border-zinc-200 rounded-xl p-3.5 space-y-1">
                    <p className="text-[9px] font-extrabold text-[#64748B] uppercase tracking-wider">
                      Remarks
                    </p>
                    <p className="font-bold text-zinc-800 italic">
                      &quot;{viewingSale.remarks}&quot;
                    </p>
                  </div>
                )}
              </div>

              <div className="border border-zinc-200 rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-zinc-200 text-[10px] uppercase font-extrabold tracking-wider text-[#64748B] bg-zinc-50/50">
                      <th className="py-2.5 px-4">Recipe</th>
                      <th className="py-2.5 px-3 text-center">Qty</th>
                      <th className="py-2.5 px-3 text-right">Unit Price</th>
                      <th className="py-2.5 px-3 text-center">Discount</th>
                      <th className="py-2.5 px-4 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 font-bold text-zinc-700">
                    {(viewingSale.items || []).map((item: any, idx: number) => (
                      <tr key={idx} className="hover:bg-zinc-50/20">
                        <td className="py-3 px-4">
                          {item.recipeName || "Unrecorded Recipe"}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {item.quantity}
                        </td>
                        <td className="py-3 px-3 text-right">
                          ${item.unitPrice.toFixed(2)}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {item.discountPercentage}%
                        </td>
                        <td className="py-3 px-4 text-right">
                          ${item.totalAmount.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="border-t border-zinc-100 pt-4 flex justify-end">
                <div className="w-64 space-y-2 text-xs font-bold text-zinc-500">
                  <div className="flex justify-between">
                    <span>Gross Total</span>
                    <span className="text-[#0F172A]">
                      ${viewingSale.totalAmount.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax ({viewingSale.taxRate}%)</span>
                    <span className="text-[#0F172A]">
                      ${viewingSale.taxAmount.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Subtotal (Excl. Tax)</span>
                    <span className="text-[#0F172A]">
                      ${viewingSale.subtotalAmount.toFixed(2)}
                    </span>
                  </div>
                  <div className="border-t border-zinc-200 pt-2 flex justify-between items-baseline">
                    <span className="text-sm font-extrabold text-[#0F172A]">
                      Grand Total
                    </span>
                    <span className="text-base font-extrabold text-[#16A34A]">
                      ${viewingSale.totalAmount.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-zinc-200 bg-zinc-50/50 flex items-center justify-end gap-3 shrink-0">
              {viewingSale.status === "draft" && (
                <button
                  onClick={() => setSaleToComplete(viewingSale)}
                  className="bg-[#16A34A] hover:bg-[#15803D] text-white rounded-xl px-5 py-2 text-xs font-extrabold uppercase tracking-wider shadow-sm flex items-center gap-1.5 cursor-pointer transition-all duration-200"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Complete Sale
                </button>
              )}
              <button
                onClick={() => setViewingSale(null)}
                className="text-xs font-extrabold text-zinc-500 border border-zinc-200 bg-white hover:bg-zinc-50 px-4 py-2 rounded-xl transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <AlertDialog
        open={saleToComplete !== null}
        title="Complete Sale"
        description={`Are you sure you want to complete Sale ${saleToComplete?.saleNumber || ""}? This will update inventory levels and cannot be undone.`}
        confirmLabel="Complete"
        cancelLabel="Cancel"
        variant="success"
        onConfirm={handleConfirmCompleteSale}
        onCancel={() => setSaleToComplete(null)}
      />
    </div>
  );
}
