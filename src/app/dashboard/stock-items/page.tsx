/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { toast } from "sonner";
import { useEffect, useState, useMemo, useRef } from "react";

import { useAuth } from "@/providers/auth-provider";
import AlertDialog from "@/components/ui/alert-dialog";
import { useBusinessStore } from "@/stores/business-store";
import { useLocationStore } from "@/stores/location-store";
import {
  StockItem,
  Category,
  Supplier,
  Location,
  BaseUnit,
} from "@/types/inventory";
import { Package, Plus, Search, X, Loader2, Trash2, Edit2 } from "lucide-react";
import {
  createStockItem,
  getStockItems,
  updateStockItem,
  deleteStockItem,
} from "@/lib/repositories/stock-item.repository";
import { getCategories } from "@/lib/repositories/category.repository";
import { getSuppliers } from "@/lib/repositories/supplier.repository";
import { getLocations } from "@/lib/repositories/location.repository";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export default function StockItemsPage() {
  const { activeBusinessId } = useBusinessStore();
  const { activeLocationId } = useLocationStore();
  const { profile } = useAuth();

  const [items, setItems] = useState<StockItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);

  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("");
  const [selectedSupplierFilter, setSelectedSupplierFilter] = useState("");

  const [visibleCount, setVisibleCount] = useState(20);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const [showDrawer, setShowDrawer] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const [formName, setFormName] = useState("");
  const [formSku, setFormSku] = useState("");
  const [formCategoryId, setFormCategoryId] = useState("");
  const [formSupplierId, setFormSupplierId] = useState("");
  const [formBaseUnit, setFormBaseUnit] = useState<BaseUnit>("pcs");
  const [formDescription, setFormDescription] = useState("");
  const [formActive, setFormActive] = useState(true);
  const [formCostPerBaseUnit, setFormCostPerBaseUnit] = useState("");
  const [countingOptions, setCountingOptions] = useState<
    {
      id?: string;
      levelName: string;
      displayName: string;
      conversionToBaseQty: number;
      baseUnit: string;
      sortOrder: number;
      showOnMobile: boolean;
    }[]
  >([]);


  const [locationRulesMap, setLocationRulesMap] = useState<
    Record<
      string,
      {
        storageCapacity: string;
        storageCapacityUnit: string;
        reorderLevel: string;
        reorderLevelUnit: string;
        currentStock: string;
      }
    >
  >({});

  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<
    Record<string, boolean>
  >({});
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);

  const dynamicUnits: string[] = [];
  if (formBaseUnit) {
    dynamicUnits.push(formBaseUnit);
  }
  countingOptions.forEach((co) => {
    if (
      co.displayName &&
      co.displayName.trim() &&
      !dynamicUnits.includes(co.displayName.trim())
    ) {
      dynamicUnits.push(co.displayName.trim());
    }
  });
  if (dynamicUnits.length === 0) {
    dynamicUnits.push("Each");
  }

  const getConversionFactor = (unit: string) => {
    if (unit === formBaseUnit) return 1;
    const option = countingOptions.find((co) => co.displayName === unit);
    return option ? option.conversionToBaseQty || 1 : 1;
  };

  const getConvertedValue = (valueStr: string, unit: string) => {
    const val = parseFloat(valueStr) || 0;
    const factor = getConversionFactor(unit);
    return val * factor;
  };

  const getInputClassName = (fieldName: string, extraClasses = "") => {
    const hasError = validationErrors[fieldName];
    return `w-full bg-white border ${
      hasError
        ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500 ring-1 ring-rose-500/20"
        : "border-neutral-200 focus:border-neutral-900 focus:ring-neutral-900/5"
    } rounded-xl py-2 px-3 text-xs text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-4 transition-all ${extraClasses}`;
  };

  async function loadData() {
    if (!activeBusinessId) return;
    try {
      setLoading(true);
      const [itemsList, categoriesList, suppliersList, locationsList] =
        await Promise.all([
          getStockItems(activeBusinessId),
          getCategories(activeBusinessId),
          getSuppliers(activeBusinessId),
          getLocations(activeBusinessId),
        ]);

      setItems(itemsList);
      setCategories(categoriesList);
      setSuppliers(suppliersList);
      setLocations(locationsList.filter((l) => l.isActive !== false));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    setFormCostPerBaseUnit("");
    setCountingOptions([]);

    const initialRules: Record<
      string,
      {
        storageCapacity: string;
        storageCapacityUnit: string;
        reorderLevel: string;
        reorderLevelUnit: string;
        currentStock: string;
      }
    > = {};

    locations.forEach((loc) => {
      initialRules[loc.id] = {
        storageCapacity: "",
        storageCapacityUnit: "pcs",
        reorderLevel: "",
        reorderLevelUnit: "pcs",
        currentStock: "",
      };
    });

    setLocationRulesMap(initialRules);
    setSelectedLocations(locations.map((loc) => loc.id));
    setValidationErrors({});
    setShowDrawer(true);
  };

  const openEditDrawer = (item: StockItem) => {
    setEditId(item.id);
    setFormName(item.name || "");
    setFormSku(item.sku || "");
    setFormCategoryId(item.categoryId || "");
    setFormSupplierId(item.supplierId || "");
    setFormBaseUnit(item.baseUnit || "pcs");
    setFormDescription(item.description || "");
    setFormActive(item.isActive !== false);
    setFormCostPerBaseUnit(
      item.costPerBaseUnit ? String(item.costPerBaseUnit) : "",
    );
    setCountingOptions(item.countingOptions || []);

    const rulesMap: Record<
      string,
      {
        storageCapacity: string;
        storageCapacityUnit: string;
        reorderLevel: string;
        reorderLevelUnit: string;
        currentStock: string;
      }
    > = {};

    const activeLocIds: string[] = [];

    locations.forEach((loc) => {
      const existingRule = item.locationRules?.find(
        (r) => r.locationId === loc.id,
      );
      if (existingRule) {
        activeLocIds.push(loc.id);
        rulesMap[loc.id] = {
          storageCapacity:
            existingRule.storageCapacity !== undefined
              ? String(existingRule.storageCapacity)
              : "",
          storageCapacityUnit:
            existingRule.storageCapacityUnit || item.baseUnit || "pcs",
          reorderLevel:
            existingRule.reorderLevel !== undefined
              ? String(existingRule.reorderLevel)
              : "",
          reorderLevelUnit:
            existingRule.reorderLevelUnit || item.baseUnit || "pcs",
          currentStock:
            existingRule.currentStock !== undefined
              ? String(existingRule.currentStock)
              : "",
        };
      } else {
        rulesMap[loc.id] = {
          storageCapacity: "",
          storageCapacityUnit: item.baseUnit || "pcs",
          reorderLevel: "",
          reorderLevelUnit: item.baseUnit || "pcs",
          currentStock: "",
        };
      }
    });

    setLocationRulesMap(rulesMap);
    setSelectedLocations(
      activeLocIds.length > 0 ? activeLocIds : locations.map((loc) => loc.id),
    );
    setValidationErrors({});
    setShowDrawer(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBusinessId) return;

    const errors: Record<string, boolean> = {};
    if (!formName.trim()) errors.name = true;
    if (!formSku.trim()) errors.sku = true;
    if (!formCategoryId) errors.categoryId = true;
    if (!formSupplierId) errors.supplierId = true;

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      toast.error("Please fill in all required fields.");
      return;
    }

    try {
      setSaving(true);
      const rulesPayload: {
        locationId: string;
        storageCapacity: number;
        storageCapacityUnit: string;
        reorderLevel: number;
        reorderLevelUnit: string;
        currentStock: number;
      }[] = [];

      locations
        .filter((loc) => selectedLocations.includes(loc.id))
        .forEach((loc) => {
          const rule = locationRulesMap[loc.id];
          if (rule) {
            const selectedCapUnit = dynamicUnits.includes(
              rule.storageCapacityUnit,
            )
              ? rule.storageCapacityUnit
              : dynamicUnits[0];
            const selectedReoUnit = dynamicUnits.includes(
              rule.reorderLevelUnit,
            )
              ? rule.reorderLevelUnit
              : dynamicUnits[0];

            const capConverted = getConvertedValue(
              rule.storageCapacity,
              selectedCapUnit,
            );
            const reoConverted = getConvertedValue(
              rule.reorderLevel,
              selectedReoUnit,
            );
            const stockConverted = parseFloat(rule.currentStock) || 0;

            rulesPayload.push({
              locationId: loc.id,
              storageCapacity: capConverted,
              storageCapacityUnit: formBaseUnit,
              reorderLevel: reoConverted,
              reorderLevelUnit: formBaseUnit,
              currentStock: stockConverted,
            });
          }
        });

      const itemData = {
        businessId: activeBusinessId,
        categoryId: formCategoryId || "",
        supplierId: formSupplierId || "",
        name: formName.trim(),
        sku: formSku.trim(),
        imageUrl: "",
        description: formDescription.trim(),
        baseUnit: formBaseUnit,
        costPerBaseUnit: parseFloat(formCostPerBaseUnit) || 0,
        currentStock: rulesPayload.reduce(
          (sum, r) => sum + (r.currentStock || 0),
          0,
        ),
        isActive: formActive,
        locationRules: rulesPayload,
        countingOptions: countingOptions.map((co) => ({
          levelName:
            co.levelName || co.displayName.toLowerCase().replace(/\s+/g, "_"),
          displayName: co.displayName,
          conversionToBaseQty: co.conversionToBaseQty || 1,
          baseUnit: formBaseUnit,
          sortOrder: co.sortOrder || 0,
          showOnMobile: co.showOnMobile,
        })),
      };

      if (editId) {
        await updateStockItem(activeBusinessId, editId, itemData);
      } else {
        await createStockItem(activeBusinessId, itemData);
      }

      await loadData();
      toast.success(
        editId
          ? "Stock item updated successfully!"
          : "Stock item created successfully!",
      );
      setShowDrawer(false);
    } catch (err: unknown) {
      console.error(err);
      toast.error(
        (err as { message?: string }).message || "Failed to save stock item.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (itemId: string) => {
    setDeleteTarget(itemId);
  };

  const handleConfirmDelete = async () => {
    if (!activeBusinessId || !deleteTarget) return;
    try {
      await deleteStockItem(activeBusinessId, deleteTarget);
      toast.success("Stock item deleted successfully!");
      await loadData();
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete stock item.");
    } finally {
      setDeleteTarget(null);
    }
  };

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.sku &&
          item.sku.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCategory = selectedCategoryFilter
        ? item.categoryId === selectedCategoryFilter
        : true;
      const matchesSupplier = selectedSupplierFilter
        ? item.supplierId === selectedSupplierFilter
        : true;
      const matchesLocation = activeLocationId
        ? !item.locationRules ||
          item.locationRules.length === 0 ||
          item.locationRules.some(
            (rule) => rule.locationId === activeLocationId,
          )
        : true;

      return (
        matchesSearch && matchesCategory && matchesSupplier && matchesLocation
      );
    });
  }, [
    items,
    searchQuery,
    selectedCategoryFilter,
    selectedSupplierFilter,
    activeLocationId,
  ]);

  useEffect(() => {
    setVisibleCount(20);
  }, [
    searchQuery,
    selectedCategoryFilter,
    selectedSupplierFilter,
    activeLocationId,
  ]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + 20, filteredItems.length));
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
  }, [filteredItems.length]);

  const visibleItems = useMemo(() => {
    return filteredItems.slice(0, visibleCount);
  }, [filteredItems, visibleCount]);

  const getStatusBadge = (item: StockItem) => {
    if (!item.isActive) {
      return (
        <span className="bg-neutral-100 text-neutral-600 px-2.5 py-1 rounded-md font-bold text-[10px] uppercase tracking-wider inline-flex items-center gap-1.5 border border-neutral-200">
          <span className="h-1.5 w-1.5 rounded-full bg-neutral-400" />
          Inactive
        </span>
      );
    }

    return (
      <span className="bg-emerald-50 text-emerald-800 px-2.5 py-1.5 rounded-md font-bold text-[10px] uppercase tracking-wider inline-flex items-center gap-1.5 border border-emerald-200/70">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
        Active
      </span>
    );
  };

  if (loading && items.length === 0) {
    return (
      <div className="min-h-[75vh] flex flex-col items-center justify-center bg-white text-neutral-900">
        <Loader2 className="h-7 w-7 text-neutral-900 animate-spin mb-3" />
        <p className="text-neutral-400 text-xs font-bold uppercase tracking-wider">
          Loading stock items...
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 bg-white min-h-0 w-full pb-8 select-none font-sans antialiased text-neutral-900">
      <div className="w-full space-y-4">
        <div className="bg-white border border-neutral-200 rounded-3xl py-4 px-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm">
          <div>
            <h1 className="text-[24px] font-bold text-neutral-900 tracking-tight">
              Stock Items
            </h1>
            <p className="text-neutral-500 text-xs font-medium mt-0.5">
              Manage all your stock items, storage capacity, and reorder levels
              by location.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={openAddDrawer}
              className="inline-flex items-center gap-2 bg-[#0A2924] hover:bg-[#0A2924]/90 border border-[#0A2924] text-white px-5 py-2.5 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer shadow-sm"
            >
              <Plus className="h-4 w-4 stroke-[2.5]" />
              <span>Add Stock Item</span>
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 w-full">
          <div className="relative flex-1 max-w-md">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
              <Search className="h-4 w-4" />
            </span>
            <input
              type="text"
              placeholder="Search stock items..."
              className="w-full bg-white border border-neutral-200 focus:border-neutral-900 focus:ring-4 focus:ring-neutral-900/5 rounded-full py-2.5 pl-10 pr-4 text-xs font-medium text-neutral-900 placeholder:text-neutral-400 focus:outline-none transition shadow-2xs h-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            <div className="w-full sm:w-44">
              <Select
                value={selectedCategoryFilter}
                onValueChange={(val) => setSelectedCategoryFilter(val)}
              >
                <SelectTrigger className="w-full h-10 rounded-full border border-neutral-200 bg-white px-4 text-xs font-semibold text-neutral-800 hover:bg-neutral-50 transition cursor-pointer shadow-2xs">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border border-neutral-200 bg-white p-1 max-h-56 z-50">
                  <SelectItem
                    value=""
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

            <div className="w-full sm:w-44">
              <Select
                value={selectedSupplierFilter}
                onValueChange={(val) => setSelectedSupplierFilter(val)}
              >
                <SelectTrigger className="w-full h-10 rounded-full border border-neutral-200 bg-white px-4 text-xs font-semibold text-neutral-800 hover:bg-neutral-50 transition cursor-pointer shadow-2xs">
                  <SelectValue placeholder="All Suppliers" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border border-neutral-200 bg-white p-1 max-h-56 z-50">
                  <SelectItem
                    value=""
                    className="rounded-lg px-3 py-2 text-xs font-semibold cursor-pointer"
                  >
                    All Suppliers
                  </SelectItem>
                  {suppliers.map((sup) => (
                    <SelectItem
                      key={sup.id}
                      value={sup.id}
                      className="rounded-lg px-3 py-2 text-xs font-semibold cursor-pointer"
                    >
                      {sup.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {visibleItems.length === 0 ? (
          <div className="bg-white border border-neutral-200 rounded-3xl py-20 px-6 text-center flex flex-col items-center justify-center shadow-xs">
            <Package className="h-10 w-10 text-neutral-300 mb-3" />
            <h3 className="text-base font-bold text-neutral-900">
              No stock items found
            </h3>
            <p className="text-neutral-500 text-xs mt-1 font-medium max-w-xs leading-relaxed">
              No registered stock items match your search filters. Click Add
              Stock Item to begin.
            </p>
          </div>
        ) : (
          <div className="bg-white border border-neutral-200 rounded-3xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-neutral-200 text-[11px] font-bold text-neutral-500 uppercase tracking-wider bg-white">
                    <th className="py-4 px-6 font-bold">Item Name</th>
                    <th className="py-4 px-6 font-bold">Category</th>
                    <th className="py-4 px-6 font-bold">Base Unit</th>
                    <th className="py-4 px-6 font-bold">Locations</th>
                    <th className="py-4 px-6 font-bold">Status</th>
                    <th className="py-4 px-6 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 text-xs text-neutral-900 bg-white">
                  {visibleItems.map((item) => (
                    <tr
                      key={item.id}
                      onClick={() => openEditDrawer(item)}
                      className="hover:bg-neutral-50/50 transition-colors cursor-pointer"
                    >
                      <td className="py-4 px-6">
                        <div>
                          <p className="font-bold text-neutral-900 text-xs">
                            {item.name}
                          </p>
                          <p className="text-[10px] text-neutral-400 font-medium mt-0.5 uppercase tracking-wider">
                            {item.sku || "No SKU"}
                          </p>
                        </div>
                      </td>
                      <td className="py-4 px-6 font-semibold text-neutral-600">
                        {item.categoryName || "Uncategorized"}
                      </td>
                      <td className="py-4 px-6 font-semibold text-neutral-800">
                        {item.baseUnit}
                      </td>
                      <td className="py-4 px-6">
                        <span className=" text-neutral-800 px-2.5 py-0.5 font-bold text-[10px]">
                          {item.locationsCount || 0}
                        </span>
                      </td>
                      <td className="py-4 px-6">{getStatusBadge(item)}</td>
                      <td className="py-4 px-6 text-right relative">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditDrawer(item);
                            }}
                            className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-400 hover:text-neutral-800 transition-colors cursor-pointer"
                            title="Edit Stock Item"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(item.id);
                            }}
                            className="p-1.5 rounded-lg hover:bg-rose-50 text-neutral-400 hover:text-rose-600 transition-colors cursor-pointer"
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

            {visibleCount < filteredItems.length && (
              <div
                ref={loadMoreRef}
                className="py-4 border-t border-neutral-100 flex items-center justify-center text-xs font-semibold text-neutral-400 gap-2 bg-neutral-50/30"
              >
                <Loader2 className="h-4 w-4 animate-spin text-neutral-600" />
                <span>Loading more stock items...</span>
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
          <div className="fixed top-0 right-0 h-full w-[480px] max-w-[95vw] bg-white border-l border-neutral-200 shadow-2xl flex flex-col justify-between z-50 animate-slide-in">
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              <div className="flex justify-between items-start border-b border-neutral-100 pb-4">
                <div>
                  <h3 className="text-base font-bold text-neutral-900">
                    {editId ? "Edit Stock Item" : "Add Stock Item"}
                  </h3>
                  <p className="text-neutral-500 text-xs font-medium mt-0.5">
                    Enter the details for the stock item.
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

              <form onSubmit={handleSave} noValidate className="space-y-5">
                <div className="space-y-4">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 border-b border-neutral-100 pb-1">
                    Basic Information
                  </h4>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-neutral-700 uppercase tracking-wider block">
                        Item Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Enter item name"
                        className={getInputClassName("name")}
                        value={formName}
                        onChange={(e) => {
                          setFormName(e.target.value);
                          if (validationErrors.name) {
                            setValidationErrors((prev) => ({
                              ...prev,
                              name: false,
                            }));
                          }
                        }}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-neutral-700 uppercase tracking-wider block">
                        SKU / Item Code <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Enter item code"
                        className={getInputClassName("sku")}
                        value={formSku}
                        onChange={(e) => {
                          setFormSku(e.target.value);
                          if (validationErrors.sku) {
                            setValidationErrors((prev) => ({
                              ...prev,
                              sku: false,
                            }));
                          }
                        }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-neutral-700 uppercase tracking-wider block">
                        Category <span className="text-rose-500">*</span>
                      </label>
                      <Select
                        value={formCategoryId}
                        onValueChange={(val) => {
                          setFormCategoryId(val);
                          if (validationErrors.categoryId) {
                            setValidationErrors((prev) => ({
                              ...prev,
                              categoryId: false,
                            }));
                          }
                        }}
                      >
                        <SelectTrigger
                          className={cn(
                            "w-full h-10 rounded-xl border bg-white px-3 text-xs font-semibold text-neutral-900 focus:outline-none focus:ring-4 transition cursor-pointer shadow-2xs",
                            validationErrors.categoryId
                              ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500/20"
                              : "border-neutral-200 focus:border-neutral-900 focus:ring-neutral-900/5",
                          )}
                        >
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
                        Supplier <span className="text-rose-500">*</span>
                      </label>
                      <Select
                        value={formSupplierId}
                        onValueChange={(val) => {
                          setFormSupplierId(val);
                          if (validationErrors.supplierId) {
                            setValidationErrors((prev) => ({
                              ...prev,
                              supplierId: false,
                            }));
                          }
                        }}
                      >
                        <SelectTrigger
                          className={cn(
                            "w-full h-10 rounded-xl border bg-white px-3 text-xs font-semibold text-neutral-900 focus:outline-none focus:ring-4 transition cursor-pointer shadow-2xs",
                            validationErrors.supplierId
                              ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500/20"
                              : "border-neutral-200 focus:border-neutral-900 focus:ring-neutral-900/5",
                          )}
                        >
                          <SelectValue placeholder="Select supplier" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border border-neutral-200 bg-white p-1 max-h-56 z-60">
                          {suppliers.map((sup) => (
                            <SelectItem
                              key={sup.id}
                              value={sup.id}
                              className="rounded-lg px-3 py-2 text-xs font-semibold cursor-pointer"
                            >
                              {sup.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-neutral-700 uppercase tracking-wider block">
                        Base Unit <span className="text-rose-500">*</span>
                      </label>
                      <Select
                        value={formBaseUnit}
                        onValueChange={(val) =>
                          setFormBaseUnit(val as BaseUnit)
                        }
                      >
                        <SelectTrigger className="w-full h-10 rounded-xl border border-neutral-200 bg-white px-3 text-xs font-semibold text-neutral-900 focus:outline-none focus:ring-4 focus:ring-neutral-900/5 focus:border-neutral-900 transition cursor-pointer shadow-2xs">
                          <SelectValue placeholder="Select unit" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border border-neutral-200 bg-white p-1 max-h-56 z-60">
                          <SelectItem
                            value="pcs"
                            className="rounded-lg px-3 py-2 text-xs font-semibold cursor-pointer"
                          >
                            pcs
                          </SelectItem>
                          <SelectItem
                            value="kg"
                            className="rounded-lg px-3 py-2 text-xs font-semibold cursor-pointer"
                          >
                            kg
                          </SelectItem>
                          <SelectItem
                            value="L"
                            className="rounded-lg px-3 py-2 text-xs font-semibold cursor-pointer"
                          >
                            L
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-neutral-700 uppercase tracking-wider block">
                        Cost per Base Unit ($)
                      </label>
                      <input
                        type="number"
                        step="any"
                        placeholder="0.00"
                        className="w-full bg-white border border-neutral-200 rounded-xl py-2 px-3 text-xs text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-4 focus:ring-neutral-900/5 focus:border-neutral-900 transition-all"
                        value={formCostPerBaseUnit}
                        onChange={(e) => setFormCostPerBaseUnit(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-neutral-700 uppercase tracking-wider block">
                      Description
                    </label>
                    <textarea
                      placeholder="Optional description"
                      rows={2}
                      className="w-full bg-white border border-neutral-200 rounded-xl py-2 px-3 text-xs text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-4 focus:ring-neutral-900/5 focus:border-neutral-900 transition-all resize-none"
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="flex justify-between items-center border-b border-neutral-100 pb-1">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                      Counting Options
                    </h4>
                    <button
                      type="button"
                      onClick={() =>
                        setCountingOptions((prev) => [
                          ...prev,
                          {
                            levelName: "",
                            displayName: "",
                            conversionToBaseQty: 1,
                            baseUnit: formBaseUnit,
                            sortOrder: prev.length + 1,
                            showOnMobile: true,
                          },
                        ])
                      }
                      className="text-[10px] font-bold text-[#0A2924] bg-neutral-100 hover:bg-neutral-200 cursor-pointer flex items-center gap-1 rounded-lg p-1.5"
                    >
                      <Plus className="h-3 w-3 stroke-[3px]" />
                      Add Option
                    </button>
                  </div>

                  {countingOptions.length > 0 && (
                    <div className="space-y-2.5">
                      {countingOptions.map((co, idx) => (
                        <div
                          key={idx}
                          className="bg-neutral-50 border border-neutral-200 rounded-xl p-3 space-y-2 relative"
                        >
                          <button
                            type="button"
                            onClick={() =>
                              setCountingOptions((prev) =>
                                prev.filter((_, i) => i !== idx),
                              )
                            }
                            className="absolute top-2 right-2 p-1 text-neutral-400 hover:text-rose-600 transition-colors cursor-pointer"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider block mb-1">
                                Option Name
                              </label>
                              <input
                                type="text"
                                placeholder="e.g. Carton, Pack"
                                className="w-full bg-white border border-neutral-200 rounded-lg p-2 text-xs font-semibold text-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
                                value={co.displayName}
                                onChange={(e) =>
                                  setCountingOptions((prev) =>
                                    prev.map((item, i) =>
                                      i === idx
                                        ? {
                                            ...item,
                                            displayName: e.target.value,
                                          }
                                        : item,
                                    ),
                                  )
                                }
                              />
                            </div>
                            <div>
                              <label className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider block mb-1">
                                Conversion to Base ({formBaseUnit})
                              </label>
                              <input
                                type="number"
                                step="any"
                                placeholder="1"
                                className="w-full bg-white border border-neutral-200 rounded-lg p-2 text-xs font-semibold text-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
                                value={co.conversionToBaseQty}
                                onChange={(e) =>
                                  setCountingOptions((prev) =>
                                    prev.map((item, i) =>
                                      i === idx
                                        ? {
                                            ...item,
                                            conversionToBaseQty:
                                              parseFloat(e.target.value) || 1,
                                          }
                                        : item,
                                    ),
                                  )
                                }
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-4 pt-2">
                  <div className="border-t border-neutral-100 pt-4">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-1">
                      Storage Capacity & Reorder Level by Location
                    </h4>
                  </div>

                  <div className="space-y-3">
                    {locations.map((loc) => {
                      const isSelected = selectedLocations.includes(loc.id);
                      const rule = locationRulesMap[loc.id] || {
                        storageCapacity: "",
                        storageCapacityUnit: formBaseUnit,
                        reorderLevel: "",
                        reorderLevelUnit: formBaseUnit,
                        currentStock: "",
                      };

                      return (
                        <div
                          key={loc.id}
                          className="bg-neutral-50 border border-neutral-200 rounded-xl p-3 space-y-2.5"
                        >
                          <div className="flex items-center justify-between">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                className="h-4 w-4 text-[#0A2924] focus:ring-[#0A2924] border-neutral-300 rounded cursor-pointer"
                                checked={isSelected}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedLocations((prev) => [
                                      ...prev,
                                      loc.id,
                                    ]);
                                  } else {
                                    setSelectedLocations((prev) =>
                                      prev.filter((id) => id !== loc.id),
                                    );
                                  }
                                }}
                              />
                              <span className="text-xs font-bold text-neutral-900">
                                {loc.name}
                              </span>
                            </label>
                          </div>

                          {isSelected && (
                            <div className="grid grid-cols-3 gap-2 pt-1 border-t border-neutral-200/60">
                              <div>
                                <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">
                                  Capacity
                                </label>
                                <input
                                  type="number"
                                  placeholder="0"
                                  className="w-full bg-white border border-neutral-200 rounded-lg py-1.5 px-2 text-xs font-semibold text-neutral-900 focus:outline-none"
                                  value={rule.storageCapacity}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setLocationRulesMap((prev) => ({
                                      ...prev,
                                      [loc.id]: {
                                        ...prev[loc.id],
                                        storageCapacity: val,
                                      },
                                    }));
                                  }}
                                />
                              </div>
                              <div>
                                <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">
                                  Reorder Lvl
                                </label>
                                <input
                                  type="number"
                                  placeholder="0"
                                  className="w-full bg-white border border-neutral-200 rounded-lg py-1.5 px-2 text-xs font-semibold text-neutral-900 focus:outline-none"
                                  value={rule.reorderLevel}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setLocationRulesMap((prev) => ({
                                      ...prev,
                                      [loc.id]: {
                                        ...prev[loc.id],
                                        reorderLevel: val,
                                      },
                                    }));
                                  }}
                                />
                              </div>
                              <div>
                                <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">
                                  Cur Stock
                                </label>
                                <input
                                  type="number"
                                  placeholder="0"
                                  className="w-full bg-white border border-neutral-200 rounded-lg py-1.5 px-2 text-xs font-semibold text-neutral-900 focus:outline-none"
                                  value={rule.currentStock}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setLocationRulesMap((prev) => ({
                                      ...prev,
                                      [loc.id]: {
                                        ...prev[loc.id],
                                        currentStock: val,
                                      },
                                    }));
                                  }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {editId && (
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="formActive"
                      className="h-4 w-4 text-[#0A2924] focus:ring-[#0A2924] border-neutral-300 rounded cursor-pointer"
                      checked={formActive}
                      onChange={(e) => setFormActive(e.target.checked)}
                    />
                    <label
                      htmlFor="formActive"
                      className="text-xs font-bold text-neutral-900 cursor-pointer"
                    >
                      Stock item is active and visible
                    </label>
                  </div>
                )}
              </form>
            </div>

            <div className="p-6 border-t border-neutral-200 bg-white flex justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setShowDrawer(false)}
                className="bg-white border border-neutral-200 hover:bg-neutral-50 text-neutral-700 rounded-full px-5 py-2.5 text-xs font-semibold transition cursor-pointer shadow-2xs"
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
                  !formCategoryId ||
                  !formBaseUnit ||
                  !formSupplierId
                }
                className="inline-flex items-center gap-2 bg-[#0A2924] hover:bg-[#0A2924]/90 disabled:opacity-40 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-full text-xs font-semibold transition cursor-pointer shadow-sm"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Save Stock Item</span>
                )}
              </button>
            </div>
          </div>
        </>
      )}

      <AlertDialog
        open={deleteTarget !== null}
        title="Delete Stock Item"
        description="Are you sure you want to delete this stock item? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
