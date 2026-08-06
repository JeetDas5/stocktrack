"use client";

import { useState } from "react";
import { toast } from "sonner";
import Link from "next/link";
import {
  MapPin,
  Package,
  ShoppingCart,
  Utensils,
  ChevronRight,
  ChevronLeft,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ArrowRight,
  Building2,
  Database,
  Sliders,
  ShieldAlert,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import {
  previewSquareLocationImport,
  executeSquareLocationImport,
  LocationImportItemPreview,
  ExecuteLocationImportItem,
  LocationImportPreviewResponse,
} from "@/lib/repositories/square.repository";

interface SquareImportWizardProps {
  businessId: string;
  onComplete?: () => void;
}

type EntityType = "location" | "items" | "sales" | "recipes";

interface MappedStateItem extends LocationImportItemPreview {
  userAction: "create" | "update" | "skip";
}

export default function SquareImportWizard({
  businessId,
  onComplete,
}: SquareImportWizardProps) {
  const [step, setStep] = useState<number>(1);
  const [selectedEntity, setSelectedEntity] = useState<EntityType>("location");

  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewData, setPreviewData] =
    useState<LocationImportPreviewResponse | null>(null);

  const [mappedItems, setMappedItems] = useState<MappedStateItem[]>([]);

  const [executing, setExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<{
    created_count: number;
    updated_count: number;
    skipped_count: number;
  } | null>(null);

  const handleFetchPreview = async () => {
    if (selectedEntity !== "location") {
      toast.error("Import for this entity type is coming soon.");
      return;
    }
    setLoadingPreview(true);
    try {
      const res = await previewSquareLocationImport(businessId);
      setPreviewData(res);

      const initialMapped: MappedStateItem[] = res.items.map((item) => ({
        ...item,
        userAction: item.default_action,
      }));
      setMappedItems(initialMapped);
      setStep(2);
    } catch (err: unknown) {
      toast.error(
        (err as Error).message || "Failed to fetch data from Square.",
      );
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleUpdateItemMapping = (
    index: number,
    field: keyof MappedStateItem,
    value: unknown,
  ) => {
    setMappedItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleExecuteImport = async () => {
    setExecuting(true);
    try {
      const itemsPayload: ExecuteLocationImportItem[] = mappedItems.map(
        (item) => ({
          square_id: item.square_id,
          square_name: item.square_name,
          mapped_name: item.mapped_name,
          mapped_address: item.mapped_address,
          mapped_type: item.mapped_type,
          mapped_is_warehouse: item.mapped_is_warehouse,
          mapped_is_active: item.mapped_is_active,
          action: item.userAction,
          existing_location_id: item.existing_location_id,
        }),
      );

      const res = await executeSquareLocationImport(businessId, itemsPayload);
      setExecutionResult({
        created_count: res.created_count,
        updated_count: res.updated_count,
        skipped_count: res.skipped_count,
      });
      setStep(6);
      toast.success("Import executed successfully!");
      if (onComplete) onComplete();
    } catch (err: unknown) {
      toast.error((err as Error).message || "Import execution failed.");
    } finally {
      setExecuting(false);
    }
  };

  const confirmedCreateCount = mappedItems.filter(
    (i) => i.userAction === "create",
  ).length;
  const confirmedUpdateCount = mappedItems.filter(
    (i) => i.userAction === "update",
  ).length;
  const confirmedSkipCount = mappedItems.filter(
    (i) => i.userAction === "skip",
  ).length;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-zinc-200/80 p-5 shadow-xs">
        <div className="flex items-center justify-between overflow-x-auto pb-2 gap-4 text-xs font-semibold">
          {[
            { num: 1, label: "Select Data", icon: Layers },
            { num: 2, label: "Import Preview", icon: Database },
            { num: 3, label: "Field Mapping", icon: Sliders },
            { num: 4, label: "Duplicate Check", icon: ShieldAlert },
            { num: 5, label: "Review Changes", icon: Sparkles },
            { num: 6, label: "Complete", icon: CheckCircle2 },
          ].map((s) => {
            const Icon = s.icon;
            const isActive = step === s.num;
            const isCompleted = step > s.num;
            return (
              <div
                key={s.num}
                className={`flex items-center gap-2 shrink-0 ${
                  isActive
                    ? "text-[#0a2924] font-extrabold"
                    : isCompleted
                      ? "text-emerald-600 font-bold"
                      : "text-zinc-400"
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition ${
                    isActive
                      ? "bg-[#0a2924] text-white shadow-xs"
                      : isCompleted
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-zinc-100 text-zinc-500"
                  }`}
                >
                  {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : s.num}
                </div>
                <div className="flex items-center gap-1">
                  <Icon className="h-3.5 w-3.5" />
                  <span>{s.label}</span>
                </div>
                {s.num < 6 && (
                  <ChevronRight className="h-3.5 w-3.5 text-zinc-300 ml-1" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {step === 1 && (
        <div className="bg-white rounded-2xl border border-zinc-200 p-6 space-y-6 shadow-xs">
          <div>
            <h2 className="text-base font-extrabold text-zinc-900">
              Step 1: Select Data to Import from Square
            </h2>
            <p className="text-xs text-zinc-500 mt-1">
              Choose which entity category from your Square merchant account you
              wish to sync into NexBrix.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div
              onClick={() => setSelectedEntity("location")}
              className={`p-5 rounded-2xl border-2 transition cursor-pointer flex flex-col justify-between ${
                selectedEntity === "location"
                  ? "border-[#0a2924] bg-[#0a2924]/5 shadow-xs"
                  : "border-zinc-200 hover:border-zinc-300 bg-white"
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-[#0a2924] text-white flex items-center justify-center">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <span className="px-2.5 py-1 text-[11px] bg-emerald-100 text-emerald-800 font-bold rounded-full border border-emerald-200">
                    Ready to Import
                  </span>
                </div>
                <div>
                  <h3 className="font-extrabold text-zinc-900 text-sm">
                    Locations & Outlets
                  </h3>
                  <p className="text-xs text-zinc-500 mt-1">
                    Import physical stores, warehouses, and locations from
                    Square into NexBrix locations.
                  </p>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-zinc-200/50 flex items-center justify-between text-xs font-bold text-[#0a2924]">
                <span>Configured for 6-step Sync Flow</span>
                <ArrowRight className="h-4 w-4" />
              </div>
            </div>
            <div className="p-5 rounded-2xl border-2 border-zinc-200/70 bg-zinc-50/60 opacity-80 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-zinc-200 text-zinc-600 flex items-center justify-center">
                    <Package className="h-5 w-5" />
                  </div>
                  <span className="px-2.5 py-1 text-[11px] bg-zinc-200 text-zinc-600 font-bold rounded-full">
                    Coming Soon
                  </span>
                </div>
                <div>
                  <h3 className="font-extrabold text-zinc-800 text-sm">
                    Items & Stock Variations
                  </h3>
                  <p className="text-xs text-zinc-500 mt-1">
                    Sync catalog items, SKUs, and inventory variations from
                    Square catalog.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-5 rounded-2xl border-2 border-zinc-200/70 bg-zinc-50/60 opacity-80 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-zinc-200 text-zinc-600 flex items-center justify-center">
                    <ShoppingCart className="h-5 w-5" />
                  </div>
                  <span className="px-2.5 py-1 text-[11px] bg-zinc-200 text-zinc-600 font-bold rounded-full">
                    Coming Soon
                  </span>
                </div>
                <div>
                  <h3 className="font-extrabold text-zinc-800 text-sm">
                    Sales & POS Orders
                  </h3>
                  <p className="text-xs text-zinc-500 mt-1">
                    Stream POS order receipts and sales transactions directly
                    into inventory consumption.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-5 rounded-2xl border-2 border-zinc-200/70 bg-zinc-50/60 opacity-80 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-zinc-200 text-zinc-600 flex items-center justify-center">
                    <Utensils className="h-5 w-5" />
                  </div>
                  <span className="px-2.5 py-1 text-[11px] bg-zinc-200 text-zinc-600 font-bold rounded-full">
                    Coming Soon
                  </span>
                </div>
                <div>
                  <h3 className="font-extrabold text-zinc-800 text-sm">
                    Recipes & Menu Mapping
                  </h3>
                  <p className="text-xs text-zinc-500 mt-1">
                    Sync ingredient recipes and raw stock deduction triggers.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-zinc-100">
            <button
              onClick={handleFetchPreview}
              disabled={loadingPreview}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#0a2924] text-white text-xs font-extrabold rounded-xl hover:bg-[#0a2924]/90 transition shadow-sm cursor-pointer disabled:opacity-50"
            >
              {loadingPreview ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Fetching Square
                  API Data...
                </>
              ) : (
                <>
                  Fetch & Preview Data <ChevronRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {step === 2 && previewData && (
        <div className="bg-white rounded-2xl border border-zinc-200 p-6 space-y-6 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-extrabold text-zinc-900">
                Step 2: Import Data Preview (Square Locations API)
              </h2>
              <p className="text-xs text-zinc-500 mt-1">
                Fetched {previewData.total_found} location record(s) from Square
                API.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-emerald-100 text-emerald-800 font-bold text-xs rounded-full border border-emerald-200">
                {previewData.new_count} New
              </span>
              <span className="px-3 py-1 bg-amber-100 text-amber-800 font-bold text-xs rounded-full border border-amber-200">
                {previewData.duplicate_count} Existing / Duplicates
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {previewData.items.map((item) => (
              <div
                key={item.square_id}
                className="p-4 rounded-xl border border-zinc-200 bg-zinc-50/50 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-extrabold text-zinc-900 text-sm flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-[#0a2924]" />{" "}
                      {item.square_name}
                    </h4>
                    <span className="text-[11px] font-mono text-zinc-500">
                      ID: {item.square_id}
                    </span>
                  </div>
                  <span
                    className={`px-2 py-0.5 text-[10px] font-extrabold uppercase rounded-full ${
                      item.match_status === "duplicate"
                        ? "bg-amber-100 text-amber-800 border border-amber-300"
                        : "bg-emerald-100 text-emerald-800 border border-emerald-300"
                    }`}
                  >
                    {item.match_status === "duplicate"
                      ? "Existing Match Found"
                      : "New Location"}
                  </span>
                </div>

                <div className="space-y-1 text-xs text-zinc-600 bg-white p-3 rounded-lg border border-zinc-200/70">
                  <div>
                    <span className="font-semibold text-zinc-400">
                      Address:{" "}
                    </span>
                    {item.square_address || "No address provided in Square"}
                  </div>
                  <div>
                    <span className="font-semibold text-zinc-400">
                      Type / Status:{" "}
                    </span>
                    {item.square_type} ({item.square_status})
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-zinc-100">
            <button
              onClick={() => setStep(1)}
              className="inline-flex items-center gap-1.5 px-4 py-2 border border-zinc-200 text-zinc-700 text-xs font-bold rounded-xl hover:bg-zinc-50 transition cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" /> Back to Selection
            </button>

            <button
              onClick={() => setStep(3)}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#0a2924] text-white text-xs font-extrabold rounded-xl hover:bg-[#0a2924]/90 transition shadow-sm cursor-pointer"
            >
              Proceed to Field Mapping <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="bg-white rounded-2xl border border-zinc-200 p-6 space-y-6 shadow-xs">
          <div>
            <h2 className="text-base font-extrabold text-zinc-900">
              Step 3: Field Mapping & NexBrix Custom Features
            </h2>
            <p className="text-xs text-zinc-500 mt-1">
              Compare imported Square fields with NexBrix target location fields
              and configure features like Warehouse support.
            </p>
          </div>

          <div className="space-y-4">
            {mappedItems.map((item, idx) => (
              <div
                key={item.square_id}
                className="p-5 rounded-2xl border border-zinc-200 bg-white shadow-2xs space-y-4"
              >
                <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-[#0a2924] text-white flex items-center justify-center text-xs font-extrabold">
                      {idx + 1}
                    </span>
                    <h4 className="font-extrabold text-zinc-900 text-sm">
                      Square Source: {item.square_name}
                    </h4>
                  </div>
                  <span className="text-xs font-mono text-zinc-400">
                    {item.square_id}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-zinc-600 uppercase tracking-wider">
                      NexBrix Location Name
                    </label>
                    <input
                      type="text"
                      value={item.mapped_name}
                      onChange={(e) =>
                        handleUpdateItemMapping(
                          idx,
                          "mapped_name",
                          e.target.value,
                        )
                      }
                      className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl font-semibold text-zinc-900 focus:outline-none focus:ring-1 focus:ring-[#0a2924]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-zinc-600 uppercase tracking-wider">
                      NexBrix Address String
                    </label>
                    <input
                      type="text"
                      value={item.mapped_address}
                      onChange={(e) =>
                        handleUpdateItemMapping(
                          idx,
                          "mapped_address",
                          e.target.value,
                        )
                      }
                      className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl font-semibold text-zinc-900 focus:outline-none focus:ring-1 focus:ring-[#0a2924]"
                    />
                  </div>
                </div>

                <div className="p-3 bg-emerald-50/50 border border-emerald-200/60 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Building2 className="h-4 w-4 text-emerald-700" />
                    <div>
                      <span className="text-xs font-extrabold text-zinc-900">
                        Business Warehouse (Active Business)
                      </span>
                      <p className="text-[11px] text-zinc-500">
                        Creates a business-specific warehouse for bulk storage
                        and fulfillment transfers under your active business.
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={item.mapped_is_warehouse}
                      onChange={(e) =>
                        handleUpdateItemMapping(
                          idx,
                          "mapped_is_warehouse",
                          e.target.checked,
                        )
                      }
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-zinc-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#0a2924]"></div>
                  </label>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-zinc-100">
            <button
              onClick={() => setStep(2)}
              className="inline-flex items-center gap-1.5 px-4 py-2 border border-zinc-200 text-zinc-700 text-xs font-bold rounded-xl hover:bg-zinc-50 transition cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" /> Back to Preview
            </button>

            <button
              onClick={() => setStep(4)}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#0a2924] text-white text-xs font-extrabold rounded-xl hover:bg-[#0a2924]/90 transition shadow-sm cursor-pointer"
            >
              Proceed to Duplicate Check <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="bg-white rounded-2xl border border-zinc-200 p-6 space-y-6 shadow-xs">
          <div>
            <h2 className="text-base font-extrabold text-zinc-900">
              Step 4: Duplicate Detection & Conflict Resolution
            </h2>
            <p className="text-xs text-zinc-500 mt-1">
              Inspect detected duplicate matches in NexBrix database and choose
              an explicit action for each location.
            </p>
          </div>

          <div className="space-y-4">
            {mappedItems.map((item, idx) => (
              <div
                key={item.square_id}
                className={`p-5 rounded-2xl border transition ${
                  item.match_status === "duplicate"
                    ? "border-amber-300 bg-amber-50/20"
                    : "border-emerald-300 bg-emerald-50/20"
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-extrabold text-zinc-900 text-sm">
                        {item.mapped_name}
                      </h4>
                      <span
                        className={`px-2.5 py-0.5 text-[10px] font-extrabold uppercase rounded-full ${
                          item.match_status === "duplicate"
                            ? "bg-amber-100 text-amber-800 border border-amber-300"
                            : "bg-emerald-100 text-emerald-800 border border-emerald-300"
                        }`}
                      >
                        {item.match_status === "duplicate"
                          ? "Duplicate Found"
                          : "New Location"}
                      </span>
                    </div>

                    {item.match_reason && (
                      <p className="text-xs font-semibold text-amber-800 flex items-center gap-1">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        {item.match_reason} (Existing ID:{" "}
                        {item.existing_location_id})
                      </p>
                    )}

                    <p className="text-xs text-zinc-500">
                      Square ID:{" "}
                      <span className="font-mono">{item.square_id}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 bg-white p-1.5 rounded-xl border border-zinc-200 shadow-2xs">
                    <button
                      onClick={() =>
                        handleUpdateItemMapping(idx, "userAction", "create")
                      }
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                        item.userAction === "create"
                          ? "bg-[#0a2924] text-white shadow-xs"
                          : "text-zinc-600 hover:bg-zinc-100"
                      }`}
                    >
                      Create New
                    </button>

                    {item.existing_location_id && (
                      <button
                        onClick={() =>
                          handleUpdateItemMapping(idx, "userAction", "update")
                        }
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                          item.userAction === "update"
                            ? "bg-amber-600 text-white shadow-xs"
                            : "text-zinc-600 hover:bg-zinc-100"
                        }`}
                      >
                        Update Existing
                      </button>
                    )}

                    <button
                      onClick={() =>
                        handleUpdateItemMapping(idx, "userAction", "skip")
                      }
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                        item.userAction === "skip"
                          ? "bg-zinc-700 text-white shadow-xs"
                          : "text-zinc-600 hover:bg-zinc-100"
                      }`}
                    >
                      Skip
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-zinc-100">
            <button
              onClick={() => setStep(3)}
              className="inline-flex items-center gap-1.5 px-4 py-2 border border-zinc-200 text-zinc-700 text-xs font-bold rounded-xl hover:bg-zinc-50 transition cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" /> Back to Mapping
            </button>

            <button
              onClick={() => setStep(5)}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#0a2924] text-white text-xs font-extrabold rounded-xl hover:bg-[#0a2924]/90 transition shadow-sm cursor-pointer"
            >
              Review Final Changes <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {step === 5 && (
        <div className="bg-white rounded-2xl border border-zinc-200 p-6 space-y-6 shadow-xs">
          <div>
            <h2 className="text-base font-extrabold text-zinc-900">
              Step 5: Review Final Action Plan
            </h2>
            <p className="text-xs text-zinc-500 mt-1">
              Verify the exact database modifications that will be executed for
              your locations.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-center">
              <span className="text-2xl font-black text-emerald-800">
                {confirmedCreateCount}
              </span>
              <p className="text-xs font-bold text-emerald-700 mt-0.5">
                Locations to Create
              </p>
            </div>
            <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-center">
              <span className="text-2xl font-black text-amber-800">
                {confirmedUpdateCount}
              </span>
              <p className="text-xs font-bold text-amber-700 mt-0.5">
                Locations to Update
              </p>
            </div>
            <div className="p-4 bg-zinc-100 rounded-xl border border-zinc-200 text-center">
              <span className="text-2xl font-black text-zinc-700">
                {confirmedSkipCount}
              </span>
              <p className="text-xs font-bold text-zinc-600 mt-0.5">
                Locations Skipped
              </p>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-zinc-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 text-zinc-600 font-bold uppercase tracking-wider border-b border-zinc-200">
                <tr>
                  <th className="px-4 py-3">Location Name</th>
                  <th className="px-4 py-3">Address</th>
                  <th className="px-4 py-3">Warehouse Feature</th>
                  <th className="px-4 py-3 text-right">Confirmed Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 bg-white">
                {mappedItems.map((item) => (
                  <tr key={item.square_id}>
                    <td className="px-4 py-3 font-extrabold text-zinc-900">
                      {item.mapped_name}
                    </td>
                    <td className="px-4 py-3 text-zinc-600">
                      {item.mapped_address || "-"}
                    </td>
                    <td className="px-4 py-3">
                      {item.mapped_is_warehouse ? (
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 rounded-full">
                          Warehouse Enabled
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-zinc-100 text-zinc-600 rounded-full">
                          Standard Store
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={`px-2.5 py-1 text-xs font-extrabold rounded-lg uppercase ${
                          item.userAction === "create"
                            ? "bg-emerald-100 text-emerald-800"
                            : item.userAction === "update"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-zinc-100 text-zinc-600"
                        }`}
                      >
                        {item.userAction}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-zinc-100">
            <button
              onClick={() => setStep(4)}
              className="inline-flex items-center gap-1.5 px-4 py-2 border border-zinc-200 text-zinc-700 text-xs font-bold rounded-xl hover:bg-zinc-50 transition cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" /> Back to Duplicate Check
            </button>

            <button
              onClick={handleExecuteImport}
              disabled={executing}
              className="inline-flex items-center gap-2 px-8 py-3 bg-[#0a2924] text-white text-xs font-black rounded-xl hover:bg-[#0a2924]/90 transition shadow-md cursor-pointer disabled:opacity-50"
            >
              {executing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Executing DB
                  Commit...
                </>
              ) : (
                <>
                  Confirm & Execute Import <CheckCircle2 className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {step === 6 && executionResult && (
        <div className="bg-white rounded-2xl border border-zinc-200 p-8 space-y-6 text-center shadow-md max-w-xl mx-auto">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto shadow-xs">
            <CheckCircle2 className="h-10 w-10" />
          </div>

          <div className="space-y-1">
            <h2 className="text-xl font-black text-zinc-900">
              Import Complete!
            </h2>
            <p className="text-xs text-zinc-500">
              Square location data has been mapped and committed into your
              NexBrix database.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 p-4 bg-zinc-50 rounded-2xl border border-zinc-200/80">
            <div>
              <span className="text-xl font-extrabold text-emerald-700">
                {executionResult.created_count}
              </span>
              <p className="text-[11px] font-bold text-zinc-500">Created</p>
            </div>
            <div>
              <span className="text-xl font-extrabold text-amber-700">
                {executionResult.updated_count}
              </span>
              <p className="text-[11px] font-bold text-zinc-500">Updated</p>
            </div>
            <div>
              <span className="text-xl font-extrabold text-zinc-600">
                {executionResult.skipped_count}
              </span>
              <p className="text-[11px] font-bold text-zinc-500">Skipped</p>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => {
                setStep(1);
                setPreviewData(null);
                setMappedItems([]);
              }}
              className="px-5 py-2.5 border border-zinc-200 text-zinc-700 text-xs font-bold rounded-xl hover:bg-zinc-50 transition cursor-pointer"
            >
              Start Another Import
            </button>

            <Link
              href="/dashboard/locations"
              className="inline-flex items-center gap-1.5 px-6 py-2.5 bg-[#0a2924] text-white text-xs font-extrabold rounded-xl hover:bg-[#0a2924]/90 transition shadow-xs cursor-pointer"
            >
              View NexBrix Locations <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
