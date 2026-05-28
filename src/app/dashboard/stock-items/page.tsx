"use client";

import { useEffect, useState } from "react";
import { useBusinessStore } from "@/store/business-store";
import { useAuth } from "@/providers/auth-provider";
import { getUserBusinesses } from "@/lib/repositories/business.repository";
import { StockItem, Category, Supplier, Location, BaseUnit, LocationRule } from "@/types/inventory";
import { Business } from "@/types/business";
import {
  Package,
  Plus,
  Search,
  ChevronDown,
  X,
  Loader2,
  Trash2,
  Edit2,
  ChevronLeft,
  ChevronRight,
  Truck,
  Layers,
  Info,
  MoreVertical,
} from "lucide-react";
import {
  createStockItem,
  getStockItems,
  updateStockItem,
  deleteStockItem,
} from "@/lib/repositories/stock-item.repository";
import { getCategories } from "@/lib/repositories/category.repository";
import { getSuppliers } from "@/lib/repositories/supplier.repository";
import { getLocations } from "@/lib/repositories/location.repository";

export default function StockItemsPage() {
  const { activeBusinessId } = useBusinessStore();
  const { profile } = useAuth();

  const [items, setItems] = useState<StockItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [activeBusiness, setActiveBusiness] = useState<Business | null>(null);

  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("");
  const [selectedSupplierFilter, setSelectedSupplierFilter] = useState("");

  const [showDrawer, setShowDrawer] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const [formName, setFormName] = useState("");
  const [formSku, setFormSku] = useState("");
  const [formCategoryId, setFormCategoryId] = useState("");
  const [formSupplierId, setFormSupplierId] = useState("");
  const [formBaseUnit, setFormBaseUnit] = useState<BaseUnit>("pcs");
  const [formDescription, setFormDescription] = useState("");
  const [formActive, setFormActive] = useState(true);

  const [reorderOption, setReorderOption] = useState<"same" | "different">("same");
  const [sameCapacity, setSameCapacity] = useState("");
  const [sameCapacityUnit, setSameCapacityUnit] = useState("Each");
  const [sameReorder, setSameReorder] = useState("");
  const [sameReorderUnit, setSameReorderUnit] = useState("Each");

  const [locationRulesMap, setLocationRulesMap] = useState<
    Record<
      string,
      {
        storageCapacity: string;
        storageCapacityUnit: string;
        reorderLevel: string;
        reorderLevelUnit: string;
      }
    >
  >({});

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  async function loadData() {
    if (!activeBusinessId) return;
    try {
      setLoading(true);
      const [itemsList, categoriesList, suppliersList, locationsList, businessesList] = await Promise.all([
        getStockItems(activeBusinessId),
        getCategories(activeBusinessId),
        getSuppliers(activeBusinessId),
        getLocations(activeBusinessId),
        getUserBusinesses([]),
      ]);

      setItems(itemsList);
      setCategories(categoriesList);
      setSuppliers(suppliersList);
      setLocations(locationsList.filter((l) => l.isActive !== false));
      setBusinesses(businessesList);

      const activeDoc = businessesList.find((b) => b.id === activeBusinessId) || null;
      setActiveBusiness(activeDoc);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [activeBusinessId, profile]);

  const openAddDrawer = () => {
    setEditId(null);
    setFormName("");
    setFormSku("");
    setFormCategoryId("");
    setFormSupplierId("");
    setFormBaseUnit("pcs");
    setFormDescription("");
    setFormActive(true);

    setReorderOption("same");
    setSameCapacity("");
    setSameCapacityUnit("Each");
    setSameReorder("");
    setSameReorderUnit("Each");

    const initialRules: typeof locationRulesMap = {};
    locations.forEach((loc) => {
      initialRules[loc.id] = {
        storageCapacity: "",
        storageCapacityUnit: "Each",
        reorderLevel: "",
        reorderLevelUnit: "Each",
      };
    });
    setLocationRulesMap(initialRules);

    setError(null);
    setShowDrawer(true);
  };

  const openEditDrawer = (item: StockItem) => {
    setEditId(item.id);
    setFormName(item.name);
    setFormSku(item.sku || "");
    setFormCategoryId(item.categoryId || "");
    setFormSupplierId(item.supplierId || "");
    setFormBaseUnit(item.baseUnit);
    setFormDescription(item.description || "");
    setFormActive(item.isActive !== false);

    const rules = item.locationRules || [];
    const isSameOption =
      rules.length > 0 &&
      rules.every(
        (r) =>
          r.storageCapacity === rules[0].storageCapacity &&
          r.storageCapacityUnit === rules[0].storageCapacityUnit &&
          r.reorderLevel === rules[0].reorderLevel &&
          r.reorderLevelUnit === rules[0].reorderLevelUnit
      );

    if (isSameOption && rules.length > 0) {
      setReorderOption("same");
      setSameCapacity(String(rules[0].storageCapacity));
      setSameCapacityUnit(rules[0].storageCapacityUnit || "Each");
      setSameReorder(String(rules[0].reorderLevel));
      setSameReorderUnit(rules[0].reorderLevelUnit || "Each");
    } else {
      setReorderOption("different");
      setSameCapacity("");
      setSameCapacityUnit("Each");
      setSameReorder("");
      setSameReorderUnit("Each");
    }

    const rulesMap: typeof locationRulesMap = {};
    locations.forEach((loc) => {
      const existing = rules.find((r) => r.locationId === loc.id);
      rulesMap[loc.id] = {
        storageCapacity: existing ? String(existing.storageCapacity) : "",
        storageCapacityUnit: existing?.storageCapacityUnit || "Each",
        reorderLevel: existing ? String(existing.reorderLevel) : "",
        reorderLevelUnit: existing?.reorderLevelUnit || "Each",
      };
    });
    setLocationRulesMap(rulesMap);

    setError(null);
    setShowDrawer(true);
    setActiveMenuId(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBusinessId || !formName.trim() || !formBaseUnit) {
      setError("Please fill in all required fields.");
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const rulesPayload: LocationRule[] = [];
      if (reorderOption === "same") {
        locations.forEach((loc) => {
          rulesPayload.push({
            locationId: loc.id,
            storageCapacity: parseFloat(sameCapacity) || 0,
            storageCapacityUnit: sameCapacityUnit,
            reorderLevel: parseFloat(sameReorder) || 0,
            reorderLevelUnit: sameReorderUnit,
          });
        });
      } else {
        locations.forEach((loc) => {
          const rule = locationRulesMap[loc.id];
          if (rule) {
            rulesPayload.push({
              locationId: loc.id,
              storageCapacity: parseFloat(rule.storageCapacity) || 0,
              storageCapacityUnit: rule.storageCapacityUnit,
              reorderLevel: parseFloat(rule.reorderLevel) || 0,
              reorderLevelUnit: rule.reorderLevelUnit,
            });
          }
        });
      }

      const itemData = {
        businessId: activeBusinessId,
        categoryId: formCategoryId || "",
        supplierId: formSupplierId || "",
        name: formName.trim(),
        sku: formSku.trim(),
        imageUrl: "",
        description: formDescription.trim(),
        baseUnit: formBaseUnit,
        reorderLevelBaseQty: 0,
        maxStockBaseQty: 0,
        costPerBaseUnit: 0,
        isActive: formActive,
        locationRules: rulesPayload,
      };

      if (editId) {
        await updateStockItem(activeBusinessId, editId, itemData);
      } else {
        await createStockItem(activeBusinessId, itemData);
      }

      await loadData();
      setShowDrawer(false);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || "Failed to save stock item.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (itemId: string) => {
    if (!activeBusinessId) return;
    if (!confirm("Are you sure you want to delete this stock item?")) return;

    try {
      await deleteStockItem(activeBusinessId, itemId);
      await loadData();
      setActiveMenuId(null);
    } catch (err) {
      console.error(err);
      alert("Failed to delete stock item.");
    }
  };

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.sku && item.sku.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = selectedCategoryFilter ? item.categoryId === selectedCategoryFilter : true;
    const matchesSupplier = selectedSupplierFilter ? item.supplierId === selectedSupplierFilter : true;

    return matchesSearch && matchesCategory && matchesSupplier;
  });

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getStatusBadge = (item: StockItem) => {
    if (!item.isActive) {
      return (
        <span className="bg-zinc-100 text-zinc-500 px-2.5 py-1 rounded-md font-bold text-[10px] uppercase tracking-wider inline-flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-zinc-400" />
          Inactive
        </span>
      );
    }

    if (item.sku === "ITEM-C004" || item.name.toLowerCase().includes("lettuce")) {
      return (
        <span className="bg-amber-50 text-amber-600 px-2.5 py-1 rounded-md font-bold text-[10px] uppercase tracking-wider inline-flex items-center gap-1.5 border border-amber-200">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
          Low Stock
        </span>
      );
    }

    return (
      <span className="bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-md font-bold text-[10px] uppercase tracking-wider inline-flex items-center gap-1.5 border border-emerald-200">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        Active
      </span>
    );
  };

  const unitsOptions = ["Each", "Pack (24)", "Carton", "Box (12)", "Pallet", "pcs", "kg", "L"];

  if (loading) {
    return (
      <div className="h-[75vh] flex flex-col items-center justify-center bg-white text-[#0F172A]">
        <Loader2 className="h-7 w-7 text-[#16A34A] animate-spin mb-3" />
        <span className="text-[#64748B] text-xs font-bold uppercase tracking-wider">
          Loading stock items...
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
              Stock Items
            </h1>
            <p className="text-[#64748B] text-xs font-bold mt-1.5">
              Manage all your stock items, including storage capacity and reorder levels by location.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button className="border border-zinc-200 hover:bg-zinc-50 text-zinc-700 rounded-xl px-4 py-2.5 text-xs font-bold transition-all duration-200 flex items-center gap-2 cursor-pointer shadow-xs">
              Import Items
            </button>
            <button
              onClick={openAddDrawer}
              className="bg-[#16A34A] hover:bg-[#15803D] text-white rounded-xl px-5 py-2.5 text-xs font-bold uppercase tracking-wider shadow-sm flex items-center gap-2 cursor-pointer transition-all duration-200"
            >
              <Plus className="h-4 w-4 stroke-[3px]" />
              Add Stock Item
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3.5 justify-between items-center bg-zinc-50/50 p-3 rounded-2xl border border-zinc-200">
          <div className="relative w-full sm:max-w-xs">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
              <Search className="h-4 w-4" />
            </span>
            <input
              type="text"
              placeholder="Search stock items..."
              className="w-full bg-white border border-zinc-200 focus:border-[#16A34A] rounded-xl py-2 pl-9 pr-4 text-xs text-zinc-950 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-[#16A34A] transition-all shadow-xs"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            <div className="relative">
              <select
                className="bg-white border border-zinc-200 rounded-xl py-2 pl-3.5 pr-8 text-xs font-bold text-zinc-700 focus:outline-none focus:border-[#16A34A] cursor-pointer appearance-none shadow-xs"
                value={selectedCategoryFilter}
                onChange={(e) => {
                  setSelectedCategoryFilter(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400 pointer-events-none" />
            </div>

            <div className="relative">
              <select
                className="bg-white border border-zinc-200 rounded-xl py-2 pl-3.5 pr-8 text-xs font-bold text-zinc-700 focus:outline-none focus:border-[#16A34A] cursor-pointer appearance-none shadow-xs"
                value={selectedSupplierFilter}
                onChange={(e) => {
                  setSelectedSupplierFilter(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="">All Suppliers</option>
                {suppliers.map((sup) => (
                  <option key={sup.id} value={sup.id}>
                    {sup.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400 pointer-events-none" />
            </div>

            <button className="border border-zinc-200 hover:bg-zinc-50 bg-white text-zinc-700 rounded-xl px-3.5 py-2 text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer">
              Filters
            </button>
          </div>
        </div>

        {(error) && (
          <div className="bg-rose-50 border border-rose-200 text-rose-600 text-xs rounded-xl p-3 text-center font-bold">
            {error}
          </div>
        )}

        {paginatedItems.length === 0 ? (
          <div className="bg-white border border-zinc-200 rounded-2xl py-20 px-6 text-center flex flex-col items-center justify-center shadow-sm">
            <Package className="h-10 w-10 text-zinc-300 mb-3" />
            <h3 className="text-base font-bold text-[#0F172A]">
              No stock items found
            </h3>
            <p className="text-[#64748B] text-xs mt-1 font-semibold max-w-xs leading-relaxed">
              No registered stock items match your search filters. Click Add Stock Item to begin.
            </p>
          </div>
        ) : (
          <div className="bg-white border border-zinc-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-200 text-[10px] uppercase font-extrabold tracking-wider text-[#64748B] bg-zinc-50/50">
                    <th className="py-4 px-6 font-extrabold">Item Name</th>
                    <th className="py-4 px-6 font-extrabold">Category</th>
                    <th className="py-4 px-6 font-extrabold">Base Unit</th>
                    <th className="py-4 px-6 font-extrabold">Locations</th>
                    <th className="py-4 px-6 font-extrabold">Status</th>
                    <th className="py-4 px-6 font-extrabold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 text-xs text-[#0F172A]">
                  {paginatedItems.map((item) => (
                    <tr key={item.id} className="hover:bg-zinc-50/40 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3.5">
                          <div className="h-10 w-10 rounded-lg bg-zinc-100 flex items-center justify-center shrink-0 border border-zinc-200 overflow-hidden shadow-xs">
                            {item.imageUrl ? (
                              <img
                                src={item.imageUrl}
                                alt={item.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <Package className="h-5 w-5 text-zinc-400" />
                            )}
                          </div>
                          <div>
                            <p className="font-extrabold text-[#0F172A]">
                              {item.name}
                            </p>
                            <p className="text-[10px] text-[#64748B] font-bold mt-0.5 uppercase tracking-wider">
                              {item.sku || "No SKU"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6 font-bold text-[#64748B]">
                        {item.categoryName || "Uncategorized"}
                      </td>
                      <td className="py-4 px-6 font-bold text-zinc-800">
                        {item.baseUnit}
                      </td>
                      <td className="py-4 px-6">
                        <span className="bg-zinc-100 text-zinc-800 px-2 py-0.5 rounded-full font-extrabold text-[10px]">
                          {item.locationsCount || 0}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        {getStatusBadge(item)}
                      </td>
                      <td className="py-4 px-6 text-right relative">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditDrawer(item)}
                            className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-500 hover:text-[#16A34A] transition-colors cursor-pointer"
                            title="Edit Stock Item"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="p-1.5 rounded-lg hover:bg-rose-50 text-zinc-500 hover:text-[#EF4444] transition-colors cursor-pointer"
                            title="Delete Stock Item"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="bg-zinc-50/50 border-t border-zinc-200 py-4 px-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-[#64748B] font-semibold">
              <span>
                Showing {filteredItems.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} to{" "}
                {Math.min(currentPage * itemsPerPage, filteredItems.length)} of {filteredItems.length} items
              </span>
              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-400 disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  {Array.from({ length: totalPages }).map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentPage(idx + 1)}
                      className={`h-8 w-8 rounded-lg font-bold flex items-center justify-center cursor-pointer transition-colors ${
                        currentPage === idx + 1
                          ? "bg-[#16A34A] text-white"
                          : "border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-600"
                      }`}
                    >
                      {idx + 1}
                    </button>
                  ))}
                  <button
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="p-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-400 disabled:opacity-40 cursor-pointer"
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
            className="fixed inset-0 bg-black/30 z-[998] transition-opacity"
            onClick={() => setShowDrawer(false)}
          />
          <div className="fixed top-0 right-0 h-full w-[460px] bg-white border-l border-zinc-200 shadow-2xl flex flex-col justify-between z-[999] animate-slide-in">
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              <div className="flex justify-between items-start border-b border-zinc-100 pb-4">
                <div>
                  <h3 className="text-lg font-extrabold text-[#0F172A]">
                    {editId ? "Edit Stock Item" : "Add Stock Item"}
                  </h3>
                  <p className="text-[#64748B] text-xs font-semibold mt-1">
                    Enter the details for the stock item.
                  </p>
                </div>
                <button
                  onClick={() => setShowDrawer(false)}
                  className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 cursor-pointer transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-5">
                <div className="space-y-4">
                  <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-[#64748B] border-b border-zinc-100 pb-1">
                    Basic Information
                  </h4>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-[#0F172A] uppercase tracking-wider block">
                        Item Name *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Enter item name"
                        className="w-full bg-white border border-zinc-300 focus:border-[#16A34A] rounded-xl py-2 px-3 text-xs text-zinc-950 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-[#16A34A] transition-all"
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-[#0F172A] uppercase tracking-wider block">
                        SKU / Item Code *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Enter item code"
                        className="w-full bg-white border border-zinc-300 focus:border-[#16A34A] rounded-xl py-2 px-3 text-xs text-zinc-950 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-[#16A34A] transition-all"
                        value={formSku}
                        onChange={(e) => setFormSku(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-[#0F172A] uppercase tracking-wider block">
                      Category *
                    </label>
                    <div className="relative">
                      <select
                        required
                        className="w-full bg-white border border-zinc-300 focus:border-[#16A34A] rounded-xl py-2.5 pl-3.5 pr-10 text-xs text-zinc-950 focus:outline-none focus:ring-1 focus:ring-[#16A34A] appearance-none cursor-pointer font-semibold"
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
                    <label className="text-[10px] font-bold text-[#0F172A] uppercase tracking-wider block">
                      Supplier
                    </label>
                    <div className="relative">
                      <select
                        className="w-full bg-white border border-zinc-300 focus:border-[#16A34A] rounded-xl py-2.5 pl-3.5 pr-10 text-xs text-zinc-950 focus:outline-none focus:ring-1 focus:ring-[#16A34A] appearance-none cursor-pointer font-semibold"
                        value={formSupplierId}
                        onChange={(e) => setFormSupplierId(e.target.value)}
                      >
                        <option value="">Select supplier (optional)</option>
                        {suppliers.map((sup) => (
                          <option key={sup.id} value={sup.id}>
                            {sup.name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-[#0F172A] uppercase tracking-wider block">
                      Base Unit *
                    </label>
                    <div className="relative">
                      <select
                        required
                        className="w-full bg-white border border-zinc-300 focus:border-[#16A34A] rounded-xl py-2.5 pl-3.5 pr-10 text-xs text-zinc-950 focus:outline-none focus:ring-1 focus:ring-[#16A34A] appearance-none cursor-pointer font-semibold"
                        value={formBaseUnit}
                        onChange={(e) => setFormBaseUnit(e.target.value as BaseUnit)}
                      >
                        <option value="">Select base unit</option>
                        {unitsOptions.map((unit) => (
                          <option key={unit} value={unit}>
                            {unit}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
                    </div>
                    <span className="text-[10px] font-bold text-[#64748B] block mt-1">
                      This is the unit you purchase and receive in (e.g., Pack 24, Box 12).
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-bold text-[#0F172A] uppercase tracking-wider block">
                        Description
                      </label>
                      <span className="text-[10px] font-bold text-[#64748B]">
                        {formDescription.length} / 250
                      </span>
                    </div>
                    <textarea
                      maxLength={250}
                      placeholder="Enter description (optional)"
                      rows={3}
                      className="w-full bg-white border border-zinc-300 focus:border-[#16A34A] rounded-xl py-2 px-3 text-xs text-zinc-950 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-[#16A34A] transition-all resize-none"
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-4 pt-2">
                  <div className="border-t border-zinc-100 pt-4">
                    <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-[#64748B] block mb-1">
                      Storage Capacity & Reorder Level by Location
                    </h4>
                    <span className="text-[10px] font-semibold text-[#64748B] block">
                      Set storage capacity and reorder level for this item at each location.
                    </span>
                  </div>

                  <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-3 flex items-start gap-2.5">
                    <Info className="h-4.5 w-4.5 text-zinc-400 shrink-0 mt-0.5" />
                    <span className="text-[10px] font-bold text-zinc-500 leading-relaxed">
                      Choose how you want to set values across locations.
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3.5">
                    <button
                      type="button"
                      onClick={() => setReorderOption("same")}
                      className={`flex flex-col text-left p-3.5 rounded-xl border transition-all cursor-pointer ${
                        reorderOption === "same"
                          ? "border-[#16A34A] bg-[#DCFCE7]/10"
                          : "border-zinc-200 hover:border-zinc-300 bg-white"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="reorderOption"
                          className="h-3.5 w-3.5 text-[#16A34A] focus:ring-[#16A34A] cursor-pointer"
                          checked={reorderOption === "same"}
                          onChange={() => setReorderOption("same")}
                        />
                        <span className="text-[10px] font-extrabold text-[#0F172A]">Apply Same Values</span>
                      </div>
                      <span className="text-[9px] font-bold text-zinc-500 mt-2 leading-relaxed">
                        Use the same capacity & reorder level for every location.
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setReorderOption("different")}
                      className={`flex flex-col text-left p-3.5 rounded-xl border transition-all cursor-pointer ${
                        reorderOption === "different"
                          ? "border-[#16A34A] bg-[#DCFCE7]/10"
                          : "border-zinc-200 hover:border-zinc-300 bg-white"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="reorderOption"
                          className="h-3.5 w-3.5 text-[#16A34A] focus:ring-[#16A34A] cursor-pointer"
                          checked={reorderOption === "different"}
                          onChange={() => setReorderOption("different")}
                        />
                        <span className="text-[10px] font-extrabold text-[#0F172A]">Set Different Values</span>
                      </div>
                      <span className="text-[9px] font-bold text-zinc-500 mt-2 leading-relaxed">
                        Set custom capacity & reorder for each location.
                      </span>
                    </button>
                  </div>

                  {reorderOption === "same" ? (
                    <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-[#0F172A] uppercase block">
                            Storage Capacity *
                          </label>
                          <div className="flex gap-1.5">
                            <input
                              type="number"
                              placeholder="0"
                              className="w-full bg-white border border-zinc-300 focus:border-[#16A34A] rounded-xl py-2 px-3 text-xs text-zinc-950 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-[#16A34A] font-semibold"
                              value={sameCapacity}
                              onChange={(e) => setSameCapacity(e.target.value)}
                            />
                            <div className="relative shrink-0 w-24">
                              <select
                                className="w-full bg-white border border-zinc-300 focus:border-[#16A34A] rounded-xl py-2 pl-2 pr-7 text-[10px] font-bold text-zinc-700 focus:outline-none appearance-none cursor-pointer"
                                value={sameCapacityUnit}
                                onChange={(e) => setSameCapacityUnit(e.target.value)}
                              >
                                {unitsOptions.map((unit) => (
                                  <option key={unit} value={unit}>
                                    {unit}
                                  </option>
                                ))}
                              </select>
                              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400 pointer-events-none" />
                            </div>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-[#0F172A] uppercase block">
                            Reorder Level *
                          </label>
                          <div className="flex gap-1.5">
                            <input
                              type="number"
                              placeholder="0"
                              className="w-full bg-white border border-zinc-300 focus:border-[#16A34A] rounded-xl py-2 px-3 text-xs text-zinc-950 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-[#16A34A] font-semibold"
                              value={sameReorder}
                              onChange={(e) => setSameReorder(e.target.value)}
                            />
                            <div className="relative shrink-0 w-24">
                              <select
                                className="w-full bg-white border border-zinc-300 focus:border-[#16A34A] rounded-xl py-2 pl-2 pr-7 text-[10px] font-bold text-zinc-700 focus:outline-none appearance-none cursor-pointer"
                                value={sameReorderUnit}
                                onChange={(e) => setSameReorderUnit(e.target.value)}
                              >
                                {unitsOptions.map((unit) => (
                                  <option key={unit} value={unit}>
                                    {unit}
                                  </option>
                                ))}
                              </select>
                              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400 pointer-events-none" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-zinc-50 border border-zinc-200 rounded-xl overflow-hidden">
                      <div className="max-h-72 overflow-y-auto divide-y divide-zinc-200">
                        <div className="grid grid-cols-5 text-[9px] uppercase font-extrabold text-[#64748B] bg-zinc-100/60 p-2 border-b border-zinc-200">
                          <span className="col-span-2">Location</span>
                          <span className="col-span-1.5 pl-1.5">Storage Capacity</span>
                          <span className="col-span-1.5 pl-1.5">Reorder Level</span>
                        </div>
                        {locations.map((loc) => {
                          const rule = locationRulesMap[loc.id] || {
                            storageCapacity: "",
                            storageCapacityUnit: "Each",
                            reorderLevel: "",
                            reorderLevelUnit: "Each",
                          };
                          return (
                            <div key={loc.id} className="grid grid-cols-5 items-center gap-1.5 p-2 bg-white">
                              <span className="col-span-2 text-[10px] font-extrabold text-[#0F172A] truncate" title={loc.name}>
                                {loc.name}
                              </span>
                              <div className="col-span-1.5 flex gap-1 items-center">
                                <input
                                  type="number"
                                  placeholder="0"
                                  className="w-12 bg-white border border-zinc-200 focus:border-[#16A34A] rounded-lg py-1 px-1.5 text-[10px] text-zinc-950 focus:outline-none text-center font-bold"
                                  value={rule.storageCapacity}
                                  onChange={(e) =>
                                    setLocationRulesMap((prev) => ({
                                      ...prev,
                                      [loc.id]: {
                                        ...rule,
                                        storageCapacity: e.target.value,
                                      },
                                    }))
                                  }
                                />
                                <div className="relative shrink-0 w-12">
                                  <select
                                    className="w-full bg-white border border-zinc-200 rounded-lg py-1 pl-1 pr-4 text-[8px] font-bold text-zinc-700 focus:outline-none appearance-none cursor-pointer"
                                    value={rule.storageCapacityUnit}
                                    onChange={(e) =>
                                      setLocationRulesMap((prev) => ({
                                        ...prev,
                                        [loc.id]: {
                                          ...rule,
                                          storageCapacityUnit: e.target.value,
                                        },
                                      }))
                                    }
                                  >
                                    {unitsOptions.map((unit) => (
                                      <option key={unit} value={unit}>
                                        {unit}
                                      </option>
                                    ))}
                                  </select>
                                  <ChevronDown className="absolute right-1 top-1/2 -translate-y-1/2 h-2.5 w-2.5 text-zinc-400 pointer-events-none" />
                                </div>
                              </div>
                              <div className="col-span-1.5 flex gap-1 items-center">
                                <input
                                  type="number"
                                  placeholder="0"
                                  className="w-12 bg-white border border-zinc-200 focus:border-[#16A34A] rounded-lg py-1 px-1.5 text-[10px] text-zinc-950 focus:outline-none text-center font-bold"
                                  value={rule.reorderLevel}
                                  onChange={(e) =>
                                    setLocationRulesMap((prev) => ({
                                      ...prev,
                                      [loc.id]: {
                                        ...rule,
                                        reorderLevel: e.target.value,
                                      },
                                    }))
                                  }
                                />
                                <div className="relative shrink-0 w-12">
                                  <select
                                    className="w-full bg-white border border-zinc-200 rounded-lg py-1 pl-1 pr-4 text-[8px] font-bold text-zinc-700 focus:outline-none appearance-none cursor-pointer"
                                    value={rule.reorderLevelUnit}
                                    onChange={(e) =>
                                      setLocationRulesMap((prev) => ({
                                        ...prev,
                                        [loc.id]: {
                                          ...rule,
                                          reorderLevelUnit: e.target.value,
                                        },
                                      }))
                                    }
                                  >
                                    {unitsOptions.map((unit) => (
                                      <option key={unit} value={unit}>
                                        {unit}
                                      </option>
                                    ))}
                                  </select>
                                  <ChevronDown className="absolute right-1 top-1/2 -translate-y-1/2 h-2.5 w-2.5 text-zinc-400 pointer-events-none" />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  <span className="text-[9px] font-bold text-zinc-400 block">
                    You can always edit these values later from the item details page.
                  </span>
                </div>

                {editId && (
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="formActive"
                      className="h-4 w-4 text-[#16A34A] focus:ring-[#16A34A] border-zinc-300 rounded cursor-pointer"
                      checked={formActive}
                      onChange={(e) => setFormActive(e.target.checked)}
                    />
                    <label
                      htmlFor="formActive"
                      className="text-xs font-bold text-[#0F172A] cursor-pointer"
                    >
                      Stock item is active and visible
                    </label>
                  </div>
                )}
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
                disabled={saving || !formName.trim() || !formCategoryId || !formBaseUnit}
                className="bg-[#16A34A] hover:bg-[#15803D] text-white rounded-xl px-5 py-2.5 text-xs font-bold uppercase tracking-wider shadow-sm flex items-center gap-2 cursor-pointer transition-colors disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Stock Item"
                )}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
