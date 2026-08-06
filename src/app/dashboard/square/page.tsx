"use client";

import { toast } from "sonner";
import { useEffect, useState, useMemo, useCallback } from "react";
import {
  Store,
  RefreshCw,
  Unplug,
  ExternalLink,
  Search,
  CheckCircle2,
  Code2,
  Tag,
  Receipt,
  Package,
  Layers,
  Percent,
  X,
  Loader2,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Sliders,
  History,
} from "lucide-react";

import { useBusinessStore } from "@/stores/business-store";
import {
  getSquareStatus,
  getSquareAuthorizeUrl,
  disconnectSquare,
  getSquareCatalog,
  SquareStatusResponse,
  CatalogObject,
} from "@/lib/repositories/square.repository";

import SquareImportWizard from "@/components/square/square-import-wizard";
import SquareImportHistory from "@/components/square/square-import-history";

const TYPE_FILTER_OPTIONS = [
  { value: "category,tax", label: "Categories & Taxes (Requested)" },
  { value: "all", label: "All Catalog Objects" },
  { value: "CATEGORY", label: "Categories Only" },
  { value: "TAX", label: "Taxes Only" },
  { value: "ITEM", label: "Items Only" },
  { value: "DISCOUNT", label: "Discounts Only" },
] as const;

const ITEMS_PER_PAGE = 8;

export default function SquareIntegrationPage() {
  const { activeBusinessId } = useBusinessStore();

  const [activeTab, setActiveTab] = useState<"wizard" | "status" | "history">("wizard");

  const [statusLoading, setStatusLoading] = useState(true);
  const [status, setStatus] = useState<SquareStatusResponse>({
    connected: false,
  });
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogObjects, setCatalogObjects] = useState<CatalogObject[]>([]);
  const [selectedType, setSelectedType] = useState<string>("category,tax");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeJsonObject, setActiveJsonObject] =
    useState<CatalogObject | null>(null);

  const [currentPage, setCurrentPage] = useState(1);

  const fetchCatalog = useCallback(
    async (businessId: string, types?: string) => {
      setCatalogLoading(true);
      try {
        const typeParam = types === "all" ? undefined : types;
        const data = await getSquareCatalog(businessId, typeParam);
        setCatalogObjects(data.objects || []);
        if (data.errors && data.errors.length > 0) {
          toast.error(`Catalog Error: ${data.errors[0].detail}`);
        }
      } catch (err: unknown) {
        toast.error((err as Error).message || "Failed to load Square catalog");
        setCatalogObjects([]);
      } finally {
        setCatalogLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    let busId = activeBusinessId;
    if (!busId && typeof window !== "undefined") {
      busId = localStorage.getItem("nexbrix_active_business_id");
    }

    if (!busId) {
      setStatusLoading(false);
      return;
    }

    async function loadStatus() {
      setStatusLoading(true);
      try {
        const res = await getSquareStatus(busId!);
        setStatus(res);
        if (res.connected) {
          fetchCatalog(busId!, selectedType);
        }
      } catch (err: unknown) {
        console.error("Failed to fetch Square status:", err);
      } finally {
        setStatusLoading(false);
      }
    }

    loadStatus();
  }, [activeBusinessId, selectedType, fetchCatalog]);

  const getTargetBusinessId = () => {
    if (activeBusinessId) return activeBusinessId;
    if (typeof window !== "undefined") {
      return localStorage.getItem("nexbrix_active_business_id") || "";
    }
    return "";
  };

  const handleConnect = async () => {
    const busId = getTargetBusinessId();
    if (!busId) {
      toast.error("Please select an active business first.");
      return;
    }
    setConnecting(true);
    try {
      const authUrl = await getSquareAuthorizeUrl(busId);
      window.location.href = authUrl;
    } catch (err: unknown) {
      toast.error(
        (err as Error).message || "Failed to initiate Square OAuth connection",
      );
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    const busId = getTargetBusinessId();
    if (!busId) return;
    if (!confirm("Are you sure you want to disconnect your Square account?"))
      return;

    setDisconnecting(true);
    try {
      await disconnectSquare(busId);
      setStatus({ connected: false });
      setCatalogObjects([]);
      toast.success("Square account disconnected successfully.");
    } catch (err: unknown) {
      toast.error(
        (err as Error).message || "Failed to disconnect Square account",
      );
    } finally {
      setDisconnecting(false);
    }
  };

  const handleTypeChange = (typeVal: string) => {
    setSelectedType(typeVal);
    setCurrentPage(1);
    const busId = getTargetBusinessId();
    if (busId && status.connected) {
      fetchCatalog(busId, typeVal);
    }
  };

  const filteredCatalog = useMemo(() => {
    return catalogObjects.filter((item) => {
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;

      const name =
        item.item_data?.name ||
        item.category_data?.name ||
        item.tax_data?.name ||
        item.discount_data?.name ||
        "";
      const type = item.type || "";
      const id = item.id || "";

      return (
        name.toLowerCase().includes(q) ||
        type.toLowerCase().includes(q) ||
        id.toLowerCase().includes(q)
      );
    });
  }, [catalogObjects, searchQuery]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredCatalog.length / ITEMS_PER_PAGE),
  );
  const paginatedCatalog = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredCatalog.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredCatalog, currentPage]);

  const getTypeBadge = (type: string) => {
    switch (type?.toUpperCase()) {
      case "CATEGORY":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
            <Layers className="w-3 h-3 text-purple-600" /> CATEGORY
          </span>
        );
      case "TAX":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Percent className="w-3 h-3 text-emerald-600" /> TAX
          </span>
        );
      case "ITEM":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <Package className="w-3 h-3 text-blue-600" /> ITEM
          </span>
        );
      case "DISCOUNT":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <Tag className="w-3 h-3 text-amber-600" /> DISCOUNT
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-zinc-100 text-zinc-700 border border-zinc-200">
            <Receipt className="w-3 h-3 text-zinc-500" /> {type}
          </span>
        );
    }
  };

  const getObjectName = (item: CatalogObject) => {
    return (
      item.item_data?.name ||
      item.category_data?.name ||
      item.tax_data?.name ||
      item.discount_data?.name ||
      "Unnamed Object"
    );
  };

  const getObjectDetails = (item: CatalogObject) => {
    if (item.type === "TAX" && item.tax_data) {
      return `Percentage: ${item.tax_data.percentage || "0"}% | Inclusion: ${item.tax_data.inclusion_type || "N/A"}`;
    }
    if (item.type === "CATEGORY" && item.category_data) {
      return `Category ID: ${item.id}`;
    }
    if (item.type === "ITEM" && item.item_data) {
      const vars = item.item_data.variations?.length || 0;
      return `${vars} variation(s)`;
    }
    if (item.type === "DISCOUNT" && item.discount_data) {
      return item.discount_data.percentage
        ? `${item.discount_data.percentage}% off`
        : "Custom Discount";
    }
    return `-`;
  };

  if (statusLoading) {
    return (
      <div className="h-[75vh] flex flex-col items-center justify-center bg-white text-[#0F172A]">
        <Loader2 className="h-7 w-7 text-[#0a2924] animate-spin mb-3" />
        <span className="text-[#64748B] text-xs font-bold uppercase tracking-wider">
          Loading Square connection...
        </span>
      </div>
    );
  }

  const busId = getTargetBusinessId();

  return (
    <div className="flex flex-col bg-white min-h-screen space-y-5 p-4 md:p-6 select-none">
      {/* Header Banner */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl py-4 px-5 md:py-3.5 md:px-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#0a2924]/10 text-[#0a2924] rounded-xl">
            <Store className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-extrabold text-zinc-900 tracking-tight">
              Squareup Integration Hub
            </h1>
            <p className="text-xs text-zinc-500">
              Manage your Square POS connection, run data import wizards, and inspect audit logs.
            </p>
          </div>
        </div>

        {status.connected && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (busId) fetchCatalog(busId, selectedType);
              }}
              disabled={catalogLoading}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold bg-[#0a2924] text-white hover:bg-[#061d19] rounded-xl transition cursor-pointer disabled:opacity-50"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${catalogLoading ? "animate-spin" : ""}`}
              />
              Refresh Catalog
            </button>
            <button
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 rounded-xl transition cursor-pointer disabled:opacity-50"
            >
              <Unplug className="h-3.5 w-3.5" />
              Disconnect
            </button>
          </div>
        )}
      </div>

      {/* Top Level Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-200 pb-1">
        <button
          onClick={() => setActiveTab("wizard")}
          className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
            activeTab === "wizard"
              ? "bg-[#0a2924] text-white shadow-xs"
              : "text-zinc-600 hover:bg-zinc-100"
          }`}
        >
          <Sliders className="h-4 w-4" /> Import Data Wizard
        </button>

        <button
          onClick={() => setActiveTab("status")}
          className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
            activeTab === "status"
              ? "bg-[#0a2924] text-white shadow-xs"
              : "text-zinc-600 hover:bg-zinc-100"
          }`}
        >
          <Store className="h-4 w-4" /> Connection & Catalog
        </button>

        <button
          onClick={() => setActiveTab("history")}
          className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
            activeTab === "history"
              ? "bg-[#0a2924] text-white shadow-xs"
              : "text-zinc-600 hover:bg-zinc-100"
          }`}
        >
          <History className="h-4 w-4" /> Import History Log
        </button>
      </div>

      {/* TAB CONTENT 1: Import Wizard */}
      {activeTab === "wizard" && (
        <>
          {!status.connected ? (
            <div className="bg-linear-to-r from-[#0a2924] via-[#0f3d35] to-zinc-900 text-white rounded-2xl p-7 shadow-md space-y-4">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-emerald-300 text-xs font-semibold border border-white/10">
                <ShieldCheck className="h-4 w-4 text-emerald-400" /> OAuth 2.0 Authorization Required
              </div>
              <h2 className="text-2xl font-extrabold text-white">Connect Your Square POS Account</h2>
              <p className="text-zinc-300 text-xs max-w-xl">
                You must connect your Square Merchant account before running the data import wizard.
              </p>
              <button
                onClick={handleConnect}
                disabled={connecting}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-[#0a2924] hover:bg-zinc-100 font-extrabold text-xs rounded-xl transition shadow-sm cursor-pointer disabled:opacity-50"
              >
                {connecting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-[#0a2924]" />
                    Connecting...
                  </>
                ) : (
                  <>
                    Connect with Square <ExternalLink className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          ) : (
            <SquareImportWizard businessId={busId} />
          )}
        </>
      )}

      {/* TAB CONTENT 2: Connection Status & Catalog Inspection */}
      {activeTab === "status" && (
        <div className="space-y-6">
          {!status.connected ? (
            <div className="bg-linear-to-r from-[#0a2924] via-[#0f3d35] to-zinc-900 text-white rounded-2xl p-7 shadow-md relative overflow-hidden">
              <div className="max-w-2xl space-y-3 relative z-10">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-emerald-300 text-xs font-semibold border border-white/10">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" /> OAuth 2.0 Integration
                </div>
                <h2 className="text-2xl font-extrabold tracking-tight text-white">
                  Connect your Square Merchant Account
                </h2>
                <p className="text-zinc-300 text-xs leading-relaxed max-w-xl">
                  Authorize NexBrix to securely read your catalog items, categories, and tax rates directly from Square API.
                </p>
                <div className="pt-2">
                  <button
                    onClick={handleConnect}
                    disabled={connecting}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-[#0a2924] hover:bg-zinc-100 font-extrabold text-xs rounded-xl transition shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    {connecting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin text-[#0a2924]" />
                        Connecting to Square...
                      </>
                    ) : (
                      <>
                        Connect with Square <ExternalLink className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-emerald-50 border border-emerald-200/80 rounded-2xl p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-extrabold text-zinc-900 text-sm">Square Account Connected</h3>
                      <span className="px-2 py-0.5 text-[10px] uppercase font-bold bg-emerald-200 text-emerald-900 rounded-full">
                        {status.environment || "sandbox"}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-600 mt-0.5">
                      Merchant ID: <span className="font-mono font-bold text-zinc-800">{status.merchant_id || "N/A"}</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Catalog Inspection Table */}
          {status.connected && (
            <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-extrabold text-zinc-900 tracking-tight">
                      Square Catalog Objects
                    </h2>
                    <span className="px-2.5 py-0.5 text-xs bg-[#0a2924]/10 text-[#0a2924] font-bold rounded-full border border-[#0a2924]/20">
                      {filteredCatalog.length} objects
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Catalog data retrieved from Square API (GET /v2/catalog/list).
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {TYPE_FILTER_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => handleTypeChange(opt.value)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                        selectedType === opt.value
                          ? "bg-[#0a2924] text-white shadow-xs"
                          : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <Search className="h-4 w-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search catalog objects by name, type, or ID..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full pl-10 pr-4 py-2 text-xs bg-white border border-zinc-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#0a2924] text-zinc-900 placeholder:text-zinc-400"
                  />
                </div>
              </div>

              {catalogLoading ? (
                <div className="py-12 text-center space-y-2">
                  <Loader2 className="h-6 w-6 text-[#0a2924] animate-spin mx-auto" />
                  <p className="text-xs text-zinc-500 font-semibold">
                    Fetching catalog objects from Square API...
                  </p>
                </div>
              ) : filteredCatalog.length === 0 ? (
                <div className="py-12 text-center space-y-2 border border-dashed border-zinc-200 rounded-xl bg-zinc-50/50">
                  <Package className="h-8 w-8 text-zinc-400 mx-auto" />
                  <div className="text-xs font-bold text-zinc-700">No Catalog Objects Found</div>
                  <p className="text-[11px] text-zinc-500 max-w-sm mx-auto">
                    No objects match your query or selected type filter.
                  </p>
                </div>
              ) : (
                <div className="overflow-hidden rounded-xl border border-zinc-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 font-bold uppercase tracking-wider">
                      <tr>
                        <th className="px-4 py-3">Type</th>
                        <th className="px-4 py-3">Name</th>
                        <th className="px-4 py-3">Object ID</th>
                        <th className="px-4 py-3">Details</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 text-zinc-700 bg-white">
                      {paginatedCatalog.map((item) => (
                        <tr key={item.id} className="hover:bg-zinc-50/70 transition">
                          <td className="px-4 py-3">{getTypeBadge(item.type)}</td>
                          <td className="px-4 py-3 font-extrabold text-zinc-900">{getObjectName(item)}</td>
                          <td className="px-4 py-3 font-mono text-[11px] text-zinc-500">{item.id}</td>
                          <td className="px-4 py-3 text-[11px] text-zinc-500">{getObjectDetails(item)}</td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => setActiveJsonObject(item)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-[#0a2924] bg-zinc-100 hover:bg-zinc-200 rounded-lg transition cursor-pointer"
                            >
                              <Code2 className="h-3.5 w-3.5 text-[#0a2924]" /> JSON
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination Controls */}
              {filteredCatalog.length > ITEMS_PER_PAGE && (
                <div className="flex items-center justify-between pt-2 border-t border-zinc-100 text-xs">
                  <div className="text-zinc-500 font-medium">
                    Page {currentPage} of {totalPages} ({filteredCatalog.length} items)
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="p-1.5 border border-zinc-200 rounded-lg disabled:opacity-40 hover:bg-zinc-50 cursor-pointer"
                    >
                      <ChevronLeft className="h-4 w-4 text-zinc-600" />
                    </button>
                    <button
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="p-1.5 border border-zinc-200 rounded-lg disabled:opacity-40 hover:bg-zinc-50 cursor-pointer"
                    >
                      <ChevronRight className="h-4 w-4 text-zinc-600" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT 3: Import History */}
      {activeTab === "history" && <SquareImportHistory businessId={busId} />}

      {/* Raw JSON Modal */}
      {activeJsonObject && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full border border-zinc-200 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-5 py-3.5 border-b border-zinc-100 flex items-center justify-between bg-zinc-50">
              <div className="flex items-center gap-2">
                <Code2 className="h-4 w-4 text-[#0a2924]" />
                <h3 className="font-extrabold text-zinc-900 text-sm">
                  Catalog Object Raw JSON ({activeJsonObject.type})
                </h3>
              </div>
              <button
                onClick={() => setActiveJsonObject(null)}
                className="p-1 text-zinc-400 hover:text-zinc-700 rounded-lg transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto bg-zinc-950 text-emerald-400 font-mono text-xs leading-relaxed flex-1">
              <pre>{JSON.stringify(activeJsonObject, null, 2)}</pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
