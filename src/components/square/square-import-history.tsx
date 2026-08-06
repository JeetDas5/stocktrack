"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  History,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FileText,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  getSquareImportHistory,
  SquareImportHistoryItem,
} from "@/lib/repositories/square.repository";

interface SquareImportHistoryProps {
  businessId: string;
}

export default function SquareImportHistory({
  businessId,
}: SquareImportHistoryProps) {
  const [history, setHistory] = useState<SquareImportHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const data = await getSquareImportHistory(businessId);
      setHistory(data.history || []);
    } catch (err: unknown) {
      toast.error((err as Error).message || "Failed to load import history.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (businessId) {
      fetchHistory();
    }
  }, [businessId]);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-zinc-200 p-12 text-center space-y-2">
        <Loader2 className="h-6 w-6 text-[#0a2924] animate-spin mx-auto" />
        <p className="text-xs text-zinc-500 font-semibold">
          Loading import history log...
        </p>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-zinc-200 p-12 text-center space-y-2">
        <History className="h-8 w-8 text-zinc-300 mx-auto" />
        <h3 className="font-extrabold text-zinc-800 text-sm">
          No Import History Recorded Yet
        </h3>
        <p className="text-xs text-zinc-500 max-w-sm mx-auto">
          Execute an import run using the Import Data Wizard to see detailed
          audit logs here.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-zinc-200 p-6 space-y-4 shadow-xs">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-extrabold text-zinc-900 flex items-center gap-2">
            <History className="h-4 w-4 text-[#0a2924]" /> Square Import Audit
            Log
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Audit history of data sync executions performed for your business.
          </p>
        </div>
        <button
          onClick={fetchHistory}
          className="px-3 py-1.5 text-xs font-bold bg-zinc-100 text-zinc-700 hover:bg-zinc-200 rounded-xl transition cursor-pointer"
        >
          Refresh Log
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-200">
        <table className="w-full text-left text-xs">
          <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 font-bold uppercase tracking-wider">
            <tr>
              <th className="px-4 py-3">Timestamp</th>
              <th className="px-4 py-3">Entity Type</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Summary</th>
              <th className="px-4 py-3 text-right">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 bg-white text-zinc-700">
            {history.map((item) => {
              const isExpanded = expandedId === item.id;
              const formattedDate = item.created_at
                ? format(new Date(item.created_at), "MMM d, yyyy • h:mm a")
                : "Unknown";

              return (
                <tr key={item.id} className="hover:bg-zinc-50/70 transition">
                  <td className="px-4 py-3 font-semibold text-zinc-900">
                    {formattedDate}
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2.5 py-0.5 bg-[#0a2924]/10 text-[#0a2924] font-extrabold text-[11px] rounded-full uppercase">
                      {item.entity_type}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Success
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 text-[11px]">
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded">
                        +{item.created_count} Created
                      </span>
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-800 font-bold rounded">
                        {item.updated_count} Updated
                      </span>
                      <span className="px-2 py-0.5 bg-zinc-100 text-zinc-600 font-bold rounded">
                        {item.skipped_count} Skipped
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : item.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-[#0a2924] bg-zinc-100 hover:bg-zinc-200 rounded-lg transition cursor-pointer"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      {isExpanded ? (
                        <ChevronUp className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
