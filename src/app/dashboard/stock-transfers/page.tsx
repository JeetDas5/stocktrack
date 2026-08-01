"use client";

import { toast } from "sonner";
import { useEffect, useState } from "react";
import { useBusinessStore } from "@/stores/business-store";
import { useLocationStore } from "@/stores/location-store";
import { StockItem, StockTransfer } from "@/types/inventory";
import {
  getStockTransfers,
  dispatchStockTransfer,
  receiveStockTransfer,
} from "@/lib/repositories/stock-transfer.repository";
import { getStockItems } from "@/lib/repositories/stock-item.repository";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Search,
  Truck,
  CheckCircle2,
  Clock,
  Warehouse,
  Store,
  Loader2,
  X,
  PackageCheck,
  PackagePlus,
  ArrowRight,
} from "lucide-react";

interface TransferItemDraft {
  stockItemId: string;
  dispatchedQty: number;
}

export default function StockTransfersPage() {
  const { activeBusinessId } = useBusinessStore();
  const { locations, fetchLocations } = useLocationStore();

  const [transfers, setTransfers] = useState<StockTransfer[]>([]);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusTab, setStatusTab] = useState<
    "all" | "in_transit" | "completed"
  >("all");

  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [selectedTransfer, setSelectedTransfer] =
    useState<StockTransfer | null>(null);

  const [fromLocationId, setFromLocationId] = useState("");
  const [toLocationId, setToLocationId] = useState("");
  const [notes, setNotes] = useState("");
  const [draftItems, setDraftItems] = useState<TransferItemDraft[]>([
    { stockItemId: "", dispatchedQty: 1 },
  ]);
  const [dispatching, setDispatching] = useState(false);

  const [receiveNotes, setReceiveNotes] = useState("");
  const [receiveItemsMap, setReceiveItemsMap] = useState<
    Record<string, number>
  >({});
  const [receiving, setReceiving] = useState(false);

  useEffect(() => {
    if (!activeBusinessId) return;
    const businessId = activeBusinessId;

    async function loadData() {
      try {
        setLoading(true);
        await fetchLocations(businessId);
        const [transfersData, itemsData] = await Promise.all([
          getStockTransfers(businessId),
          getStockItems(businessId),
        ]);
        setTransfers(transfersData);
        setStockItems(itemsData);
      } catch (err) {
        toast.error(
          err instanceof Error
            ? err.message
            : "Failed to load stock transfers data",
        );
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [activeBusinessId, fetchLocations]);

  const refreshTransfers = async () => {
    if (!activeBusinessId) return;
    const businessId = activeBusinessId;
    try {
      const updated = await getStockTransfers(businessId);
      setTransfers(updated);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to refresh stock transfer",
      );
    }
  };

  const openDispatchModal = () => {
    setFromLocationId("");
    setToLocationId("");
    setNotes("");
    setDraftItems([{ stockItemId: "", dispatchedQty: 1 }]);
    setShowDispatchModal(true);
  };

  const addDraftItemRow = () => {
    setDraftItems([...draftItems, { stockItemId: "", dispatchedQty: 1 }]);
  };

  const removeDraftItemRow = (index: number) => {
    if (draftItems.length === 1) return;
    setDraftItems(draftItems.filter((_, i) => i !== index));
  };

  const updateDraftItem = (
    index: number,
    field: keyof TransferItemDraft,
    value: string | number,
  ) => {
    const next = [...draftItems];
    next[index] = { ...next[index], [field]: value };
    setDraftItems(next);
  };

  const handleFromLocationChange = (val: string) => {
    setFromLocationId(val);
    if (toLocationId === val) {
      setToLocationId("");
    }
    setDraftItems([{ stockItemId: "", dispatchedQty: 1 }]);
  };

  const warehouseSourceLocations = locations.filter(
    (loc) => loc.isWarehouse === true,
  );
  const destinationLocations = locations.filter(
    (loc) => loc.id !== fromLocationId,
  );

  const availableStockItemsForFromLocation = fromLocationId
    ? stockItems.filter((si) =>
        (si.locationRules || []).some((r) => r.locationId === fromLocationId),
      )
    : [];

  const getItemStockInLocation = (si: StockItem, locId: string): number => {
    if (!locId) return 0;
    const rule = (si.locationRules || []).find((r) => r.locationId === locId);
    return rule?.currentStock ?? 0;
  };

  const handleDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBusinessId) return;
    const businessId = activeBusinessId;

    if (!fromLocationId || !toLocationId) {
      toast.error(
        "Please select both source warehouse and destination location",
      );
      return;
    }

    if (fromLocationId === toLocationId) {
      toast.error(
        "Source warehouse and destination location must be different",
      );
      return;
    }

    const validItems = draftItems.filter(
      (item) => item.stockItemId && item.dispatchedQty > 0,
    );

    if (validItems.length === 0) {
      toast.error("Please add at least one valid stock item with quantity > 0");
      return;
    }

    try {
      setDispatching(true);
      await dispatchStockTransfer(businessId, {
        from_location_id: fromLocationId,
        to_location_id: toLocationId,
        notes: notes.trim() || undefined,
        items: validItems.map((it) => ({
          stock_item_id: it.stockItemId,
          dispatched_qty: Number(it.dispatchedQty),
        })),
      });

      toast.success("Stock transfer dispatched successfully!");
      setShowDispatchModal(false);
      await refreshTransfers();
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err?.message
          : "Failed to dispatch stock transfer",
      );
    } finally {
      setDispatching(false);
    }
  };

  const openReceiveModal = (transfer: StockTransfer) => {
    setSelectedTransfer(transfer);
    setReceiveNotes("");
    const initialMap: Record<string, number> = {};
    transfer.items.forEach((it) => {
      initialMap[it.stockItemId] = it.dispatchedQty;
    });
    setReceiveItemsMap(initialMap);
    setShowReceiveModal(true);
  };

  const handleReceive = async () => {
    if (!activeBusinessId || !selectedTransfer) return;
    const businessId = activeBusinessId;

    try {
      setReceiving(true);
      const itemsPayload = Object.entries(receiveItemsMap).map(
        ([stockItemId, receivedQty]) => ({
          stock_item_id: stockItemId,
          received_qty: Number(receivedQty),
        }),
      );

      await receiveStockTransfer(businessId, selectedTransfer.id, {
        notes: receiveNotes.trim() || undefined,
        items: itemsPayload,
      });

      toast.success(
        `Transfer ${selectedTransfer.transferNumber} received and stock updated!`,
      );
      setShowReceiveModal(false);
      setSelectedTransfer(null);
      await refreshTransfers();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to receive transfer",
      );
    } finally {
      setReceiving(false);
    }
  };

  const filteredTransfers = transfers.filter((trf) => {
    const matchesTab = statusTab === "all" ? true : trf.status === statusTab;

    const query = searchQuery.toLowerCase().trim();
    const matchesQuery =
      !query ||
      trf.transferNumber.toLowerCase().includes(query) ||
      (trf.fromLocationName &&
        trf.fromLocationName.toLowerCase().includes(query)) ||
      (trf.toLocationName && trf.toLocationName.toLowerCase().includes(query));

    return matchesTab && matchesQuery;
  });

  return (
    <div className="flex flex-col gap-6 bg-white min-h-0 w-full pb-8">
      <div className="w-full space-y-4">
        <div className="bg-white border border-neutral-200 rounded-[18px] py-4 px-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm">
          <div>
            <h1 className="text-[24px] font-bold text-neutral-900 tracking-tight">
              Stock Transfers
            </h1>
            <p className="text-neutral-500 text-xs font-semibold mt-0.5">
              Move inventory seamlessly between central warehouses and retail
              locations.
            </p>
          </div>

          <button
            type="button"
            onClick={openDispatchModal}
            className="inline-flex items-center gap-2 bg-[#0A2924] hover:bg-[#0A2924]/90 text-white px-5 py-2.5 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer shadow-sm"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            Dispatch Transfer
          </button>
        </div>

        <div className="bg-white border border-neutral-200 rounded-[18px] p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => setStatusTab("all")}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                statusTab === "all"
                  ? "bg-neutral-950 text-white shadow-sm"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              }`}
            >
              All ({transfers.length})
            </button>
            <button
              onClick={() => setStatusTab("in_transit")}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                statusTab === "in_transit"
                  ? "bg-neutral-950 text-white shadow-sm"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              In-Transit (
              {transfers.filter((t) => t.status === "in_transit").length})
            </button>
            <button
              onClick={() => setStatusTab("completed")}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                statusTab === "completed"
                  ? "bg-neutral-950 text-white shadow-sm"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Completed (
              {transfers.filter((t) => t.status === "completed").length})
            </button>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Search transfer ref or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-neutral-200 focus:border-black rounded-xl py-2 pl-9 pr-4 text-xs font-semibold text-neutral-950 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-black transition-all"
            />
          </div>
        </div>

        <div className="bg-white border border-neutral-200 rounded-[18px] overflow-hidden shadow-sm">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-neutral-400">
              <Loader2 className="w-6 h-6 animate-spin mb-2 text-neutral-900" />
              <span className="text-xs font-bold uppercase tracking-wider">
                Loading transfer records...
              </span>
            </div>
          ) : filteredTransfers.length === 0 ? (
            <div className="text-center py-16 space-y-2">
              <Truck className="w-10 h-10 text-neutral-300 mx-auto" />
              <h3 className="text-sm font-bold text-neutral-900">
                No transfers found
              </h3>
              <p className="text-xs text-neutral-500 font-medium">
                {searchQuery
                  ? "Try adjusting your search query."
                  : "Click 'Dispatch Transfer' to start moving stock between locations."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-neutral-200 bg-neutral-50/80 text-neutral-500 font-bold uppercase tracking-wider">
                    <th className="py-3.5 px-6">Transfer Ref</th>
                    <th className="py-3.5 px-6">From Location</th>
                    <th className="py-3.5 px-6">To Location</th>
                    <th className="py-3.5 px-6">Transferred Items</th>
                    <th className="py-3.5 px-6">Status</th>
                    <th className="py-3.5 px-6">Dispatched At</th>
                    <th className="py-3.5 px-6 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 text-neutral-900 font-medium">
                  {filteredTransfers.map((trf) => (
                    <tr
                      key={trf.id}
                      className="hover:bg-neutral-50/50 transition-colors"
                    >
                      <td className="py-4 px-6 font-bold text-neutral-950">
                        {trf.transferNumber}
                      </td>
                      <td className="py-4 px-6">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-neutral-100 text-neutral-800 text-xs font-semibold">
                          <Warehouse className="w-3.5 h-3.5 text-neutral-600" />
                          {trf.fromLocationName}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-neutral-100 text-neutral-800 text-xs font-semibold">
                          <Store className="w-3.5 h-3.5 text-neutral-600" />
                          {trf.toLocationName}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="space-y-1">
                          {trf.items.map((it, idx) => (
                            <div key={idx} className="text-xs text-neutral-700">
                              •{" "}
                              <span className="font-semibold text-neutral-950">
                                {it.stockItemName}
                              </span>
                              : {it.dispatchedQty}
                              {it.receivedQty !== undefined && (
                                <span className="text-emerald-700 ml-1 font-semibold">
                                  (Rec: {it.receivedQty})
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        {trf.status === "in_transit" ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-bold">
                            <Clock className="w-3 h-3 text-amber-600" />
                            IN TRANSIT
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-bold">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            COMPLETED
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-neutral-500 text-xs font-medium">
                        {new Date(trf.dispatchedAt).toLocaleDateString(
                          "en-US",
                          {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          },
                        )}
                      </td>
                      <td className="py-4 px-6 text-right">
                        {trf.status === "in_transit" ? (
                          <button
                            onClick={() => openReceiveModal(trf)}
                            className="inline-flex items-center gap-1.5 bg-[#0A2924] hover:bg-[#0A2924]/90 text-white px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer shadow-sm"
                          >
                            <PackageCheck className="w-3.5 h-3.5" />
                            Receive Stock
                          </button>
                        ) : (
                          <span className="text-xs text-neutral-400 font-semibold italic">
                            Completed
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showDispatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-xs">
          <div className="bg-white border border-neutral-200 rounded-[20px] w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-6 border-b border-neutral-200 bg-neutral-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-neutral-900 text-white rounded-xl">
                  <PackagePlus className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-neutral-950">
                    Dispatch Stock Transfer
                  </h2>
                  <p className="text-xs text-neutral-500 font-semibold">
                    Select warehouse source and items to dispatch into transit
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDispatchModal(false)}
                className="text-neutral-400 hover:text-neutral-900 p-1.5 rounded-lg hover:bg-neutral-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={handleDispatch}
              className="p-6 space-y-5 max-h-[75vh] overflow-y-auto"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-900 uppercase tracking-wider mb-1.5">
                    From Location / Warehouse *
                  </label>
                  <Select
                    value={fromLocationId}
                    onValueChange={handleFromLocationChange}
                  >
                    <SelectTrigger className="w-full h-10 rounded-xl border border-zinc-300 bg-white px-3.5 text-xs text-zinc-950 font-semibold focus:outline-none focus:ring-1 focus:ring-black">
                      <SelectValue placeholder="Select Source Warehouse" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border border-neutral-200 bg-white p-1 max-h-60 z-50">
                      {warehouseSourceLocations.length === 0 ? (
                        <div className="p-3 text-xs text-neutral-400 font-semibold text-center">
                          No warehouses found. Mark a location as Warehouse
                          first.
                        </div>
                      ) : (
                        warehouseSourceLocations.map((loc) => (
                          <SelectItem
                            key={loc.id}
                            value={loc.id}
                            className="rounded-lg px-3 py-2 text-xs font-semibold cursor-pointer"
                          >
                            {loc.name} (Warehouse)
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-900 uppercase tracking-wider mb-1.5">
                    To Location / Outlet *
                  </label>
                  <Select
                    value={toLocationId}
                    onValueChange={(val) => setToLocationId(val)}
                  >
                    <SelectTrigger className="w-full h-10 rounded-xl border border-zinc-300 bg-white px-3.5 text-xs text-zinc-950 font-semibold focus:outline-none focus:ring-1 focus:ring-black">
                      <SelectValue placeholder="Select Destination Location" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border border-neutral-200 bg-white p-1 max-h-60 z-50">
                      {destinationLocations.length === 0 ? (
                        <div className="p-3 text-xs text-neutral-400 font-semibold text-center">
                          No destination locations available.
                        </div>
                      ) : (
                        destinationLocations.map((loc) => (
                          <SelectItem
                            key={loc.id}
                            value={loc.id}
                            className="rounded-lg px-3 py-2 text-xs font-semibold cursor-pointer"
                          >
                            {loc.name} {loc.isWarehouse ? "(Warehouse)" : ""}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
                    Stock Items to Transfer
                  </label>
                  <button
                    type="button"
                    onClick={addDraftItemRow}
                    disabled={!fromLocationId}
                    className="text-xs font-bold text-neutral-900 hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-40 disabled:no-underline"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Add Item</span>
                  </button>
                </div>

                {draftItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 bg-neutral-50/70 p-3 rounded-xl border border-neutral-200"
                  >
                    <div className="flex-1">
                      <Select
                        value={item.stockItemId}
                        onValueChange={(val) =>
                          updateDraftItem(idx, "stockItemId", val)
                        }
                        disabled={!fromLocationId}
                      >
                        <SelectTrigger className="w-full h-10 rounded-xl border border-zinc-300 bg-white px-3.5 text-xs text-zinc-950 font-semibold focus:outline-none focus:ring-1 focus:ring-black disabled:opacity-50">
                          <SelectValue
                            placeholder={
                              fromLocationId
                                ? "Select Stock Item"
                                : "Select Source Warehouse First"
                            }
                          />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border border-neutral-200 bg-white p-1 max-h-60 z-50">
                          {availableStockItemsForFromLocation.length === 0 ? (
                            <div className="p-3 text-xs text-neutral-400 font-semibold text-center">
                              No stock items present in selected warehouse.
                            </div>
                          ) : (
                            availableStockItemsForFromLocation.map((si) => {
                              const stockQty = getItemStockInLocation(
                                si,
                                fromLocationId,
                              );
                              return (
                                <SelectItem
                                  key={si.id}
                                  value={si.id}
                                  className="rounded-lg px-3 py-2 text-xs font-semibold cursor-pointer"
                                >
                                  {si.name} ({stockQty} {si.baseUnit || "units"}
                                  )
                                </SelectItem>
                              );
                            })
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="w-28">
                      <input
                        type="number"
                        min="0.1"
                        step="any"
                        value={item.dispatchedQty}
                        onChange={(e) =>
                          updateDraftItem(
                            idx,
                            "dispatchedQty",
                            parseFloat(e.target.value) || 0,
                          )
                        }
                        placeholder="Qty"
                        className="w-full h-10 bg-white border border-zinc-300 focus:border-black rounded-xl py-2 px-3 text-xs text-zinc-950 font-semibold focus:outline-none focus:ring-1 focus:ring-black"
                        required
                      />
                    </div>

                    {draftItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeDraftItemRow(idx)}
                        className="text-neutral-400 hover:text-rose-600 p-1.5 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-900 uppercase tracking-wider mb-1.5">
                  Transfer Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Weekly replenishment batch"
                  className="w-full bg-white border border-zinc-300 focus:border-black rounded-xl p-3 text-xs text-zinc-950 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-black"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={() => setShowDispatchModal(false)}
                  className="px-4 py-2.5 rounded-full text-xs font-semibold text-neutral-600 hover:bg-neutral-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={dispatching}
                  className="inline-flex items-center gap-2 bg-[#0A2924] hover:bg-[#0A2924]/90 text-white px-5 py-2.5 rounded-full text-xs font-semibold transition-all cursor-pointer shadow-sm disabled:opacity-50"
                >
                  {dispatching && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Confirm Dispatch</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showReceiveModal && selectedTransfer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-xs">
          <div className="bg-white border border-neutral-200 rounded-[20px] w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-6 border-b border-neutral-200 bg-neutral-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-neutral-900 text-white rounded-xl">
                  <PackageCheck className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-neutral-950">
                    Receive Stock Transfer
                  </h2>
                  <p className="text-xs text-neutral-500 font-semibold">
                    Ref:{" "}
                    <span className="font-bold text-neutral-900">
                      {selectedTransfer.transferNumber}
                    </span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowReceiveModal(false)}
                className="text-neutral-400 hover:text-neutral-900 p-1.5 rounded-lg hover:bg-neutral-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="bg-neutral-50 p-3.5 rounded-xl border border-neutral-200 flex items-center justify-between text-xs font-semibold">
                <div className="flex items-center gap-1.5">
                  <Warehouse className="w-4 h-4 text-neutral-500" />
                  <span className="text-neutral-900">
                    {selectedTransfer.fromLocationName}
                  </span>
                </div>
                <ArrowRight className="w-4 h-4 text-neutral-400" />
                <div className="flex items-center gap-1.5">
                  <Store className="w-4 h-4 text-neutral-500" />
                  <span className="text-neutral-900">
                    {selectedTransfer.toLocationName}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
                  Verify Received Quantities
                </label>
                {selectedTransfer.items.map((it) => (
                  <div
                    key={it.stockItemId}
                    className="flex items-center justify-between bg-neutral-50/70 p-3 rounded-xl border border-neutral-200"
                  >
                    <div>
                      <h4 className="text-xs font-bold text-neutral-950">
                        {it.stockItemName}
                      </h4>
                      <p className="text-[11px] text-neutral-500 font-medium">
                        Dispatched: {it.dispatchedQty} units
                      </p>
                    </div>

                    <div className="w-28">
                      <label className="block text-[10px] font-bold text-neutral-500 mb-1">
                        Received Qty
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={
                          receiveItemsMap[it.stockItemId] ?? it.dispatchedQty
                        }
                        onChange={(e) =>
                          setReceiveItemsMap({
                            ...receiveItemsMap,
                            [it.stockItemId]: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="w-full bg-white border border-zinc-300 focus:border-black rounded-lg px-3 py-1.5 text-xs font-semibold text-zinc-950 focus:outline-none focus:ring-1 focus:ring-black"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-900 uppercase tracking-wider mb-1.5">
                  Receiving Remarks (Optional)
                </label>
                <textarea
                  rows={2}
                  value={receiveNotes}
                  onChange={(e) => setReceiveNotes(e.target.value)}
                  placeholder="e.g. All packages verified"
                  className="w-full bg-white border border-zinc-300 focus:border-black rounded-xl p-3 text-xs text-zinc-950 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-black"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={() => setShowReceiveModal(false)}
                  className="px-4 py-2.5 rounded-full text-xs font-semibold text-neutral-600 hover:bg-neutral-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleReceive}
                  disabled={receiving}
                  className="inline-flex items-center gap-2 bg-[#0A2924] hover:bg-[#0A2924]/90 text-white px-5 py-2.5 rounded-full text-xs font-semibold transition-all cursor-pointer shadow-sm disabled:opacity-50"
                >
                  {receiving && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Confirm Receipt & Update Stock</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
