"use client";

import { useEffect, useState, useMemo } from "react";
import { toast } from "sonner";
import AlertDialog from "@/components/ui/alert-dialog";
import { useBusinessStore } from "@/stores/business-store";
import { useAuth } from "@/providers/auth-provider";
import {
  getPurchaseOrders,
  updatePurchaseOrderStatus,
  deletePurchaseOrder,
} from "@/lib/repositories/purchase-order.repository";
import { PurchaseOrder } from "@/types/inventory";
import {
  FileText,
  Loader2,
  Trash2,
  ChevronDown,
  Send,
  Calendar,
  Building,
  Search,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export default function PurchaseOrdersPage() {
  const { activeBusinessId } = useBusinessStore();
  const { profile } = useAuth();

  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedPoId, setExpandedPoId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const loadData = async () => {
    if (!activeBusinessId) return;
    try {
      setLoading(true);
      const data = await getPurchaseOrders(activeBusinessId);
      setOrders(data);
    } catch (err: unknown) {
      console.error(err);
      toast.error("Failed to load purchase orders.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeBusinessId, profile]);

  const handleStatusChange = async (
    poId: string,
    newStatus: "completed" | "draft" | "sent",
  ) => {
    if (!activeBusinessId) return;
    try {
      await updatePurchaseOrderStatus(activeBusinessId, poId, newStatus);
      toast.success(`Purchase order status updated to ${newStatus}`);
      await loadData();
    } catch (err) {
      console.error(err);
      toast.error("Failed to update status.");
    }
  };

  const handleDelete = (poId: string) => {
    setDeleteTarget(poId);
  };

  const handleConfirmDelete = async () => {
    if (!activeBusinessId || !deleteTarget) return;
    try {
      await deletePurchaseOrder(activeBusinessId, deleteTarget);
      toast.success("Purchase order deleted successfully.");
      await loadData();
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete purchase order.");
    } finally {
      setDeleteTarget(null);
    }
  };

  const toggleExpand = (poId: string) => {
    setExpandedPoId((prev) => (prev === poId ? null : poId));
  };

  const filteredOrders = useMemo(() => {
    return orders.filter((po) => {
      const matchesSearch =
        po.poNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        po.supplierName.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === "all" ||
        po.status.toLowerCase() === statusFilter.toLowerCase();

      return matchesSearch && matchesStatus;
    });
  }, [orders, searchQuery, statusFilter]);

  const getStatusBadge = (status: string) => {
    const s = status.toLowerCase();
    if (s === "sent") {
      return {
        label: "SENT",
        style: "bg-indigo-50 text-indigo-700 border-indigo-200/70",
      };
    }
    if (s === "completed") {
      return {
        label: "COMPLETED",
        style: "bg-emerald-50 text-emerald-800 border-emerald-200/70",
      };
    }
    return {
      label: "DRAFT",
      style: "bg-amber-50 text-amber-800 border-amber-200/70",
    };
  };

  if (loading && orders.length === 0) {
    return (
      <div className="min-h-[75vh] flex flex-col items-center justify-center bg-white text-neutral-900">
        <Loader2 className="h-7 w-7 text-neutral-900 animate-spin mb-3" />
        <p className="text-neutral-400 text-xs font-bold uppercase tracking-wider">
          Loading purchase orders...
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
              Purchase Orders
            </h1>
            <p className="text-neutral-500 text-xs font-medium mt-0.5">
              Manage generated purchase orders and track delivery status.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 w-full">
          <div className="relative flex-1 max-w-md">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
              <Search className="h-4 w-4" />
            </span>
            <input
              type="text"
              placeholder="Search PO number or supplier"
              className="w-full bg-white border border-neutral-200 focus:border-neutral-900 focus:ring-4 focus:ring-neutral-900/5 rounded-full py-2.5 pl-10 pr-4 text-xs font-medium text-neutral-900 placeholder:text-neutral-400 focus:outline-none transition shadow-2xs h-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="w-full sm:w-44 shrink-0">
            <Select
              value={statusFilter}
              onValueChange={(val) => setStatusFilter(val)}
            >
              <SelectTrigger className="w-full h-10 rounded-full border border-neutral-200 bg-white px-4 text-xs font-semibold text-neutral-800 hover:bg-neutral-50 transition cursor-pointer shadow-2xs">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border border-neutral-200 bg-white p-1 max-h-56 z-50">
                <SelectItem
                  value="all"
                  className="rounded-lg px-3 py-2 text-xs font-semibold cursor-pointer"
                >
                  All Statuses
                </SelectItem>
                <SelectItem
                  value="draft"
                  className="rounded-lg px-3 py-2 text-xs font-semibold cursor-pointer"
                >
                  Draft
                </SelectItem>
                <SelectItem
                  value="sent"
                  className="rounded-lg px-3 py-2 text-xs font-semibold cursor-pointer"
                >
                  Sent
                </SelectItem>
                <SelectItem
                  value="completed"
                  className="rounded-lg px-3 py-2 text-xs font-semibold cursor-pointer"
                >
                  Completed
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {filteredOrders.length === 0 ? (
          <div className="bg-white border border-neutral-200 rounded-3xl py-20 px-6 text-center flex flex-col items-center justify-center shadow-xs">
            <FileText className="h-12 w-12 text-neutral-300 mb-3" />
            <h3 className="text-base font-bold text-neutral-900">
              No purchase orders found
            </h3>
            <p className="text-neutral-500 text-xs mt-1 font-medium max-w-xs leading-relaxed">
              {searchQuery || statusFilter !== "all"
                ? "No purchase orders match your active filter settings."
                : "Drafts will appear here when you generate them using the Restock Planner."}
            </p>
          </div>
        ) : (
          <div className="space-y-3.5">
            {filteredOrders.map((po) => {
              const isExpanded = expandedPoId === po.id;
              const badge = getStatusBadge(po.status);

              return (
                <div
                  key={po.id}
                  className="bg-white border border-neutral-200 rounded-2xl shadow-2xs overflow-hidden transition-all duration-200"
                >
                  <div
                    onClick={() => toggleExpand(po.id)}
                    className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 cursor-pointer hover:bg-neutral-100/50 transition-colors"
                  >
                    <div className="flex flex-wrap items-center gap-4">
                      <div className="h-10 w-10 bg-neutral-50 border border-neutral-200/80 rounded-xl flex items-center justify-center text-neutral-600 shrink-0">
                        <FileText className="h-5 w-5 text-neutral-700" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-neutral-900">
                            {po.poNumber}
                          </span>
                          <span
                            className={cn(
                              "text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-md border tracking-wider",
                              badge.style,
                            )}
                          >
                            {badge.label}
                          </span>
                        </div>
                        <p className="text-xs text-neutral-500 font-medium mt-1 uppercase flex items-center gap-1.5">
                          <Building className="h-3.5 w-3.5 text-neutral-400" />
                          <span>{po.supplierName}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between lg:justify-end gap-6 border-t lg:border-t-0 pt-4 lg:pt-0">
                      <div className="text-left lg:text-right">
                        <p className="text-[10px] uppercase tracking-wider text-neutral-400 font-bold flex items-center gap-1 lg:justify-end">
                          <Calendar className="h-3 w-3" /> Created On
                        </p>
                        <p className="text-xs font-semibold text-neutral-800 mt-0.5">
                          {new Date(po.createdAt).toLocaleDateString(
                            undefined,
                            {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            },
                          )}
                        </p>
                      </div>

                      <div className="text-left lg:text-right">
                        <p className="text-[10px] uppercase tracking-wider text-neutral-400 font-bold">
                          Total Amount
                        </p>
                        <p className="text-sm font-bold text-neutral-900 mt-0.5">
                          $
                          {po.totalAmount.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </p>
                      </div>

                      <div
                        className="flex items-center gap-2 w-full sm:w-auto justify-end"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {po.status === "draft" && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStatusChange(po.id, "sent");
                            }}
                            className="bg-[#0A2924] hover:bg-[#0A2924]/90 text-white rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-all shadow-2xs"
                            title="Mark as Sent"
                          >
                            <Send className="h-3.5 w-3.5" />
                            Send
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(po.id);
                          }}
                          className="p-2 rounded-full hover:bg-rose-50 text-neutral-400 hover:text-rose-600 border border-neutral-200 hover:border-rose-200 transition-colors cursor-pointer"
                          title="Delete PO"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <div
                    className={cn(
                      "grid transition-all duration-300 ease-in-out border-t",
                      isExpanded
                        ? "grid-rows-[1fr] opacity-100 p-5 border-neutral-200 bg-neutral-50/50"
                        : "grid-rows-[0fr] opacity-0 p-0 border-transparent overflow-hidden",
                    )}
                  >
                    <div className="overflow-hidden space-y-4">
                      {po.notes && (
                        <div className="bg-white p-3.5 rounded-xl border border-neutral-200 text-xs">
                          <span className="font-bold text-neutral-400 block text-[10px] uppercase tracking-wider">
                            Notes
                          </span>
                          <p className="text-neutral-700 mt-1 font-medium italic">
                            &quot;{po.notes}&quot;
                          </p>
                        </div>
                      )}

                      <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-2xs">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="border-b border-neutral-200 text-[10px] uppercase font-bold tracking-wider text-neutral-400 bg-neutral-50/50">
                              <th className="py-3 px-5">Item Name</th>
                              {po.items.some((i) => i.sku) && (
                                <th className="py-3 px-5">SKU</th>
                              )}
                              <th className="py-3 px-5 text-right">Quantity</th>
                              <th className="py-3 px-5 text-right">
                                Unit Cost
                              </th>
                              <th className="py-3 px-5 text-right">
                                Total Cost
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-neutral-100 text-neutral-700 font-semibold bg-white">
                            {po.items.map((item) => (
                              <tr
                                key={item.id}
                                className="hover:bg-neutral-50/30 transition-colors"
                              >
                                <td className="py-3 px-5 text-neutral-900 font-bold">
                                  {item.stockItemName}
                                </td>
                                {po.items.some((i) => i.sku) && (
                                  <td className="py-3 px-5 font-medium uppercase text-neutral-400">
                                    {item.sku || "—"}
                                  </td>
                                )}
                                <td className="py-3 px-5 text-right font-medium">
                                  {item.quantity.toLocaleString()}
                                </td>
                                <td className="py-3 px-5 text-right font-medium text-neutral-500">
                                  $
                                  {item.unitCost.toLocaleString(undefined, {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}
                                </td>
                                <td className="py-3 px-5 text-right text-neutral-900 font-bold">
                                  $
                                  {item.totalCost.toLocaleString(undefined, {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <AlertDialog
        open={deleteTarget !== null}
        title="Delete Purchase Order"
        description="Are you sure you want to delete this purchase order? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
