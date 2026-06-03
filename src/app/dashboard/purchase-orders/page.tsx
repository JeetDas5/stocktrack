"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import AlertDialog from "@/components/alert-dialog";
import { useBusinessStore } from "@/store/business-store";
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
  ChevronUp,
  Send,
  Calendar,
  Building,
} from "lucide-react";

export default function PurchaseOrdersPage() {
  const { activeBusinessId } = useBusinessStore();
  const { profile } = useAuth();

  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedPoId, setExpandedPoId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const loadData = async () => {
    if (!activeBusinessId) return;
    try {
      setLoading(true);
      const data = await getPurchaseOrders(activeBusinessId);
      setOrders(data);
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to load purchase orders.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeBusinessId, profile]);

  const handleStatusChange = async (poId: string, newStatus: "completed" | "draft" | "sent") => {
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

  if (loading) {
    return (
      <div className="h-[75vh] flex flex-col items-center justify-center bg-white text-[#0F172A]">
        <Loader2 className="h-7 w-7 text-[#16A34A] animate-spin mb-3" />
        <span className="text-[#64748B] text-xs font-bold uppercase tracking-wider">
          Loading purchase orders...
        </span>
      </div>
    );
  }

  return (
    <div className="flex bg-[#F8FAFC] min-h-[85vh] relative select-none font-sans antialiased text-[#0F172A]">
      <div className="flex-1 space-y-6 p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-zinc-200 pb-5 bg-white -mx-6 -mt-6 p-6">
          <div>
            <h1 className="text-2xl font-extrabold text-[#0F172A] tracking-tight">
              Purchase Orders
            </h1>
            <p className="text-[#64748B] text-xs font-bold mt-1">
              Manage your generated purchase orders and track their delivery
              status.
            </p>
          </div>
        </div>



        {orders.length === 0 ? (
          <div className="bg-white border border-zinc-200 rounded-2xl py-20 px-6 text-center flex flex-col items-center justify-center shadow-xs">
            <FileText className="h-12 w-12 text-zinc-300 mb-3" />
            <h3 className="text-base font-bold text-[#0F172A]">
              No purchase orders yet
            </h3>
            <p className="text-[#64748B] text-xs mt-1 font-semibold max-w-xs leading-relaxed">
              Drafts will appear here when you generate them using the Refill
              Planner.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((po) => {
              const isExpanded = expandedPoId === po.id;

              let statusColor = "bg-zinc-100 text-zinc-700 border-zinc-200";
              if (po.status === "sent")
                statusColor = "bg-indigo-50 text-indigo-700 border-indigo-200";
              if (po.status === "completed")
                statusColor =
                  "bg-emerald-50 text-emerald-700 border-emerald-200";

              return (
                <div
                  key={po.id}
                  className="bg-white border border-zinc-200 rounded-2xl shadow-xs overflow-hidden transition-all duration-200"
                >
                  <div className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-4">
                      <div className="h-10 w-10 bg-zinc-50 border border-zinc-100 rounded-xl flex items-center justify-center text-zinc-600 shrink-0">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-sm text-[#0F172A]">
                            {po.poNumber}
                          </span>
                          <span
                            className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${statusColor}`}
                          >
                            {po.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#64748B] font-bold mt-1 uppercase flex items-center gap-1">
                          <Building className="h-3.5 w-3.5" />
                          {po.supplierName}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between lg:justify-end gap-6 border-t lg:border-t-0 pt-4 lg:pt-0">
                      <div className="text-left lg:text-right">
                        <p className="text-[9px] uppercase tracking-wider text-[#64748B] font-extrabold flex items-center gap-1 lg:justify-end">
                          <Calendar className="h-3 w-3" /> Created On
                        </p>
                        <p className="text-xs font-bold text-zinc-800 mt-0.5">
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
                        <p className="text-[9px] uppercase tracking-wider text-[#64748B] font-extrabold">
                          Total Amount
                        </p>
                        <p className="text-sm font-black text-[#0F172A] mt-0.5">
                          $
                          {po.totalAmount.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                        {po.status === "draft" && (
                          <button
                            onClick={() => handleStatusChange(po.id, "sent")}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-3 py-2 text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-all"
                            title="Mark as Sent"
                          >
                            <Send className="h-3.5 w-3.5" />
                            Send
                          </button>
                        )}


                        <button
                          onClick={() => handleDelete(po.id)}
                          className="p-2 rounded-lg hover:bg-rose-50 text-zinc-400 hover:text-rose-600 border border-zinc-200 hover:border-rose-200 transition-colors cursor-pointer"
                          title="Delete PO"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>

                        <button
                          onClick={() => toggleExpand(po.id)}
                          className="p-2 rounded-lg hover:bg-zinc-50 border border-zinc-200 text-zinc-500 cursor-pointer"
                        >
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="bg-zinc-50/50 border-t border-zinc-100 p-5 space-y-4">
                      {po.notes && (
                        <div className="bg-white p-3 rounded-lg border border-zinc-200 text-xs">
                          <span className="font-extrabold text-[#64748B] block text-[10px] uppercase tracking-wider">
                            Notes
                          </span>
                          <p className="text-zinc-700 mt-1 font-semibold">
                            {po.notes}
                          </p>
                        </div>
                      )}

                      <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-xs">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="border-b border-zinc-200 text-[10px] uppercase font-extrabold tracking-wider text-[#64748B] bg-zinc-50/30">
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
                          <tbody className="divide-y divide-zinc-200 text-zinc-700 font-bold">
                            {po.items.map((item) => (
                              <tr key={item.id} className="hover:bg-zinc-50/20">
                                <td className="py-3 px-5 text-[#0F172A] font-extrabold">
                                  {item.stockItemName}
                                </td>
                                {po.items.some((i) => i.sku) && (
                                  <td className="py-3 px-5 font-bold uppercase text-[#64748B]">
                                    {item.sku || "—"}
                                  </td>
                                )}
                                <td className="py-3 px-5 text-right">
                                  {item.quantity.toLocaleString()}
                                </td>
                                <td className="py-3 px-5 text-right">
                                  $
                                  {item.unitCost.toLocaleString(undefined, {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}
                                </td>
                                <td className="py-3 px-5 text-right text-[#0F172A] font-extrabold">
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
                  )}
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
