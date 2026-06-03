"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useBusinessStore } from "@/store/business-store";
import { getSuppliers } from "@/lib/repositories/supplier.repository";
import { getLocations } from "@/lib/repositories/location.repository";
import { getPurchaseOrders } from "@/lib/repositories/purchase-order.repository";
import {
  getDeliveries,
  getDelivery,
  createDelivery,
} from "@/lib/repositories/delivery.repository";
import { Supplier, PurchaseOrder, Delivery, Location } from "@/types/inventory";
import {
  PackageOpen,
  Search,
  ChevronDown,
  Plus,
  Loader2,
  Clock,
  X,
  FileText,
  DollarSign,
  Download,
  Filter,
  Check,
  Building,
} from "lucide-react";

export default function DeliveriesPage() {
  const { activeBusinessId } = useBusinessStore();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSupplierFilter, setSelectedSupplierFilter] = useState("all");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("all");
  const [startDateFilter, setStartDateFilter] = useState("");
  const [endDateFilter, setEndDateFilter] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [panelMode, setPanelMode] = useState<"new" | "view">("new");

  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [selectedLocationId, setSelectedLocationId] = useState("");
  const [selectedPOId, setSelectedPOId] = useState("");
  const [notes, setNotes] = useState("");

  const [deliveryItemsInput, setDeliveryItemsInput] = useState<
    {
      stockItemId: string;
      stockItemName: string;
      sku: string;
      orderedQuantity: number;
      receivedQuantity: number;
      unitCost: number;
    }[]
  >([]);

  const [viewingDelivery, setViewingDelivery] = useState<Delivery | null>(null);

  async function loadData() {
    if (!activeBusinessId) return;
    try {
      setLoading(true);
      setError(null);

      const [dList, poList, sList, locsList] = await Promise.all([
        getDeliveries(activeBusinessId),
        getPurchaseOrders(activeBusinessId),
        getSuppliers(activeBusinessId),
        getLocations(activeBusinessId),
      ]);

      setDeliveries(dList);
      setPurchaseOrders(poList);
      setSuppliers(sList.filter((s) => s.isActive !== false));
      setLocations(locsList.filter((l) => l.isActive !== false));
    } catch (err) {
      console.error(err);
      setError("Failed to load deliveries data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [activeBusinessId]);

  const activeSupplierPOs = purchaseOrders.filter((po) => {
    const belongsToSupplier = po.supplierId === selectedSupplierId;
    const belongsToLocation =
      !selectedLocationId || po.locationId === selectedLocationId;
    const isSent = po.status === "sent";
    const notYetReceived = !deliveries.some((d) => d.purchaseOrderId === po.id);
    return belongsToSupplier && belongsToLocation && isSent && notYetReceived;
  });

  const handlePOSelect = (poId: string) => {
    setSelectedPOId(poId);
    if (!poId) {
      setDeliveryItemsInput([]);
      return;
    }

    const selectedPO = purchaseOrders.find((p) => p.id === poId);
    if (!selectedPO) return;

    const mappedItems = selectedPO.items.map((item) => ({
      stockItemId: item.stockItemId,
      stockItemName: item.stockItemName || "Unknown Item",
      sku: item.sku || "",
      orderedQuantity: item.quantity,
      receivedQuantity: item.quantity,
      unitCost: item.unitCost,
    }));

    setDeliveryItemsInput(mappedItems);
  };

  const handleReceivedQtyChange = (index: number, val: string) => {
    const parsedVal = val === "" ? 0 : Math.max(0, parseFloat(val) || 0);
    setDeliveryItemsInput((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        receivedQuantity: parsedVal,
      };
      return updated;
    });
  };

  const handleToggleReceivedAll = (index: number, isChecked: boolean) => {
    setDeliveryItemsInput((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        receivedQuantity: isChecked ? updated[index].orderedQuantity : 0,
      };
      return updated;
    });
  };

  const handleViewDelivery = async (dId: string) => {
    try {
      setViewingDelivery(null);
      setPanelMode("view");
      setIsPanelOpen(true);
      if (!activeBusinessId) return;
      const detail = await getDelivery(activeBusinessId, dId);
      setViewingDelivery(detail);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load delivery details.");
      setIsPanelOpen(false);
    }
  };

  const handleConfirmAndReceive = async () => {
    if (!activeBusinessId || !selectedPOId) return;
    try {
      setSaving(true);
      setError(null);

      const itemsPayload = deliveryItemsInput.map((item) => ({
        stockItemId: item.stockItemId,
        orderedQuantity: item.orderedQuantity,
        receivedQuantity: item.receivedQuantity,
        unitCost: item.unitCost,
      }));

      await createDelivery(activeBusinessId, {
        purchaseOrderId: selectedPOId,
        notes: notes.trim() || undefined,
        items: itemsPayload,
      });

      toast.success("Delivery confirmed and inventory levels updated successfully!");
      setIsPanelOpen(false);

      setSelectedSupplierId("");
      setSelectedLocationId("");
      setSelectedPOId("");
      setNotes("");
      setDeliveryItemsInput([]);

      await loadData();
    } catch (err: any) {
      console.error(err);
      toast.error(
        err.response?.data?.detail || "Failed to confirm and receive delivery.",
      );
    } finally {
      setSaving(false);
    }
  };

  const openNewDeliveryPanel = () => {
    setPanelMode("new");
    setSelectedSupplierId("");
    setSelectedLocationId("");
    setSelectedPOId("");
    setNotes("");
    setDeliveryItemsInput([]);
    setIsPanelOpen(true);
  };

  const filteredDeliveries = deliveries.filter((d) => {
    const matchesSearch =
      d.deliveryNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.poNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.supplierName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesSupplier =
      selectedSupplierFilter === "all" ||
      d.supplierId === selectedSupplierFilter;

    const matchesStatus =
      selectedStatusFilter === "all" || d.status === selectedStatusFilter;

    let matchesDate = true;
    if (startDateFilter || endDateFilter) {
      const dDate = new Date(d.deliveryDate);
      if (startDateFilter) {
        const start = new Date(startDateFilter);
        start.setHours(0, 0, 0, 0);
        if (dDate < start) matchesDate = false;
      }
      if (endDateFilter) {
        const end = new Date(endDateFilter);
        end.setHours(23, 59, 59, 999);
        if (dDate > end) matchesDate = false;
      }
    }

    return matchesSearch && matchesSupplier && matchesStatus && matchesDate;
  });

  const totalDeliveriesCount = filteredDeliveries.length;
  const totalPages = Math.max(
    1,
    Math.ceil(totalDeliveriesCount / itemsPerPage),
  );
  const paginatedDeliveries = filteredDeliveries.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const selectedPO = purchaseOrders.find((p) => p.id === selectedPOId);

  const calculatedSummary = deliveryItemsInput.reduce(
    (acc, item) => {
      const totalOrdered = acc.totalOrdered + item.orderedQuantity;
      const totalReceived = acc.totalReceived + item.receivedQuantity;
      const totalValue = acc.totalValue + item.receivedQuantity * item.unitCost;
      const variance = totalReceived - totalOrdered;
      return { totalOrdered, totalReceived, totalValue, variance };
    },
    { totalOrdered: 0, totalReceived: 0, totalValue: 0, variance: 0 },
  );

  const overallStats = deliveries.reduce(
    (acc, d) => {
      const totalCount = acc.totalCount + 1;
      const totalVal = acc.totalVal + d.totalAmount;
      return { totalCount, totalVal };
    },
    { totalCount: 0, totalVal: 0 },
  );

  const pendingPOsCount = purchaseOrders.filter((po) => {
    const isSent = po.status === "sent";
    const notYetReceived = !deliveries.some((d) => d.purchaseOrderId === po.id);
    return isSent && notYetReceived;
  }).length;

  const totalItemsReceivedCount = deliveries.reduce((acc, d) => {
    return (
      acc +
      (d.items || []).reduce((sum, item) => sum + item.receivedQuantity, 0)
    );
  }, 0);

  if (loading && deliveries.length === 0) {
    return (
      <div className="min-h-[75vh] flex flex-col items-center justify-center bg-white text-[#0F172A]">
        <Loader2 className="h-8 w-8 text-[#16A34A] animate-spin mb-4" />
        <p className="text-[#64748B] text-xs font-bold uppercase tracking-wider">
          Syncing delivery records...
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 bg-white min-h-[85vh] relative">
      <div className="flex-1 min-w-0 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-zinc-200 pb-5">
          <div>
            <h1 className="text-3xl font-extrabold text-[#0F172A] tracking-tight">
              Deliveries
            </h1>
            <p className="text-[#64748B] text-xs font-bold mt-1.5">
              Receive items against purchase orders and update inventory.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button className="border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 rounded-xl px-4 py-2.5 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-xs">
              <Download className="h-4 w-4 text-zinc-400" />
              Export
              <ChevronDown className="h-3 w-3 text-zinc-400" />
            </button>
            <button
              onClick={openNewDeliveryPanel}
              className="bg-[#16A34A] hover:bg-[#15803D] text-white rounded-xl px-5 py-2.5 text-xs font-bold uppercase tracking-wider shadow-sm flex items-center gap-2 cursor-pointer transition-all duration-200"
            >
              <Plus className="h-4 w-4 stroke-[3px]" />
              Receive Delivery
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-zinc-50/50 border border-zinc-200 rounded-2xl p-4.5 flex items-center gap-4 shadow-xs">
            <div className="h-10 w-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
              <Building className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                Total Deliveries
              </p>
              <h3 className="text-xl font-extrabold text-[#0F172A] mt-0.5">
                {overallStats.totalCount}
              </h3>
              <p className="text-[9px] text-[#64748B] font-bold mt-0.5">
                This Month
              </p>
            </div>
          </div>

          <div className="bg-zinc-50/50 border border-zinc-200 rounded-2xl p-4.5 flex items-center gap-4 shadow-xs">
            <div className="h-10 w-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center shrink-0">
              <PackageOpen className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                Total Items Received
              </p>
              <h3 className="text-xl font-extrabold text-[#0F172A] mt-0.5">
                {totalItemsReceivedCount.toLocaleString()}
              </h3>
              <p className="text-[9px] text-[#64748B] font-bold mt-0.5">
                Base Units
              </p>
            </div>
          </div>

          <div className="bg-zinc-50/50 border border-zinc-200 rounded-2xl p-4.5 flex items-center gap-4 shadow-xs">
            <div className="h-10 w-10 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center shrink-0">
              <DollarSign className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                Total Value
              </p>
              <h3 className="text-xl font-extrabold text-[#0F172A] mt-0.5">
                $
                {overallStats.totalVal.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </h3>
              <p className="text-[9px] text-[#64748B] font-bold mt-0.5">
                This Month
              </p>
            </div>
          </div>

          <div className="bg-zinc-50/50 border border-zinc-200 rounded-2xl p-4.5 flex items-center gap-4 shadow-xs">
            <div className="h-10 w-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                Pending Deliveries
              </p>
              <h3 className="text-xl font-extrabold text-[#0F172A] mt-0.5">
                {pendingPOsCount}
              </h3>
              <p className="text-[9px] text-[#64748B] font-bold mt-0.5">
                Awaiting Receipt
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3.5 bg-zinc-50/50 p-4 rounded-2xl border border-zinc-200">
          <div className="flex-1 min-w-[200px] relative">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
              <Search className="h-4 w-4" />
            </span>
            <input
              type="text"
              placeholder="Quick Find..."
              className="w-full bg-white border border-zinc-200 focus:border-[#16A34A] rounded-xl py-2 pl-9 pr-4 text-xs text-zinc-950 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-[#16A34A] transition-all shadow-xs"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          <div className="relative min-w-[150px]">
            <select
              className="w-full bg-white border border-zinc-200 rounded-xl py-2 pl-3.5 pr-8 text-xs font-bold text-zinc-700 focus:outline-none focus:border-[#16A34A] appearance-none cursor-pointer shadow-xs"
              value={selectedSupplierFilter}
              onChange={(e) => {
                setSelectedSupplierFilter(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="all">All Suppliers</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400 pointer-events-none" />
          </div>

          <div className="flex items-center gap-2 bg-white border border-zinc-200 rounded-xl px-3 py-1.5 shadow-xs">
            <input
              type="date"
              className="bg-transparent border-none text-xs text-zinc-700 font-bold focus:outline-none cursor-pointer"
              value={startDateFilter}
              onChange={(e) => {
                setStartDateFilter(e.target.value);
                setCurrentPage(1);
              }}
            />
            <span className="text-zinc-300 text-xs font-bold">-</span>
            <input
              type="date"
              className="bg-transparent border-none text-xs text-zinc-700 font-bold focus:outline-none cursor-pointer"
              value={endDateFilter}
              onChange={(e) => {
                setEndDateFilter(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          <div className="relative min-w-[140px]">
            <select
              className="w-full bg-white border border-zinc-200 rounded-xl py-2 pl-3.5 pr-8 text-xs font-bold text-zinc-700 focus:outline-none focus:border-[#16A34A] appearance-none cursor-pointer shadow-xs"
              value={selectedStatusFilter}
              onChange={(e) => {
                setSelectedStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="all">All Statuses</option>
              <option value="Received">Received</option>
              <option value="Partially Received">Partially Received</option>
              <option value="Missing">Missing</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400 pointer-events-none" />
          </div>

          <button className="border border-zinc-200 hover:bg-zinc-50 bg-white text-zinc-700 rounded-xl px-4 py-2 text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer">
            <Filter className="h-4 w-4 text-zinc-400" />
            Filters
          </button>
        </div>

        <div className="bg-white border border-zinc-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-200 text-[10px] uppercase font-extrabold tracking-wider text-[#64748B] bg-zinc-50/50">
                  <th className="py-4 px-6">Delivery No.</th>
                  <th className="py-4 px-6">PO No.</th>
                  <th className="py-4 px-6">Supplier</th>
                  <th className="py-4 px-6">Delivery Date</th>
                  <th className="py-4 px-6 text-center">Items</th>
                  <th className="py-4 px-6 text-right">Total Value (AUD)</th>
                  <th className="py-4 px-6 text-center">Status</th>
                  <th className="py-4 px-6 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 text-xs text-[#0F172A]">
                {paginatedDeliveries.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-16 px-6 text-center">
                      <div className="flex flex-col items-center justify-center max-w-md mx-auto">
                        <div className="h-12 w-12 rounded-2xl bg-zinc-50 border border-zinc-100 flex items-center justify-center mb-3 shadow-xs">
                          <PackageOpen className="h-6 w-6 text-zinc-400 stroke-[1.5]" />
                        </div>
                        <h3 className="text-sm font-extrabold text-[#0F172A]">
                          No delivery records
                        </h3>
                        <p className="text-zinc-500 text-xs mt-1 font-semibold leading-relaxed">
                          {searchQuery ||
                          selectedSupplierFilter !== "all" ||
                          selectedStatusFilter !== "all"
                            ? "No deliveries match your active filter settings."
                            : "There are no confirmed deliveries recorded yet for this business."}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedDeliveries.map((d) => {
                    const statusColors =
                      d.status === "Received"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : d.status === "Partially Received"
                          ? "bg-blue-50 text-blue-700 border-blue-200"
                          : "bg-rose-50 text-rose-700 border-rose-200";

                    const formattedDate = new Date(
                      d.deliveryDate,
                    ).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    });

                    return (
                      <tr
                        key={d.id}
                        className="hover:bg-zinc-50/40 transition-colors"
                      >
                        <td className="py-4 px-6 font-extrabold text-[#0F172A]">
                          {d.deliveryNumber}
                        </td>
                        <td className="py-4 px-6 font-bold text-zinc-500 uppercase">
                          {d.poNumber}
                        </td>
                        <td className="py-4 px-6 font-bold text-zinc-700">
                          {d.supplierName}
                        </td>
                        <td className="py-4 px-6 font-semibold text-zinc-500">
                          {formattedDate}
                        </td>
                        <td className="py-4 px-6 text-center font-bold text-zinc-800">
                          {d.itemsCount}
                        </td>
                        <td className="py-4 px-6 text-right font-extrabold text-[#0F172A]">
                          $
                          {d.totalAmount.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </td>
                        <td className="py-4 px-6 text-center">
                          <span
                            className={`px-2.5 py-1 rounded-md font-bold text-[10px] uppercase tracking-wider inline-flex items-center gap-1 border ${statusColors}`}
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-current" />
                            {d.status}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-center">
                          <button
                            onClick={() => handleViewDelivery(d.id)}
                            className="border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 rounded-lg px-2.5 py-1 text-xs font-bold shadow-2xs transition-all cursor-pointer inline-flex items-center"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="bg-zinc-50/50 border-t border-zinc-200 px-6 py-4 flex items-center justify-between">
            <span className="text-[11px] font-bold text-zinc-500">
              Showing{" "}
              {filteredDeliveries.length > 0
                ? (currentPage - 1) * itemsPerPage + 1
                : 0}{" "}
              to{" "}
              {Math.min(currentPage * itemsPerPage, filteredDeliveries.length)}{" "}
              of {filteredDeliveries.length} deliveries
            </span>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-1 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-600 disabled:opacity-40 disabled:hover:bg-white cursor-pointer"
              >
                <X
                  className="h-4 w-4 rotate-180 shrink-0"
                  style={{ transform: "rotate(90deg)" }}
                />
              </button>

              {Array.from({ length: totalPages }).map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentPage(idx + 1)}
                  className={`h-7 w-7 rounded-lg text-xs font-extrabold border transition-all ${
                    currentPage === idx + 1
                      ? "bg-[#16A34A] text-white border-[#16A34A]"
                      : "bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50"
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
                className="p-1 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-600 disabled:opacity-40 disabled:hover:bg-white cursor-pointer"
              >
                <X
                  className="h-4 w-4 shrink-0"
                  style={{ transform: "rotate(-90deg)" }}
                />
              </button>
            </div>
          </div>
        </div>
      </div>

      {isPanelOpen && (
        <div className="w-full lg:w-[480px] xl:w-[540px] shrink-0 border border-zinc-200 bg-zinc-50/50 rounded-2xl overflow-hidden flex flex-col h-fit sticky top-6 shadow-sm">
          <div className="bg-white border-b border-zinc-200 px-5 py-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-extrabold text-[#0F172A]">
                {panelMode === "new"
                  ? "Receive Delivery"
                  : `View Delivery - ${viewingDelivery?.deliveryNumber || "..."}`}
              </h2>
              <p className="text-[10px] text-zinc-400 font-semibold mt-0.5">
                {panelMode === "new"
                  ? "Receive items against a purchase order."
                  : "Detailed record of received delivery."}
              </p>
            </div>
            <button
              onClick={() => setIsPanelOpen(false)}
              className="p-1 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-5 max-h-[75vh]">
            {panelMode === "new" ? (
              <>
                <div className="bg-white border border-zinc-200 rounded-xl p-4 space-y-4">
                  <div className="flex items-center gap-2 pb-2.5 border-b border-zinc-100">
                    <span className="h-5 w-5 rounded-full bg-[#16A34A] text-white font-extrabold text-[10px] flex items-center justify-center">
                      1
                    </span>
                    <h3 className="text-xs font-extrabold text-[#0F172A] uppercase tracking-wider">
                      Select Purchase Order
                    </h3>
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-wider block">
                        Supplier *
                      </label>
                      <div className="relative">
                        <select
                          className="w-full bg-white border border-zinc-200 rounded-xl py-2 px-3 pr-8 text-xs font-bold text-zinc-700 focus:outline-none focus:border-[#16A34A] appearance-none cursor-pointer shadow-xs"
                          value={selectedSupplierId}
                          onChange={(e) => {
                            setSelectedSupplierId(e.target.value);
                            setSelectedPOId("");
                            setDeliveryItemsInput([]);
                          }}
                        >
                          <option value="">Select a Supplier</option>
                          {suppliers.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400 pointer-events-none" />
                      </div>
                    </div>

                    {selectedSupplierId && (
                      <div className="space-y-1">
                        <label className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-wider block">
                          Location
                        </label>
                        <div className="relative">
                          <select
                            className="w-full bg-white border border-zinc-200 rounded-xl py-2 px-3 pr-8 text-xs font-bold text-zinc-700 focus:outline-none focus:border-[#16A34A] appearance-none cursor-pointer shadow-xs"
                            value={selectedLocationId}
                            onChange={(e) => {
                              setSelectedLocationId(e.target.value);
                              setSelectedPOId("");
                              setDeliveryItemsInput([]);
                            }}
                          >
                            <option value="">All Locations / None</option>
                            {locations.map((loc) => (
                              <option key={loc.id} value={loc.id}>
                                {loc.name}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400 pointer-events-none" />
                        </div>
                      </div>
                    )}

                    {selectedSupplierId && (
                      <div className="space-y-1">
                        <label className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-wider block">
                          Purchase Order *
                        </label>
                        <div className="relative">
                          <select
                            className="w-full bg-white border border-zinc-200 rounded-xl py-2 px-3 pr-8 text-xs font-bold text-zinc-700 focus:outline-none focus:border-[#16A34A] appearance-none cursor-pointer shadow-xs"
                            value={selectedPOId}
                            onChange={(e) => handlePOSelect(e.target.value)}
                          >
                            <option value="">Select a Purchase Order</option>
                            {activeSupplierPOs.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.poNumber}{" "}
                                {p.locationName ? `(${p.locationName})` : ""}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400 pointer-events-none" />
                        </div>
                      </div>
                    )}

                    {selectedPO && (
                      <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-3 text-[10px] font-bold text-zinc-500 space-y-1">
                        <div className="flex justify-between">
                          <span>PO Date:</span>
                          <span className="text-zinc-800">
                            {new Date(selectedPO.createdAt).toLocaleDateString(
                              "en-GB",
                              {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              },
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Expected:</span>
                          <span className="text-zinc-800">
                            {new Date(
                              new Date(selectedPO.createdAt).getTime() +
                                86400000,
                            ).toLocaleDateString("en-GB", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                        <div className="flex justify-between border-t border-zinc-200/60 pt-1 mt-1 text-[11px]">
                          <span>PO Total:</span>
                          <span className="text-[#16A34A] font-extrabold">
                            $
                            {selectedPO.totalAmount.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {deliveryItemsInput.length > 0 && (
                  <div className="bg-white border border-zinc-200 rounded-xl p-4 space-y-4">
                    <div className="flex justify-between items-center pb-2.5 border-b border-zinc-100">
                      <div className="flex items-center gap-2">
                        <span className="h-5 w-5 rounded-full bg-[#16A34A] text-white font-extrabold text-[10px] flex items-center justify-center">
                          2
                        </span>
                        <h3 className="text-xs font-extrabold text-[#0F172A] uppercase tracking-wider">
                          PO Items
                        </h3>
                      </div>
                      <span className="text-[10px] font-extrabold text-zinc-400">
                        {deliveryItemsInput.length} items • $
                        {selectedPO?.totalAmount.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>

                    <div className="border border-zinc-200 rounded-xl overflow-hidden">
                      <table className="w-full text-left border-collapse text-[11px]">
                        <thead>
                          <tr className="border-b border-zinc-200 text-[9px] uppercase font-extrabold tracking-wider text-zinc-400 bg-zinc-50/50">
                            <th className="py-2.5 px-3 w-8 text-center">#</th>
                            <th className="py-2.5 px-2">Item</th>
                            <th className="py-2.5 px-2 text-center">Ordered</th>
                            <th className="py-2.5 px-2 text-center w-20">
                              Received
                            </th>
                            <th className="py-2.5 px-2 text-right">
                              Unit Price
                            </th>
                            <th className="py-2.5 px-2 text-right">Total</th>
                            <th className="py-2.5 px-3 text-center w-12">
                              Recv (All)
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 font-bold text-zinc-700 bg-white">
                          {deliveryItemsInput.map((item, idx) => {
                            const totalVal =
                              item.receivedQuantity * item.unitCost;
                            const isAllReceived =
                              item.receivedQuantity === item.orderedQuantity;

                            return (
                              <tr
                                key={item.stockItemId}
                                className="hover:bg-zinc-50/20"
                              >
                                <td className="py-3 px-3 text-center text-zinc-400 font-bold">
                                  {idx + 1}
                                </td>
                                <td className="py-3 px-2">
                                  <p className="font-extrabold text-[#0F172A] leading-tight truncate max-w-[100px]">
                                    {item.stockItemName}
                                  </p>
                                  <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider mt-0.5">
                                    {item.sku || "NO SKU"}
                                  </p>
                                </td>
                                <td className="py-3 px-2 text-center font-bold text-zinc-500">
                                  {item.orderedQuantity}
                                </td>
                                <td className="py-2 px-1 text-center">
                                  <input
                                    type="number"
                                    min="0"
                                    step="any"
                                    className={`w-16 bg-white border rounded-lg py-1 px-1.5 text-center text-[11px] font-extrabold focus:outline-none focus:ring-1 ${
                                      isAllReceived
                                        ? "border-zinc-200 focus:border-[#16A34A] focus:ring-[#16A34A]"
                                        : "border-[#16A34A] text-[#16A34A] focus:border-[#16A34A] focus:ring-[#16A34A]"
                                    }`}
                                    value={
                                      item.receivedQuantity === 0 &&
                                      item.orderedQuantity !== 0
                                        ? ""
                                        : item.receivedQuantity
                                    }
                                    placeholder="0"
                                    onChange={(e) =>
                                      handleReceivedQtyChange(
                                        idx,
                                        e.target.value,
                                      )
                                    }
                                  />
                                </td>
                                <td className="py-3 px-2 text-right text-zinc-500 font-bold">
                                  ${item.unitCost.toFixed(2)}
                                </td>
                                <td className="py-3 px-2 text-right font-extrabold text-[#0F172A]">
                                  ${totalVal.toFixed(2)}
                                </td>
                                <td className="py-2 px-3 text-center">
                                  <button
                                    onClick={() =>
                                      handleToggleReceivedAll(
                                        idx,
                                        !isAllReceived,
                                      )
                                    }
                                    className={`h-4.5 w-4.5 rounded flex items-center justify-center transition-all ${
                                      isAllReceived
                                        ? "bg-[#16A34A] text-white border border-[#16A34A]"
                                        : "bg-white border border-zinc-300 hover:border-zinc-400 text-transparent"
                                    }`}
                                  >
                                    <Check className="h-3 w-3 stroke-[3px]" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {deliveryItemsInput.length > 0 && (
                  <div className="bg-white border border-zinc-200 rounded-xl p-4 space-y-4">
                    <div className="flex items-center gap-2 pb-2.5 border-b border-zinc-100">
                      <span className="h-5 w-5 rounded-full bg-[#16A34A] text-white font-extrabold text-[10px] flex items-center justify-center">
                        3
                      </span>
                      <h3 className="text-xs font-extrabold text-[#0F172A] uppercase tracking-wider">
                        Summary
                      </h3>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-2.5 text-center">
                        <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">
                          Total Ordered
                        </p>
                        <h4 className="text-sm font-extrabold text-[#0F172A] mt-1">
                          {calculatedSummary.totalOrdered}
                        </h4>
                        <p className="text-[8px] font-bold text-zinc-400 uppercase tracking-wider mt-0.5">
                          Base Units
                        </p>
                      </div>

                      <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-2.5 text-center">
                        <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">
                          Total Received
                        </p>
                        <h4 className="text-sm font-extrabold text-[#0F172A] mt-1">
                          {calculatedSummary.totalReceived}
                        </h4>
                        <p className="text-[8px] font-bold text-zinc-400 uppercase tracking-wider mt-0.5">
                          Base Units
                        </p>
                      </div>

                      <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-2.5 text-center">
                        <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">
                          Total Value
                        </p>
                        <h4 className="text-sm font-extrabold text-[#16A34A] mt-1">
                          ${calculatedSummary.totalValue.toFixed(2)}
                        </h4>
                        <p className="text-[8px] font-bold text-zinc-400 uppercase tracking-wider mt-0.5">
                          AUD
                        </p>
                      </div>

                      <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-2.5 text-center">
                        <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">
                          Variance
                        </p>
                        <h4
                          className={`text-sm font-extrabold mt-1 ${
                            calculatedSummary.variance < 0
                              ? "text-rose-600"
                              : calculatedSummary.variance > 0
                                ? "text-emerald-600"
                                : "text-zinc-600"
                          }`}
                        >
                          {calculatedSummary.variance > 0 ? "+" : ""}
                          {calculatedSummary.variance}
                        </h4>
                        <p className="text-[8px] font-bold text-zinc-400 uppercase tracking-wider mt-0.5">
                          Base Units
                        </p>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-[10px] font-extrabold uppercase tracking-wider text-zinc-500">
                        <span>Notes (Optional)</span>
                        <span className="text-[9px] font-bold text-zinc-400">
                          {notes.length}/250
                        </span>
                      </div>
                      <textarea
                        maxLength={250}
                        placeholder="Enter notes..."
                        className="w-full bg-white border border-zinc-200 focus:border-[#16A34A] rounded-xl p-3 text-xs font-bold text-zinc-700 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-[#16A34A] transition-all min-h-[70px] resize-none"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </>
            ) : viewingDelivery ? (
              <>
                <div className="bg-white border border-zinc-200 rounded-xl p-4 space-y-3.5">
                  <div className="flex items-center gap-2 pb-2.5 border-b border-zinc-100">
                    <FileText className="h-4.5 w-4.5 text-zinc-400" />
                    <h3 className="text-xs font-extrabold text-[#0F172A] uppercase tracking-wider">
                      Delivery Information
                    </h3>
                  </div>

                  <div className="grid grid-cols-2 gap-y-3 text-[11px] font-bold text-zinc-500">
                    <div>
                      <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">
                        Supplier
                      </p>
                      <p className="text-zinc-800 font-extrabold mt-0.5">
                        {viewingDelivery.supplierName}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">
                        PO Number
                      </p>
                      <p className="text-zinc-800 font-extrabold mt-0.5 uppercase">
                        {viewingDelivery.poNumber}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">
                        Delivery Date
                      </p>
                      <p className="text-zinc-800 font-extrabold mt-0.5">
                        {new Date(
                          viewingDelivery.deliveryDate,
                        ).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">
                        Fulfillment Status
                      </p>
                      <span
                        className={`inline-flex items-center gap-1 text-[9px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-md border mt-1 ${
                          viewingDelivery.status === "Received"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : viewingDelivery.status === "Partially Received"
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : "bg-rose-50 text-rose-700 border-rose-200"
                        }`}
                      >
                        {viewingDelivery.status}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-zinc-200 rounded-xl p-4 space-y-3">
                  <div className="flex justify-between items-center pb-2.5 border-b border-zinc-100">
                    <h3 className="text-xs font-extrabold text-[#0F172A] uppercase tracking-wider">
                      Received Items
                    </h3>
                    <span className="text-[10px] font-extrabold text-zinc-400">
                      {viewingDelivery.items.length} items
                    </span>
                  </div>

                  <div className="border border-zinc-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left border-collapse text-[11px]">
                      <thead>
                        <tr className="border-b border-zinc-200 text-[9px] uppercase font-extrabold tracking-wider text-zinc-400 bg-zinc-50/50">
                          <th className="py-2.5 px-3 w-8 text-center">#</th>
                          <th className="py-2.5 px-2">Item</th>
                          <th className="py-2.5 px-2 text-center">Ordered</th>
                          <th className="py-2.5 px-2 text-center">Received</th>
                          <th className="py-2.5 px-2 text-right">Unit Price</th>
                          <th className="py-2.5 px-3 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 font-bold text-zinc-700 bg-white">
                        {viewingDelivery.items.map((item, idx) => {
                          const isFullyReceived =
                            item.receivedQuantity === item.orderedQuantity;

                          return (
                            <tr key={item.id} className="hover:bg-zinc-50/10">
                              <td className="py-3 px-3 text-center text-zinc-400 font-bold">
                                {idx + 1}
                              </td>
                              <td className="py-3 px-2">
                                <p className="font-extrabold text-[#0F172A] leading-tight">
                                  {item.stockItemName}
                                </p>
                                <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider mt-0.5">
                                  {item.sku || "NO SKU"}
                                </p>
                              </td>
                              <td className="py-3 px-2 text-center font-bold text-zinc-500">
                                {item.orderedQuantity}
                              </td>
                              <td
                                className={`py-3 px-2 text-center font-extrabold ${
                                  isFullyReceived
                                    ? "text-zinc-700"
                                    : "text-[#16A34A]"
                                }`}
                              >
                                {item.receivedQuantity}
                              </td>
                              <td className="py-3 px-2 text-right text-zinc-500 font-bold">
                                ${item.unitCost.toFixed(2)}
                              </td>
                              <td className="py-3 px-3 text-right font-extrabold text-[#0F172A]">
                                ${item.totalCost.toFixed(2)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="bg-white border border-zinc-200 rounded-xl p-4 space-y-4">
                  <h3 className="text-xs font-extrabold text-[#0F172A] uppercase tracking-wider pb-2 border-b border-zinc-100">
                    Fulfillment Summary
                  </h3>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-2.5 text-center">
                      <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">
                        Total Ordered
                      </p>
                      <h4 className="text-sm font-extrabold text-[#0F172A] mt-1">
                        {viewingDelivery.items.reduce(
                          (sum, item) => sum + item.orderedQuantity,
                          0,
                        )}
                      </h4>
                      <p className="text-[8px] font-bold text-zinc-400 uppercase tracking-wider mt-0.5">
                        Base Units
                      </p>
                    </div>

                    <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-2.5 text-center">
                      <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">
                        Total Received
                      </p>
                      <h4 className="text-sm font-extrabold text-[#0F172A] mt-1">
                        {viewingDelivery.items.reduce(
                          (sum, item) => sum + item.receivedQuantity,
                          0,
                        )}
                      </h4>
                      <p className="text-[8px] font-bold text-zinc-400 uppercase tracking-wider mt-0.5">
                        Base Units
                      </p>
                    </div>

                    <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-2.5 text-center">
                      <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">
                        Total Value
                      </p>
                      <h4 className="text-sm font-extrabold text-[#16A34A] mt-1">
                        ${viewingDelivery.totalAmount.toFixed(2)}
                      </h4>
                      <p className="text-[8px] font-bold text-zinc-400 uppercase tracking-wider mt-0.5">
                        AUD
                      </p>
                    </div>

                    <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-2.5 text-center">
                      <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">
                        Variance
                      </p>
                      {(() => {
                        const ordered = viewingDelivery.items.reduce(
                          (sum, item) => sum + item.orderedQuantity,
                          0,
                        );
                        const received = viewingDelivery.items.reduce(
                          (sum, item) => sum + item.receivedQuantity,
                          0,
                        );
                        const diff = received - ordered;

                        return (
                          <h4
                            className={`text-sm font-extrabold mt-1 ${
                              diff < 0
                                ? "text-rose-600"
                                : diff > 0
                                  ? "text-emerald-600"
                                  : "text-zinc-600"
                            }`}
                          >
                            {diff > 0 ? "+" : ""}
                            {diff}
                          </h4>
                        );
                      })()}
                      <p className="text-[8px] font-bold text-zinc-400 uppercase tracking-wider mt-0.5">
                        Base Units
                      </p>
                    </div>
                  </div>

                  {viewingDelivery.notes && (
                    <div className="bg-zinc-50/50 border border-zinc-200 rounded-xl p-3.5 space-y-1">
                      <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">
                        Delivery Notes
                      </p>
                      <p className="text-xs font-bold text-zinc-700 leading-relaxed italic">
                        &quot;{viewingDelivery.notes}&quot;
                      </p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="min-h-[30vh] flex flex-col items-center justify-center text-zinc-400">
                <Loader2 className="h-6 w-6 animate-spin text-[#16A34A] mb-2" />
                <p className="text-[10px] font-bold uppercase tracking-wider">
                  Loading details...
                </p>
              </div>
            )}
          </div>

          <div className="bg-white border-t border-zinc-200 px-5 py-4 flex items-center justify-end gap-2.5">
            {panelMode === "new" ? (
              <>
                <button
                  onClick={() => setIsPanelOpen(false)}
                  className="border border-zinc-200 hover:bg-zinc-50 text-zinc-700 rounded-xl px-4 py-2 text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmAndReceive}
                  disabled={
                    saving || !selectedPOId || deliveryItemsInput.length === 0
                  }
                  className="bg-[#16A34A] hover:bg-[#15803D] disabled:bg-zinc-200 disabled:text-zinc-400 disabled:cursor-not-allowed text-white rounded-xl px-5 py-2 text-xs font-extrabold uppercase tracking-wider shadow-xs transition-all flex items-center gap-2 cursor-pointer"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Receiving...
                    </>
                  ) : (
                    "Confirm & Receive"
                  )}
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsPanelOpen(false)}
                className="border border-zinc-200 hover:bg-zinc-50 text-zinc-700 rounded-xl px-5 py-2.5 text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer"
              >
                Close
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
