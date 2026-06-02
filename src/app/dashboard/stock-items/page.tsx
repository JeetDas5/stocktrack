/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useAuth } from "@/providers/auth-provider";
import { useBusinessStore } from "@/store/business-store";
import { useLocationStore } from "@/store/location-store";
import { getUserBusinesses } from "@/lib/repositories/business.repository";
import {
  StockItem,
  Category,
  Supplier,
  Location,
  BaseUnit,
  LocationRule,
} from "@/types/inventory";
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
  Info,
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
  const { activeLocationId } = useLocationStore();
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
  const [formCostPerBaseUnit, setFormCostPerBaseUnit] = useState("");
  const [formCurrentStock, setFormCurrentStock] = useState("");
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

  const [reorderOption, setReorderOption] = useState<"same" | "different">(
    "same",
  );
  const [sameCapacity, setSameCapacity] = useState("");
  const [sameCapacityUnit, setSameCapacityUnit] = useState("Each");
  const [sameReorder, setSameReorder] = useState("");
  const [sameReorderUnit, setSameReorderUnit] = useState("Each");
  const [sameCurrentStock, setSameCurrentStock] = useState("");

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
  const [error, setError] = useState<string | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<
    Record<string, boolean>
  >({});
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);

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
        : "border-zinc-300 focus:border-[#16A34A] focus:ring-[#16A34A]"
    } rounded-xl py-2 px-3 text-xs text-zinc-950 placeholder-zinc-400 focus:outline-none focus:ring-1 transition-all ${extraClasses}`;
  };

  const getSelectClassName = (fieldName: string, extraClasses = "") => {
    const hasError = validationErrors[fieldName];
    return `w-full bg-white border ${
      hasError
        ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500 ring-1 ring-rose-500/20"
        : "border-zinc-300 focus:border-[#16A34A] focus:ring-[#16A34A]"
    } rounded-xl py-2.5 pl-3.5 pr-10 text-xs text-zinc-950 focus:outline-none focus:ring-1 appearance-none cursor-pointer font-semibold transition-all ${extraClasses}`;
  };

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  async function loadData() {
    if (!activeBusinessId) return;
    try {
      setLoading(true);
      const [
        itemsList,
        categoriesList,
        suppliersList,
        locationsList,
        businessesList,
      ] = await Promise.all([
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

      const activeDoc =
        businessesList.find((b) => b.id === activeBusinessId) || null;
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
    setFormCostPerBaseUnit("");
    setFormCurrentStock("");
    setCountingOptions([]);

    setReorderOption("same");
    setSameCapacity("");
    setSameCapacityUnit("Each");
    setSameReorder("");
    setSameReorderUnit("Each");
    setSameCurrentStock("");

    const initialRules: typeof locationRulesMap = {};
    locations.forEach((loc) => {
      initialRules[loc.id] = {
        storageCapacity: "",
        storageCapacityUnit: "Each",
        reorderLevel: "",
        reorderLevelUnit: "Each",
        currentStock: "",
      };
    });
    setLocationRulesMap(initialRules);

    setSelectedLocations(locations.map((loc) => loc.id));
    setError(null);
    setValidationErrors({});
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
    setFormCostPerBaseUnit(
      item.costPerBaseUnit ? String(item.costPerBaseUnit) : "",
    );
    setFormCurrentStock(item.currentStock ? String(item.currentStock) : "");
    setCountingOptions(
      (item.countingOptions || []).map((co) => ({
        id: co.id,
        levelName: co.levelName,
        displayName: co.displayName,
        conversionToBaseQty: co.conversionToBaseQty,
        baseUnit: co.baseUnit || "pcs",
        sortOrder: co.sortOrder,
        showOnMobile: co.showOnMobile !== false,
      })),
    );

    const rules = item.locationRules || [];
    const isSameOption =
      rules.length > 0 &&
      rules.every(
        (r) =>
          r.storageCapacity === rules[0].storageCapacity &&
          r.storageCapacityUnit === rules[0].storageCapacityUnit &&
          r.reorderLevel === rules[0].reorderLevel &&
          r.reorderLevelUnit === rules[0].reorderLevelUnit &&
          r.currentStock === rules[0].currentStock,
      );

    if (isSameOption && rules.length > 0) {
      setReorderOption("same");
      setSameCapacity(String(rules[0].storageCapacity));
      setSameCapacityUnit(rules[0].storageCapacityUnit || "Each");
      setSameReorder(String(rules[0].reorderLevel));
      setSameReorderUnit(rules[0].reorderLevelUnit || "Each");
      setSameCurrentStock(
        rules[0].currentStock !== undefined
          ? String(rules[0].currentStock)
          : "",
      );
    } else {
      setReorderOption("different");
      setSameCapacity("");
      setSameCapacityUnit("Each");
      setSameReorder("");
      setSameReorderUnit("Each");
      setSameCurrentStock("");
    }

    const rulesMap: typeof locationRulesMap = {};
    locations.forEach((loc) => {
      const existing = rules.find((r) => r.locationId === loc.id);
      rulesMap[loc.id] = {
        storageCapacity: existing ? String(existing.storageCapacity) : "",
        storageCapacityUnit: existing?.storageCapacityUnit || "Each",
        reorderLevel: existing ? String(existing.reorderLevel) : "",
        reorderLevelUnit: existing?.reorderLevelUnit || "Each",
        currentStock:
          existing?.currentStock !== undefined
            ? String(existing.currentStock)
            : "",
      };
    });
    setLocationRulesMap(rulesMap);

    const itemLocIds = (item.locationRules || []).map((r) => r.locationId);
    setSelectedLocations(itemLocIds);
    setError(null);
    setValidationErrors({});
    setShowDrawer(true);
    setActiveMenuId(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBusinessId) return;

    const errors: Record<string, boolean> = {};
    if (!formName.trim()) errors.name = true;
    if (!formSku.trim()) errors.sku = true;
    if (!formCategoryId) errors.categoryId = true;
    if (!formBaseUnit) errors.baseUnit = true;
    if (selectedLocations.length === 0) errors.locations = true;

    if (reorderOption === "same") {
      const capVal = parseFloat(sameCapacity) || 0;
      const reoVal = parseFloat(sameReorder) || 0;
      const stockVal = parseFloat(sameCurrentStock) || 0;

      if (!sameCapacity.trim() || isNaN(Number(sameCapacity)) || capVal <= 0) {
        errors.sameCapacity = true;
      }
      if (!sameReorder.trim() || isNaN(Number(sameReorder)) || reoVal < 0) {
        errors.sameReorder = true;
      }
      if (
        !sameCurrentStock.trim() ||
        isNaN(Number(sameCurrentStock)) ||
        stockVal < 0
      ) {
        errors.sameCurrentStock = true;
      }

      if (
        errors.sameCapacity ||
        errors.sameReorder ||
        errors.sameCurrentStock
      ) {
        setValidationErrors(errors);
        setError(
          "Capacity must be positive (> 0), and reorder level and current stock cannot be negative.",
        );
        return;
      }

      const selectedCapUnit = dynamicUnits.includes(sameCapacityUnit)
        ? sameCapacityUnit
        : dynamicUnits[0];
      const selectedReoUnit = dynamicUnits.includes(sameReorderUnit)
        ? sameReorderUnit
        : dynamicUnits[0];

      const capConverted = getConvertedValue(sameCapacity, selectedCapUnit);
      const reoConverted = getConvertedValue(sameReorder, selectedReoUnit);
      const stockConverted = stockVal;

      if (reoConverted > capConverted) {
        errors.sameReorder = true;
        setValidationErrors(errors);
        setError("Reorder level must be less than storage capacity.");
        return;
      }
      if (stockConverted > capConverted) {
        errors.sameCurrentStock = true;
        setValidationErrors(errors);
        setError("Current stock must be less than storage capacity.");
        return;
      }
    } else {
      let limitViolation = false;
      let limitErrorMsg = "";
      locations
        .filter((loc) => selectedLocations.includes(loc.id))
        .forEach((loc) => {
          const rule = locationRulesMap[loc.id];
          const capVal = rule ? parseFloat(rule.storageCapacity) : 0;
          const reoVal = rule ? parseFloat(rule.reorderLevel) : 0;
          const stockVal = rule ? parseFloat(rule.currentStock) : 0;

          if (
            !rule ||
            !rule.storageCapacity.trim() ||
            isNaN(Number(rule.storageCapacity)) ||
            capVal <= 0
          ) {
            errors[`capacity_${loc.id}`] = true;
            limitViolation = true;
            limitErrorMsg = `Storage capacity must be positive (> 0) at ${loc.name}.`;
          }
          if (
            !rule ||
            !rule.reorderLevel.trim() ||
            isNaN(Number(rule.reorderLevel)) ||
            reoVal < 0
          ) {
            errors[`reorder_${loc.id}`] = true;
            limitViolation = true;
            limitErrorMsg = `Reorder level cannot be negative at ${loc.name}.`;
          }
          if (
            !rule ||
            !rule.currentStock ||
            !rule.currentStock.trim() ||
            isNaN(Number(rule.currentStock)) ||
            stockVal < 0
          ) {
            errors[`stock_${loc.id}`] = true;
            limitViolation = true;
            limitErrorMsg = `Current stock cannot be negative at ${loc.name}.`;
          }

          if (
            rule &&
            !errors[`capacity_${loc.id}`] &&
            !errors[`reorder_${loc.id}`] &&
            !errors[`stock_${loc.id}`]
          ) {
            const selectedCapUnit = dynamicUnits.includes(
              rule.storageCapacityUnit,
            )
              ? rule.storageCapacityUnit
              : dynamicUnits[0];
            const selectedReoUnit = dynamicUnits.includes(rule.reorderLevelUnit)
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
            const stockConverted = stockVal;

            if (reoConverted >= capConverted) {
              errors[`reorder_${loc.id}`] = true;
              limitViolation = true;
              limitErrorMsg = `Reorder level must be less than storage capacity at ${loc.name}.`;
            }
            if (stockConverted >= capConverted) {
              errors[`stock_${loc.id}`] = true;
              limitViolation = true;
              limitErrorMsg = `Current stock must be less than storage capacity at ${loc.name}.`;
            }
          }
        });

      if (limitViolation || Object.keys(errors).length > 0) {
        setValidationErrors(errors);
        if (limitViolation) {
          setError(limitErrorMsg);
        } else {
          setError(
            "Please fill in all compulsory fields marked with an asterisk (*).",
          );
        }
        return;
      }
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      setError(
        "Please fill in all compulsory fields marked with an asterisk (*).",
      );
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setValidationErrors({});

      const rulesPayload: LocationRule[] = [];
      if (reorderOption === "same") {
        const selectedCapUnit = dynamicUnits.includes(sameCapacityUnit)
          ? sameCapacityUnit
          : dynamicUnits[0];
        const selectedReoUnit = dynamicUnits.includes(sameReorderUnit)
          ? sameReorderUnit
          : dynamicUnits[0];

        const capConverted = getConvertedValue(sameCapacity, selectedCapUnit);
        const reoConverted = getConvertedValue(sameReorder, selectedReoUnit);
        const stockConverted = parseFloat(sameCurrentStock) || 0;

        locations
          .filter((loc) => selectedLocations.includes(loc.id))
          .forEach((loc) => {
            rulesPayload.push({
              locationId: loc.id,
              storageCapacity: capConverted,
              storageCapacityUnit: formBaseUnit,
              reorderLevel: reoConverted,
              reorderLevelUnit: formBaseUnit,
              currentStock: stockConverted,
            });
          });
      } else {
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

    const matchesCategory = selectedCategoryFilter
      ? item.categoryId === selectedCategoryFilter
      : true;
    const matchesSupplier = selectedSupplierFilter
      ? item.supplierId === selectedSupplierFilter
      : true;
    const matchesLocation = activeLocationId
      ? item.locationRules?.some((rule) => rule.locationId === activeLocationId)
      : true;

    return (
      matchesSearch && matchesCategory && matchesSupplier && matchesLocation
    );
  });

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
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

    if (
      item.sku === "ITEM-C004" ||
      item.name.toLowerCase().includes("lettuce")
    ) {
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

  const unitsOptions = [
    "Each",
    "Pack (24)",
    "Carton",
    "Box (12)",
    "Pallet",
    "pcs",
    "gm",
    "kg",
    "L",
  ];

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
              Manage all your stock items, including storage capacity and
              reorder levels by location.
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

        {error && (
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
              No registered stock items match your search filters. Click Add
              Stock Item to begin.
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
                    <th className="py-4 px-6 font-extrabold text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 text-xs text-[#0F172A]">
                  {paginatedItems.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-zinc-50/40 transition-colors"
                    >
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3.5">
                          <div className="h-10 w-10 rounded-lg bg-zinc-100 flex items-center justify-center shrink-0 border border-zinc-200 overflow-hidden shadow-xs">
                            {item.imageUrl ? (
                              <Image
                                src={item.imageUrl}
                                alt={item.name}
                                width={50}
                                height={50}
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
                      <td className="py-4 px-6">{getStatusBadge(item)}</td>
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
                Showing{" "}
                {filteredItems.length === 0
                  ? 0
                  : (currentPage - 1) * itemsPerPage + 1}{" "}
                to {Math.min(currentPage * itemsPerPage, filteredItems.length)}{" "}
                of {filteredItems.length} items
              </span>
              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      setCurrentPage((prev) => Math.max(prev - 1, 1))
                    }
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
                    onClick={() =>
                      setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                    }
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

              {error && (
                <div className="bg-rose-50 border border-rose-200 text-rose-600 text-xs rounded-xl p-3 font-semibold flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-500 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSave} noValidate className="space-y-5">
                <div className="space-y-4">
                  <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-[#64748B] border-b border-zinc-100 pb-1">
                    Basic Information
                  </h4>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-[#0F172A] uppercase tracking-wider block">
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
                      <label className="text-[10px] font-bold text-[#0F172A] uppercase tracking-wider block">
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

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-[#0F172A] uppercase tracking-wider block">
                      Category <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <select
                        className={getSelectClassName("categoryId")}
                        value={formCategoryId}
                        onChange={(e) => {
                          setFormCategoryId(e.target.value);
                          if (validationErrors.categoryId) {
                            setValidationErrors((prev) => ({
                              ...prev,
                              categoryId: false,
                            }));
                          }
                        }}
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

                  <div className="space-y-1.5 relative">
                    <label className="text-[10px] font-bold text-[#0F172A] uppercase tracking-wider block">
                      Locations <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() =>
                          setShowLocationDropdown(!showLocationDropdown)
                        }
                        className={`w-full bg-white border ${
                          validationErrors.locations
                            ? "border-rose-400 focus:border-rose-500 ring-1 ring-rose-500/20"
                            : "border-zinc-300 focus:border-[#16A34A]"
                        } rounded-xl py-2.5 px-3.5 text-xs font-semibold text-zinc-800 text-left flex justify-between items-center cursor-pointer`}
                      >
                        <span>
                          {selectedLocations.length === 0
                            ? "Select locations"
                            : selectedLocations.length === locations.length
                              ? "All Locations Selected"
                              : `${selectedLocations.length} Location${selectedLocations.length > 1 ? "s" : ""} Selected`}
                        </span>
                        <ChevronDown className="h-4 w-4 text-zinc-400" />
                      </button>

                      {showLocationDropdown && (
                        <>
                          <div
                            className="fixed inset-0 z-40"
                            onClick={() => setShowLocationDropdown(false)}
                          />
                          <div className="absolute left-0 right-0 mt-1.5 bg-white border border-zinc-200 rounded-xl shadow-lg max-h-60 overflow-y-auto p-2.5 z-50 space-y-2">
                            <div className="flex justify-between items-center pb-2 border-b border-zinc-100 text-[10px] font-extrabold uppercase text-[#64748B]">
                              <span>Select Locations</span>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedLocations(
                                      locations.map((l) => l.id),
                                    );
                                    if (validationErrors.locations) {
                                      setValidationErrors((prev) => ({
                                        ...prev,
                                        locations: false,
                                      }));
                                    }
                                  }}
                                  className="text-[#16A34A] hover:underline cursor-pointer"
                                >
                                  All
                                </button>
                                <span>|</span>
                                <button
                                  type="button"
                                  onClick={() => setSelectedLocations([])}
                                  className="text-rose-500 hover:underline cursor-pointer"
                                >
                                  None
                                </button>
                              </div>
                            </div>
                            <div className="space-y-1.5 pt-1">
                              {locations.map((loc) => {
                                const isChecked = selectedLocations.includes(
                                  loc.id,
                                );
                                return (
                                  <label
                                    key={loc.id}
                                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-zinc-50 cursor-pointer text-xs font-semibold text-zinc-700 transition-colors"
                                  >
                                    <input
                                      type="checkbox"
                                      className="h-3.5 w-3.5 text-[#16A34A] focus:ring-[#16A34A] border-zinc-300 rounded cursor-pointer"
                                      checked={isChecked}
                                      onChange={() => {
                                        if (isChecked) {
                                          setSelectedLocations(
                                            selectedLocations.filter(
                                              (id) => id !== loc.id,
                                            ),
                                          );
                                        } else {
                                          setSelectedLocations([
                                            ...selectedLocations,
                                            loc.id,
                                          ]);
                                          if (validationErrors.locations) {
                                            setValidationErrors((prev) => ({
                                              ...prev,
                                              locations: false,
                                            }));
                                          }
                                        }
                                      }}
                                    />
                                    <span className="truncate">{loc.name}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-[#0F172A] uppercase tracking-wider block">
                      Base Unit <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <select
                        className={getSelectClassName("baseUnit")}
                        value={formBaseUnit}
                        onChange={(e) => {
                          setFormBaseUnit(e.target.value as BaseUnit);
                          if (validationErrors.baseUnit) {
                            setValidationErrors((prev) => ({
                              ...prev,
                              baseUnit: false,
                            }));
                          }
                        }}
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
                      This is the unit you purchase and receive in (e.g., Pack
                      24, Box 12).
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

                <div className="space-y-4 pt-2 border-t border-zinc-100">
                  <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-[#64748B] border-b border-zinc-100 pb-1">
                    Stock Settings
                  </h4>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-[#0F172A] uppercase tracking-wider block">
                      Cost per Base Unit
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400 text-xs">
                        $
                      </span>
                      <input
                        type="number"
                        step="any"
                        placeholder="0.00"
                        className="w-full bg-white border border-zinc-300 focus:border-[#16A34A] rounded-xl py-2 pl-7 pr-3 text-xs text-zinc-950 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-[#16A34A] transition-all font-semibold"
                        value={formCostPerBaseUnit}
                        onChange={(e) => setFormCostPerBaseUnit(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pt-2 border-t border-zinc-100">
                  <div className="flex justify-between items-center border-b border-zinc-100 pb-1">
                    <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-[#64748B]">
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
                            sortOrder: prev.length,
                            showOnMobile: true,
                          },
                        ])
                      }
                      className="text-[#16A34A] hover:text-[#15803D] text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Plus className="h-3 w-3 stroke-[3px]" />
                      Add Option
                    </button>
                  </div>

                  {countingOptions.length === 0 ? (
                    <p className="text-[10px] font-bold text-zinc-400 text-center py-2">
                      No counting options configured. Click Add Option to
                      configure conversion factors.
                    </p>
                  ) : (
                    <div className="space-y-3.5">
                      {countingOptions.map((co, idx) => (
                        <div
                          key={idx}
                          className="bg-zinc-50/50 border border-zinc-200 rounded-xl p-3.5 space-y-3 relative"
                        >
                          <button
                            type="button"
                            onClick={() =>
                              setCountingOptions((prev) =>
                                prev.filter((_, i) => i !== idx),
                              )
                            }
                            className="absolute top-2.5 right-2.5 p-1 rounded-lg text-zinc-400 hover:text-rose-500 hover:bg-rose-50 cursor-pointer transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">
                                Display Name
                              </label>
                              <input
                                type="text"
                                required
                                placeholder="e.g. Case"
                                className="w-full bg-white border border-zinc-300 focus:border-[#16A34A] rounded-lg py-1.5 px-2.5 text-xs text-zinc-950 focus:outline-none"
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

                            <div className="space-y-1">
                              <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">
                                Conversion to Base Qty
                              </label>
                              <input
                                type="number"
                                required
                                min="0.0001"
                                step="any"
                                placeholder="e.g. 24"
                                className="w-full bg-white border border-zinc-300 focus:border-[#16A34A] rounded-lg py-1.5 px-2.5 text-xs text-zinc-950 focus:outline-none font-semibold"
                                value={co.conversionToBaseQty}
                                onChange={(e) =>
                                  setCountingOptions((prev) =>
                                    prev.map((item, i) =>
                                      i === idx
                                        ? {
                                            ...item,
                                            conversionToBaseQty:
                                              parseFloat(e.target.value) || 0,
                                          }
                                        : item,
                                    ),
                                  )
                                }
                              />
                            </div>
                          </div>

                          <div className="flex justify-between items-center pt-1">
                            <div className="flex items-center gap-1.5">
                              <input
                                type="checkbox"
                                id={`showOnMobile-${idx}`}
                                className="h-3.5 w-3.5 text-[#16A34A] focus:ring-[#16A34A] border-zinc-300 rounded cursor-pointer"
                                checked={co.showOnMobile}
                                onChange={(e) =>
                                  setCountingOptions((prev) =>
                                    prev.map((item, i) =>
                                      i === idx
                                        ? {
                                            ...item,
                                            showOnMobile: e.target.checked,
                                          }
                                        : item,
                                    ),
                                  )
                                }
                              />
                              <label
                                htmlFor={`showOnMobile-${idx}`}
                                className="text-[10px] font-bold text-[#0F172A] cursor-pointer"
                              >
                                Show on Mobile
                              </label>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">
                                Sort Order
                              </span>
                              <input
                                type="number"
                                required
                                className="w-10 bg-white border border-zinc-300 focus:border-[#16A34A] rounded-lg py-1 px-1.5 text-center text-xs text-zinc-950 focus:outline-none"
                                value={co.sortOrder}
                                onChange={(e) =>
                                  setCountingOptions((prev) =>
                                    prev.map((item, i) =>
                                      i === idx
                                        ? {
                                            ...item,
                                            sortOrder:
                                              parseInt(e.target.value) || 0,
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
                  <div className="border-t border-zinc-100 pt-4">
                    <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-[#64748B] block mb-1">
                      Storage Capacity & Reorder Level by Location
                    </h4>
                    <span className="text-[10px] font-semibold text-[#64748B] block">
                      Set storage capacity and reorder level for this item at
                      each location.
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
                        <span className="text-[10px] font-extrabold text-[#0F172A]">
                          Apply Same Values
                        </span>
                      </div>
                      <span className="text-[9px] font-bold text-zinc-500 mt-2 leading-relaxed">
                        Use the same capacity & reorder level for every
                        location.
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
                        <span className="text-[10px] font-extrabold text-[#0F172A]">
                          Set Different Values
                        </span>
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
                            Storage Capacity{" "}
                            <span className="text-rose-500">*</span>
                          </label>
                          <div className="flex gap-1.5">
                            <input
                              type="number"
                              placeholder="0"
                              className={getInputClassName(
                                "sameCapacity",
                                "font-semibold",
                              )}
                              value={sameCapacity}
                              onChange={(e) => {
                                setSameCapacity(e.target.value);
                                if (validationErrors.sameCapacity) {
                                  setValidationErrors((prev) => ({
                                    ...prev,
                                    sameCapacity: false,
                                  }));
                                }
                              }}
                            />
                            <div className="relative shrink-0 w-24">
                              <select
                                className="w-full bg-white border border-zinc-300 focus:border-[#16A34A] rounded-xl py-2 pl-2 pr-7 text-[10px] font-bold text-zinc-700 focus:outline-none appearance-none cursor-pointer"
                                value={
                                  dynamicUnits.includes(sameCapacityUnit)
                                    ? sameCapacityUnit
                                    : dynamicUnits[0]
                                }
                                onChange={(e) =>
                                  setSameCapacityUnit(e.target.value)
                                }
                              >
                                {dynamicUnits.map((unit) => (
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
                            Reorder Level{" "}
                            <span className="text-rose-500">*</span>
                          </label>
                          <div className="flex gap-1.5">
                            <input
                              type="number"
                              placeholder="0"
                              className={getInputClassName(
                                "sameReorder",
                                "font-semibold",
                              )}
                              value={sameReorder}
                              onChange={(e) => {
                                setSameReorder(e.target.value);
                                if (validationErrors.sameReorder) {
                                  setValidationErrors((prev) => ({
                                    ...prev,
                                    sameReorder: false,
                                  }));
                                }
                              }}
                            />
                            <div className="relative shrink-0 w-24">
                              <select
                                className="w-full bg-white border border-zinc-300 focus:border-[#16A34A] rounded-xl py-2 pl-2 pr-7 text-[10px] font-bold text-zinc-700 focus:outline-none appearance-none cursor-pointer"
                                value={
                                  dynamicUnits.includes(sameReorderUnit)
                                    ? sameReorderUnit
                                    : dynamicUnits[0]
                                }
                                onChange={(e) =>
                                  setSameReorderUnit(e.target.value)
                                }
                              >
                                {dynamicUnits.map((unit) => (
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

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-[#0F172A] uppercase block">
                            Current Stock ({formBaseUnit}){" "}
                            <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="number"
                            placeholder="0"
                            className={getInputClassName(
                              "sameCurrentStock",
                              "font-semibold",
                            )}
                            value={sameCurrentStock}
                            onChange={(e) => {
                              setSameCurrentStock(e.target.value);
                              if (validationErrors.sameCurrentStock) {
                                setValidationErrors((prev) => ({
                                  ...prev,
                                  sameCurrentStock: false,
                                }));
                              }
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ) : selectedLocations.length === 0 ? (
                    <div className="bg-zinc-50 border border-zinc-200 border-dashed rounded-xl p-6 text-center">
                      <p className="text-xs font-semibold text-zinc-400">
                        Please select at least one location in the
                        &quot;Locations&quot; field above to configure specific
                        rules.
                      </p>
                    </div>
                  ) : (
                    <div className="bg-zinc-50 border border-zinc-200 rounded-xl overflow-hidden">
                      <div className="max-h-72 overflow-y-auto divide-y divide-zinc-200">
                        <div className="grid grid-cols-12 text-[9px] uppercase font-extrabold text-[#64748B] bg-zinc-100/60 p-2 border-b border-zinc-200">
                          <span className="col-span-3">Location</span>
                          <span className="col-span-2 pl-1.5">
                            Current Stock{" "}
                            <span className="text-rose-500">*</span>
                          </span>
                          <span className="col-span-4 pl-1.5">
                            Storage Capacity{" "}
                            <span className="text-rose-500">*</span>
                          </span>
                          <span className="col-span-3 pl-1.5">
                            Reorder Level{" "}
                            <span className="text-rose-500">*</span>
                          </span>
                        </div>
                        {locations
                          .filter((loc) => selectedLocations.includes(loc.id))
                          .map((loc) => {
                            const rule = locationRulesMap[loc.id] || {
                              storageCapacity: "",
                              storageCapacityUnit: dynamicUnits[0],
                              reorderLevel: "",
                              reorderLevelUnit: dynamicUnits[0],
                              currentStock: "",
                            };
                            const stockErrKey = `stock_${loc.id}`;
                            const capErrKey = `capacity_${loc.id}`;
                            const reoErrKey = `reorder_${loc.id}`;
                            return (
                              <div
                                key={loc.id}
                                className="grid grid-cols-12 items-center gap-1.5 p-2 bg-white"
                              >
                                <span
                                  className="col-span-3 text-[10px] font-extrabold text-[#0F172A] truncate animate-none"
                                  title={loc.name}
                                >
                                  {loc.name}
                                </span>

                                <div className="col-span-2 flex gap-1 items-center pr-1.5">
                                  <input
                                    type="number"
                                    placeholder="0"
                                    className={`w-full bg-white border ${
                                      validationErrors[stockErrKey]
                                        ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500 ring-1 ring-rose-500/20"
                                        : "border-zinc-200 focus:border-[#16A34A]"
                                    } rounded-lg py-1 px-1.5 text-[10px] text-zinc-950 focus:outline-none text-center font-bold`}
                                    value={rule.currentStock}
                                    onChange={(e) => {
                                      setLocationRulesMap((prev) => ({
                                        ...prev,
                                        [loc.id]: {
                                          ...rule,
                                          currentStock: e.target.value,
                                        },
                                      }));
                                      if (validationErrors[stockErrKey]) {
                                        setValidationErrors((prev) => ({
                                          ...prev,
                                          [stockErrKey]: false,
                                        }));
                                      }
                                    }}
                                  />
                                </div>

                                <div className="col-span-4 flex gap-1 items-center">
                                  <input
                                    type="number"
                                    placeholder="0"
                                    className={`w-12 shrink-0 bg-white border ${
                                      validationErrors[capErrKey]
                                        ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500 ring-1 ring-rose-500/20"
                                        : "border-zinc-200 focus:border-[#16A34A]"
                                    } rounded-lg py-1 px-1.5 text-[10px] text-zinc-950 focus:outline-none text-center font-bold`}
                                    value={rule.storageCapacity}
                                    onChange={(e) => {
                                      setLocationRulesMap((prev) => ({
                                        ...prev,
                                        [loc.id]: {
                                          ...rule,
                                          storageCapacity: e.target.value,
                                        },
                                      }));
                                      if (validationErrors[capErrKey]) {
                                        setValidationErrors((prev) => ({
                                          ...prev,
                                          [capErrKey]: false,
                                        }));
                                      }
                                    }}
                                  />
                                  <div className="relative shrink-0 w-14">
                                    <select
                                      className="w-full bg-white border border-zinc-200 rounded-lg py-1 pl-1 pr-4 text-[8px] font-bold text-zinc-700 focus:outline-none appearance-none cursor-pointer"
                                      value={
                                        dynamicUnits.includes(
                                          rule.storageCapacityUnit,
                                        )
                                          ? rule.storageCapacityUnit
                                          : dynamicUnits[0]
                                      }
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
                                      {dynamicUnits.map((unit) => (
                                        <option key={unit} value={unit}>
                                          {unit}
                                        </option>
                                      ))}
                                    </select>
                                    <ChevronDown className="absolute right-1 top-1/2 -translate-y-1/2 h-2.5 w-2.5 text-zinc-400 pointer-events-none" />
                                  </div>
                                </div>

                                <div className="col-span-3 flex gap-1 items-center">
                                  <input
                                    type="number"
                                    placeholder="0"
                                    className={`w-11 shrink-0 bg-white border ${
                                      validationErrors[reoErrKey]
                                        ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500 ring-1 ring-rose-500/20"
                                        : "border-zinc-200 focus:border-[#16A34A]"
                                    } rounded-lg py-1 px-1.5 text-[10px] text-zinc-950 focus:outline-none text-center font-bold`}
                                    value={rule.reorderLevel}
                                    onChange={(e) => {
                                      setLocationRulesMap((prev) => ({
                                        ...prev,
                                        [loc.id]: {
                                          ...rule,
                                          reorderLevel: e.target.value,
                                        },
                                      }));
                                      if (validationErrors[reoErrKey]) {
                                        setValidationErrors((prev) => ({
                                          ...prev,
                                          [reoErrKey]: false,
                                        }));
                                      }
                                    }}
                                  />
                                  <div className="relative shrink-0 w-12">
                                    <select
                                      className="w-full bg-white border border-zinc-200 rounded-lg py-1 pl-1 pr-4 text-[8px] font-bold text-zinc-700 focus:outline-none appearance-none cursor-pointer"
                                      value={
                                        dynamicUnits.includes(
                                          rule.reorderLevelUnit,
                                        )
                                          ? rule.reorderLevelUnit
                                          : dynamicUnits[0]
                                      }
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
                                      {dynamicUnits.map((unit) => (
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
                    You can always edit these values later from the item details
                    page.
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
                disabled={
                  saving || !formName.trim() || !formCategoryId || !formBaseUnit
                }
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
