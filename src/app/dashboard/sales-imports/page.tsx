"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useBusinessStore } from "@/store/business-store";
import { getLocations } from "@/lib/repositories/location.repository";
import { getRecipes } from "@/lib/repositories/recipe.repository";
import {
  getSalesImports,
  previewSalesImport,
  confirmSalesImport,
} from "@/lib/repositories/sale.repository";
import { Location, Recipe, SalesImport } from "@/types/inventory";
import {
  Upload,
  FileSpreadsheet,
  Trash2,
  CheckCircle,
  History,
  X,
  ArrowRight,
  TrendingUp,
  MapPin,
  Loader2,
  AlertCircle,
  ChevronRight,
} from "lucide-react";

export default function SalesImportsPage() {
  const { activeBusinessId } = useBusinessStore();
  const [step, setStep] = useState<number>(1);
  const [locations, setLocations] = useState<Location[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [previewData, setPreviewData] = useState<{
    filename: string;
    fileSize: string;
    headers: string[];
    rows: string[][];
    totalRows: number;
    autoMapping: Record<string, string>;
  } | null>(null);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({
    date: "",
    time: "",
    item_name: "",
    category: "",
    quantity: "",
    unit_price: "",
    discount: "",
    net_sales: "",
  });
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [importHistory, setImportHistory] = useState<SalesImport[]>([]);
  const [showAllRows, setShowAllRows] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadInitialData = useCallback(async () => {
    if (!activeBusinessId) return;
    try {
      const locList = await getLocations(activeBusinessId);
      setLocations(locList);
      if (locList.length > 0) {
        setSelectedLocationId(locList[0].id);
      }
      const recList = await getRecipes(activeBusinessId);
      setRecipes(recList);
    } catch (err) {
      console.error(err);
    }
  }, [activeBusinessId]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const loadImportHistory = useCallback(async () => {
    if (!activeBusinessId) return;
    try {
      const history = await getSalesImports(activeBusinessId);
      setImportHistory(history);
    } catch (err) {
      console.error(err);
    }
  }, [activeBusinessId]);

  useEffect(() => {
    if (showHistory) {
      loadImportHistory();
    }
  }, [showHistory, loadImportHistory]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.name.endsWith(".csv")) {
        await processFile(droppedFile);
      } else {
        setErrorMsg("Please upload a valid CSV file format.");
      }
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await processFile(e.target.files[0]);
    }
  };

  const processFile = async (selectedFile: File) => {
    if (!activeBusinessId) return;
    setErrorMsg("");
    setIsUploading(true);
    setFile(selectedFile);
    try {
      const data = await previewSalesImport(activeBusinessId, selectedFile);
      setPreviewData(data);
      setColumnMapping({
        date: data.autoMapping.date || "",
        time: data.autoMapping.time || "",
        item_name: data.autoMapping.item_name || "",
        category: data.autoMapping.category || "",
        quantity: data.autoMapping.quantity || "",
        unit_price: data.autoMapping.unit_price || "",
        discount: data.autoMapping.discount || "",
        net_sales: data.autoMapping.net_sales || "",
      });
      const hasRequired =
        data.autoMapping.date &&
        data.autoMapping.item_name &&
        data.autoMapping.quantity &&
        data.autoMapping.unit_price;
      setStep(hasRequired ? 3 : 2);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(
        err.response?.data?.detail || "Failed to process the uploaded file.",
      );
      setFile(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleMappingChange = (key: string, value: string) => {
    const updated = { ...columnMapping, [key]: value };
    setColumnMapping(updated);
    const requiredMapped =
      updated.date &&
      updated.item_name &&
      updated.quantity &&
      updated.unit_price;
    if (requiredMapped && step < 3) {
      setStep(3);
    } else if (!requiredMapped && step >= 3) {
      setStep(2);
    }
  };

  const handleResetMapping = () => {
    if (previewData) {
      setColumnMapping({
        date: previewData.autoMapping.date || "",
        time: previewData.autoMapping.time || "",
        item_name: previewData.autoMapping.item_name || "",
        category: previewData.autoMapping.category || "",
        quantity: previewData.autoMapping.quantity || "",
        unit_price: previewData.autoMapping.unit_price || "",
        discount: previewData.autoMapping.discount || "",
        net_sales: previewData.autoMapping.net_sales || "",
      });
      setStep(2);
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    setPreviewData(null);
    setColumnMapping({
      date: "",
      time: "",
      item_name: "",
      category: "",
      quantity: "",
      unit_price: "",
      discount: "",
      net_sales: "",
    });
    setStep(1);
    setErrorMsg("");
  };

  const getStats = () => {
    if (!previewData) {
      return {
        totalRows: 0,
        mapped: 0,
        unmapped: 0,
        duplicates: 0,
        dateRange: "-",
      };
    }
    const itemIndex = previewData.headers.indexOf(columnMapping.item_name);
    const dateIndex = previewData.headers.indexOf(columnMapping.date);
    const qtyIndex = previewData.headers.indexOf(columnMapping.quantity);
    const priceIndex = previewData.headers.indexOf(columnMapping.unit_price);
    const timeIndex = previewData.headers.indexOf(columnMapping.time);

    let mapped = 0;
    let unmapped = 0;
    let duplicates = 0;
    const dates: string[] = [];
    const seenRows = new Set<string>();

    const recipeNamesLower = new Set(
      recipes.map((r) => r.recipeName.toLowerCase().trim()),
    );

    previewData.rows.forEach((row) => {
      const itemName =
        itemIndex !== -1 && itemIndex < row.length ? row[itemIndex].trim() : "";
      const dateVal =
        dateIndex !== -1 && dateIndex < row.length ? row[dateIndex].trim() : "";
      const qtyVal =
        qtyIndex !== -1 && qtyIndex < row.length ? row[qtyIndex].trim() : "";
      const priceVal =
        priceIndex !== -1 && priceIndex < row.length
          ? row[priceIndex].trim()
          : "";
      const timeVal =
        timeIndex !== -1 && timeIndex < row.length ? row[timeIndex].trim() : "";

      if (!itemName) return;

      if (dateVal) {
        dates.push(dateVal);
      }

      if (recipeNamesLower.has(itemName.toLowerCase())) {
        mapped++;
      } else {
        unmapped++;
      }

      const rowKey = `${dateVal}|${timeVal}|${itemName}|${qtyVal}|${priceVal}`;
      if (seenRows.has(rowKey)) {
        duplicates++;
      } else {
        seenRows.add(rowKey);
      }
    });

    let dateRange = "-";
    if (dates.length > 0) {
      const formatString = (dStr: string) => {
        const parts = dStr.split(/[\/\-]/);
        if (parts.length === 3) {
          const day = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10);
          const year = parseInt(parts[2], 10);
          if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
            const dateObj = new Date(year, month - 1, day);
            const mLabel = dateObj.toLocaleString("en-US", { month: "short" });
            return `${day} ${mLabel} ${year}`;
          }
        }
        return dStr;
      };
      const formatted = dates.map(formatString);
      const minD = formatted.sort()[0];
      const maxD = formatted[formatted.length - 1];
      dateRange = minD === maxD ? minD : `${minD} - ${maxD}`;
    }

    return {
      totalRows: previewData.totalRows,
      mapped,
      unmapped,
      duplicates,
      dateRange,
    };
  };

  const handleConfirmImport = async () => {
    if (!activeBusinessId || !previewData || !file) return;
    setIsImporting(true);
    setStep(4);
    try {
      await confirmSalesImport(activeBusinessId, {
        filename: previewData.filename,
        fileSize: previewData.fileSize,
        locationId: selectedLocationId,
        columnMapping,
        headers: previewData.headers,
        rows: previewData.rows,
      });
      setStep(5);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(
        err.response?.data?.detail || "Import failed. Please verify mappings.",
      );
      setStep(3);
    } finally {
      setIsImporting(false);
    }
  };

  const stats = getStats();
  const currentBusinessName = "Main Kitchen";
  const selectedLocationName =
    locations.find((l) => l.id === selectedLocationId)?.name ||
    "Unknown Location";

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[#0F172A]">
            Sales Imports
          </h1>
          <p className="text-xs text-[#64748B] mt-1">
            Import sales from CSV files, POS exports or sales reports.
          </p>
        </div>
        <button
          onClick={() => setShowHistory(true)}
          className="flex items-center gap-1.5 border border-zinc-200 hover:border-zinc-300 rounded-xl px-4 py-2.5 text-xs font-bold text-zinc-700 bg-white hover:bg-zinc-50 shadow-xs transition duration-200 cursor-pointer"
        >
          <History className="h-4 w-4 text-zinc-400" />
          <span>Import History</span>
        </button>
      </div>

      <div className="bg-[#F8FAFC] border border-zinc-200 rounded-2xl p-4 flex items-center justify-between overflow-x-auto gap-4">
        {[
          { id: 1, label: "Upload File", desc: "Select your file" },
          { id: 2, label: "Map Columns", desc: "Map to system fields" },
          { id: 3, label: "Preview Data", desc: "Review imported data" },
          { id: 4, label: "Review & Confirm", desc: "Validate and confirm" },
          { id: 5, label: "Import Complete", desc: "Update inventory" },
        ].map((s, idx) => {
          const isActive = step === s.id;
          const isDone = step > s.id;
          return (
            <React.Fragment key={s.id}>
              <div className="flex items-center gap-3 shrink-0">
                <div
                  className={`h-8 w-8 rounded-full flex items-center justify-center font-extrabold text-xs border ${
                    isActive
                      ? "bg-[#16A34A] text-white border-[#16A34A]"
                      : isDone
                        ? "bg-[#DCFCE7] text-[#16A34A] border-[#16A34A]/20"
                        : "bg-white text-zinc-400 border-zinc-200"
                  }`}
                >
                  {isDone ? <CheckCircle className="h-4.5 w-4.5" /> : s.id}
                </div>
                <div>
                  <p
                    className={`text-xs font-extrabold leading-none ${
                      isActive ? "text-[#0F172A]" : "text-zinc-500"
                    }`}
                  >
                    {s.label}
                  </p>
                  <p className="text-[10px] font-semibold text-zinc-400 mt-0.5">
                    {s.desc}
                  </p>
                </div>
              </div>
              {idx < 4 && (
                <ChevronRight className="h-4 w-4 text-zinc-300 shrink-0" />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {errorMsg && (
        <div className="bg-rose-50 border border-rose-100 rounded-xl p-3.5 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-rose-800">An error occurred</p>
            <p className="text-xs text-rose-700 mt-0.5">{errorMsg}</p>
          </div>
        </div>
      )}

      {step === 5 ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white border border-zinc-200 rounded-2xl p-8 flex flex-col items-center justify-center text-center space-y-5">
            <div className="h-16 w-16 bg-[#DCFCE7] rounded-full flex items-center justify-center border border-[#16A34A]/10 text-[#16A34A] animate-bounce">
              <CheckCircle className="h-8 w-8" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-[#0F172A]">
                Import Completed Successfully!
              </h3>
              <p className="text-xs text-[#64748B] mt-1.5 max-w-md">
                Your sales records have been mapped and registered. The stock
                levels for the associated ingredients have been updated
                automatically.
              </p>
            </div>
            <div className="bg-[#F8FAFC] border border-zinc-100 rounded-xl p-4 w-full max-w-md grid grid-cols-2 gap-4 text-left">
              <div>
                <p className="text-[10px] font-bold text-[#64748B] uppercase">
                  Business Location
                </p>
                <p className="text-xs font-extrabold text-[#0F172A] mt-0.5">
                  {selectedLocationName}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-[#64748B] uppercase">
                  Date Range
                </p>
                <p className="text-xs font-extrabold text-[#0F172A] mt-0.5">
                  {stats.dateRange}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-[#64748B] uppercase">
                  Total Mapped Rows
                </p>
                <p className="text-xs font-extrabold text-[#16A34A] mt-0.5">
                  {stats.mapped} Rows
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-[#64748B] uppercase">
                  Unmapped (Skipped)
                </p>
                <p className="text-xs font-extrabold text-amber-600 mt-0.5">
                  {stats.unmapped} Rows
                </p>
              </div>
            </div>
            <button
              onClick={handleRemoveFile}
              className="flex items-center gap-1.5 bg-[#16A34A] hover:bg-emerald-700 text-white rounded-xl px-5 py-3 text-xs font-extrabold transition shadow-xs cursor-pointer"
            >
              <span>Import Another File</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          <div className="bg-white border border-zinc-200 rounded-2xl p-5 space-y-4">
            <h3 className="text-xs font-extrabold text-[#0F172A] uppercase tracking-wider">
              System Guidelines
            </h3>
            <div className="space-y-3.5">
              <div className="flex gap-2.5">
                <CheckCircle className="h-4.5 w-4.5 text-[#16A34A] shrink-0 mt-0.5" />
                <p className="text-xs text-[#64748B] leading-relaxed">
                  Ingredient stock logs have been updated for all recipes that
                  were matched during column mapping.
                </p>
              </div>
              <div className="flex gap-2.5">
                <CheckCircle className="h-4.5 w-4.5 text-[#16A34A] shrink-0 mt-0.5" />
                <p className="text-xs text-[#64748B] leading-relaxed">
                  Unmapped items (not in stocktrack recipes) were excluded
                  safely from inventory calculation.
                </p>
              </div>
              <div className="flex gap-2.5">
                <CheckCircle className="h-4.5 w-4.5 text-[#16A34A] shrink-0 mt-0.5" />
                <p className="text-xs text-[#64748B] leading-relaxed">
                  Transactions grouped by timestamp have been successfully
                  logged under individual sale records.
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {step === 1 ? (
              <div
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-[#16A34A]/30 hover:border-[#16A34A]/60 bg-white hover:bg-zinc-50/50 rounded-2xl p-8 flex flex-col lg:flex-row items-center justify-between gap-6 cursor-pointer transition duration-300 shadow-xs"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".csv"
                  className="hidden"
                />
                <div className="flex flex-col lg:flex-row items-center gap-5 text-center lg:text-left">
                  <div className="h-16 w-16 bg-[#DCFCE7] rounded-2xl flex items-center justify-center border border-[#16A34A]/10 text-[#16A34A] shrink-0 shadow-xs">
                    {isUploading ? (
                      <Loader2 className="h-7 w-7 animate-spin" />
                    ) : (
                      <Upload className="h-7 w-7" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-[#0F172A]">
                      Upload your sales file
                    </h3>
                    <p className="text-xs text-[#64748B] mt-1 max-w-sm">
                      CSV, Excel (.xlsx, .xls), or upload a sales report
                      screenshot / PDF
                    </p>
                    <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2.5 mt-4">
                      <button
                        type="button"
                        className="bg-[#16A34A] hover:bg-[#16A34A]/90 text-white rounded-xl px-4 py-2.5 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <FileSpreadsheet className="h-4 w-4" />
                        <span>Upload CSV / Excel</span>
                      </button>
                      <button
                        type="button"
                        className="bg-white hover:bg-zinc-100 border border-zinc-200 text-zinc-700 rounded-xl px-4 py-2.5 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <Upload className="h-4 w-4 text-zinc-400" />
                        <span>Upload Screenshot / PDF</span>
                      </button>
                    </div>
                    <p className="text-[10px] text-zinc-400 font-semibold mt-3">
                      or drag and drop file here
                    </p>
                  </div>
                </div>
                <div className="bg-[#F8FAFC] border border-zinc-100 rounded-xl p-4 shrink-0 text-left w-full lg:w-56 space-y-2.5">
                  <p className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">
                    Supported formats
                  </p>
                  <div className="space-y-1.5">
                    {[
                      { ext: "CSV (.csv)", ok: true },
                      { ext: "Excel (.xlsx, .xls)", ok: true },
                      { ext: "PDF (.pdf)", ok: true },
                      { ext: "Image (JPG, PNG)", ok: true },
                    ].map((f) => (
                      <div key={f.ext} className="flex items-center gap-1.5">
                        <CheckCircle className="h-3.5 w-3.5 text-[#16A34A]" />
                        <span className="text-[10px] font-extrabold text-[#0F172A]">
                          {f.ext}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-zinc-200 pt-2 text-[10px] font-semibold text-[#64748B]">
                    Maximum file size: 20 MB
                  </div>
                </div>
              </div>
            ) : (
              previewData && (
                <div className="bg-white border border-zinc-200 rounded-2xl p-5 space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 bg-[#DCFCE7] rounded-xl flex items-center justify-center border border-[#16A34A]/10 text-[#16A34A]">
                        <FileSpreadsheet className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-extrabold text-[#0F172A] max-w-xs sm:max-w-md truncate">
                          {previewData.filename}
                        </h4>
                        <div className="flex items-center gap-2 text-[10px] font-bold text-[#64748B] mt-0.5">
                          <span>{previewData.fileSize}</span>
                          <span className="h-1 w-1 bg-zinc-300 rounded-full" />
                          <span>
                            Uploaded on{" "}
                            {new Date().toLocaleDateString("en-US", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="bg-[#DCFCE7]/60 text-[#16A34A] text-[10px] font-bold px-2 py-0.5 rounded-full border border-[#16A34A]/10">
                        Ready
                      </div>
                      <button
                        onClick={handleRemoveFile}
                        className="p-2 rounded-xl text-zinc-400 hover:text-[#EF4444] bg-zinc-50 hover:bg-rose-50 border border-zinc-200 hover:border-rose-100 transition duration-200 cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3.5">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-extrabold text-[#0F172A]">
                        Preview Data (first 10 rows)
                      </h3>
                      <p className="text-[10px] font-semibold text-[#64748B]">
                        Previewing first 10 rows. You can review all rows after
                        mapping.
                      </p>
                    </div>
                    <div className="border border-zinc-200 rounded-xl overflow-hidden overflow-x-auto bg-[#F8FAFC]">
                      <table className="w-full text-left text-xs font-bold text-[#0F172A] border-collapse min-w-[700px]">
                        <thead>
                          <tr className="bg-zinc-100 border-b border-zinc-200">
                            <th className="px-4 py-2.5 font-extrabold text-zinc-500 w-12 text-center">
                              #
                            </th>
                            <th className="px-4 py-2.5 font-extrabold text-zinc-500">
                              Date
                            </th>
                            <th className="px-4 py-2.5 font-extrabold text-zinc-500">
                              Time
                            </th>
                            <th className="px-4 py-2.5 font-extrabold text-zinc-500">
                              Item Name
                            </th>
                            <th className="px-4 py-2.5 font-extrabold text-zinc-500">
                              Category
                            </th>
                            <th className="px-4 py-2.5 font-extrabold text-zinc-500 text-center">
                              Qty
                            </th>
                            <th className="px-4 py-2.5 font-extrabold text-zinc-500 text-right">
                              Unit Price
                            </th>
                            <th className="px-4 py-2.5 font-extrabold text-zinc-500 text-right">
                              Discount
                            </th>
                            <th className="px-4 py-2.5 font-extrabold text-[#16A34A] text-right">
                              Net Sales
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white">
                          {previewData.rows.slice(0, 10).map((row, idx) => {
                            const dateIdx = previewData.headers.indexOf(
                              columnMapping.date,
                            );
                            const timeIdx = previewData.headers.indexOf(
                              columnMapping.time,
                            );
                            const itemIdx = previewData.headers.indexOf(
                              columnMapping.item_name,
                            );
                            const catIdx = previewData.headers.indexOf(
                              columnMapping.category,
                            );
                            const qtyIdx = previewData.headers.indexOf(
                              columnMapping.quantity,
                            );
                            const priceIdx = previewData.headers.indexOf(
                              columnMapping.unit_price,
                            );
                            const discIdx = previewData.headers.indexOf(
                              columnMapping.discount,
                            );
                            const netIdx = previewData.headers.indexOf(
                              columnMapping.net_sales,
                            );

                            const dVal =
                              dateIdx !== -1 && dateIdx < row.length
                                ? row[dateIdx]
                                : "-";
                            const tVal =
                              timeIdx !== -1 && timeIdx < row.length
                                ? row[timeIdx]
                                : "-";
                            const iVal =
                              itemIdx !== -1 && itemIdx < row.length
                                ? row[itemIdx]
                                : "-";
                            const cVal =
                              catIdx !== -1 && catIdx < row.length
                                ? row[catIdx]
                                : "-";
                            const qVal =
                              qtyIdx !== -1 && qtyIdx < row.length
                                ? row[qtyIdx]
                                : "-";
                            const pVal =
                              priceIdx !== -1 && priceIdx < row.length
                                ? row[priceIdx]
                                : "-";
                            const diVal =
                              discIdx !== -1 && discIdx < row.length
                                ? row[discIdx]
                                : "-";
                            const nVal =
                              netIdx !== -1 && netIdx < row.length
                                ? row[netIdx]
                                : "-";

                            return (
                              <tr
                                key={idx}
                                className="border-b border-zinc-100 hover:bg-zinc-50/50"
                              >
                                <td className="px-4 py-2.5 text-zinc-400 text-center font-semibold">
                                  {idx + 1}
                                </td>
                                <td className="px-4 py-2.5">{dVal}</td>
                                <td className="px-4 py-2.5">{tVal}</td>
                                <td className="px-4 py-2.5 truncate max-w-[150px]">
                                  {iVal}
                                </td>
                                <td className="px-4 py-2.5 text-zinc-500 font-semibold">
                                  {cVal}
                                </td>
                                <td className="px-4 py-2.5 text-center">
                                  {qVal}
                                </td>
                                <td className="px-4 py-2.5 text-right">
                                  {pVal}
                                </td>
                                <td className="px-4 py-2.5 text-right text-zinc-400 font-semibold">
                                  {diVal}
                                </td>
                                <td className="px-4 py-2.5 text-right text-[#16A34A] font-extrabold">
                                  {nVal}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-semibold text-[#64748B]">
                        Showing first 10 of {previewData.totalRows} rows
                      </p>
                      <button
                        onClick={() => setShowAllRows(true)}
                        className="text-[10px] font-bold text-[#16A34A] hover:text-emerald-700 bg-[#DCFCE7] hover:bg-[#DCFCE7]/80 rounded-lg px-3 py-1.5 transition cursor-pointer"
                      >
                        View All Rows
                      </button>
                    </div>
                  </div>
                </div>
              )
            )}
          </div>

          <div className="space-y-6">
            <div className="bg-white border border-zinc-200 rounded-2xl p-5 space-y-4 shadow-2xs">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                <h3 className="text-xs font-extrabold text-[#0F172A] uppercase tracking-wider">
                  Location Mapping
                </h3>
                <MapPin className="h-4 w-4 text-zinc-400" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-[#64748B] uppercase">
                  Import Destination
                </label>
                <select
                  value={selectedLocationId}
                  onChange={(e) => setSelectedLocationId(e.target.value)}
                  className="w-full bg-white border border-zinc-200 rounded-xl py-2.5 px-3 text-xs font-bold text-[#0F172A] focus:outline-none focus:border-[#16A34A] focus:ring-1 focus:ring-[#16A34A]"
                >
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name} ({loc.type})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="bg-white border border-zinc-200 rounded-2xl p-5 space-y-4 shadow-2xs">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                <h3 className="text-xs font-extrabold text-[#0F172A] uppercase tracking-wider">
                  Column Mapping
                </h3>
                <button
                  onClick={handleResetMapping}
                  disabled={!previewData}
                  className="text-[10px] font-extrabold text-[#16A34A] hover:text-emerald-700 disabled:text-zinc-400 transition cursor-pointer"
                >
                  Reset
                </button>
              </div>
              <p className="text-[10px] font-semibold text-[#64748B]">
                Map your file columns to StockTrack fields.
              </p>

              <div className="space-y-3.5">
                {[
                  { key: "date", label: "Date", required: true },
                  { key: "time", label: "Time", required: false },
                  { key: "item_name", label: "Item", required: true },
                  { key: "category", label: "Category", required: false },
                  { key: "quantity", label: "Quantity", required: true },
                  { key: "unit_price", label: "Unit Price", required: true },
                  { key: "discount", label: "Discount", required: false },
                  { key: "net_sales", label: "Net Sales", required: false },
                ].map((f) => (
                  <div
                    key={f.key}
                    className="flex items-center justify-between gap-4"
                  >
                    <span className="text-[11px] font-bold text-[#0F172A] shrink-0">
                      {f.label}{" "}
                      {f.required && (
                        <span className="text-rose-500 font-extrabold">*</span>
                      )}
                    </span>
                    <select
                      value={columnMapping[f.key]}
                      disabled={!previewData}
                      onChange={(e) =>
                        handleMappingChange(f.key, e.target.value)
                      }
                      className="w-36 bg-white border border-zinc-200 rounded-xl py-2 px-3 text-[10px] font-bold text-[#0F172A] focus:outline-none focus:border-[#16A34A] focus:ring-1 focus:ring-[#16A34A] disabled:bg-zinc-50 disabled:text-zinc-400"
                    >
                      <option value="">Unmapped</option>
                      {previewData?.headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white border border-zinc-200 rounded-2xl p-5 space-y-4 shadow-2xs">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                <h3 className="text-xs font-extrabold text-[#0F172A] uppercase tracking-wider">
                  Import Summary
                </h3>
                <TrendingUp className="h-4 w-4 text-zinc-400" />
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-[#64748B]">Total Rows</span>
                  <span className="text-[#0F172A] font-extrabold">
                    {stats.totalRows}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-[#64748B]">Mapped</span>
                  <span className="text-[#16A34A] font-extrabold">
                    {stats.mapped}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-[#64748B]">Unmapped</span>
                  <span className="text-amber-600 font-extrabold">
                    {stats.unmapped}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-[#64748B]">Duplicates</span>
                  <span className="text-purple-600 font-extrabold">
                    {stats.duplicates}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-[#64748B]">Date Range</span>
                  <span className="text-[#0F172A] font-extrabold text-right truncate max-w-[150px]">
                    {stats.dateRange}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-[#64748B]">Business</span>
                  <span className="text-[#0F172A] font-extrabold">
                    {currentBusinessName}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-[#64748B]">Import Type</span>
                  <span className="text-[#0F172A] font-extrabold">
                    Sales (Consumption Update)
                  </span>
                </div>
              </div>

              {previewData && step >= 3 && (
                <div className="bg-[#DCFCE7] border border-[#16A34A]/10 text-emerald-800 rounded-xl p-3 flex items-start gap-2.5">
                  <CheckCircle className="h-4 w-4 text-[#16A34A] shrink-0 mt-0.5" />
                  <p className="text-[10px] font-semibold leading-relaxed">
                    After import, consumption and inventory will be updated.
                    Auto-saved.
                  </p>
                </div>
              )}

              <button
                onClick={handleConfirmImport}
                disabled={!previewData || step < 3 || isImporting}
                className="w-full bg-[#16A34A] hover:bg-emerald-700 text-white rounded-xl py-3.5 text-xs font-extrabold transition duration-200 flex items-center justify-center gap-1.5 cursor-pointer disabled:bg-zinc-200 disabled:text-zinc-400 disabled:cursor-not-allowed shadow-xs"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Processing Import...</span>
                  </>
                ) : (
                  <>
                    <span>Review & Confirm Import</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {showHistory && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-zinc-200 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50">
              <div className="flex items-center gap-2.5">
                <History className="h-5 w-5 text-[#16A34A]" />
                <h2 className="text-sm font-extrabold text-[#0F172A]">
                  Sales Imports History
                </h2>
              </div>
              <button
                onClick={() => setShowHistory(false)}
                className="p-1 rounded-lg hover:bg-zinc-200 text-zinc-400 hover:text-zinc-600 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto flex-1 bg-white">
              {importHistory.length === 0 ? (
                <div className="text-center py-12 space-y-3">
                  <div className="h-12 w-12 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-300 mx-auto">
                    <FileSpreadsheet className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="text-xs font-extrabold text-zinc-700">
                      No import history found
                    </h4>
                    <p className="text-[10px] text-zinc-400 mt-1">
                      Upload your first CSV file to log transactional history.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="border border-zinc-200 rounded-xl overflow-hidden overflow-x-auto">
                  <table className="w-full text-left text-xs font-bold border-collapse">
                    <thead>
                      <tr className="bg-zinc-100 border-b border-zinc-200 text-[#64748B]">
                        <th className="px-4 py-2.5 font-extrabold">Filename</th>
                        <th className="px-4 py-2.5 font-extrabold">
                          Upload Date
                        </th>
                        <th className="px-4 py-2.5 font-extrabold text-center">
                          Total Rows
                        </th>
                        <th className="px-4 py-2.5 font-extrabold text-center text-[#16A34A]">
                          Mapped
                        </th>
                        <th className="px-4 py-2.5 font-extrabold text-center text-amber-600">
                          Unmapped
                        </th>
                        <th className="px-4 py-2.5 font-extrabold">
                          Date Range
                        </th>
                        <th className="px-4 py-2.5 font-extrabold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="text-[#0F172A] bg-white">
                      {importHistory.map((imp) => (
                        <tr
                          key={imp.id}
                          className="border-b border-zinc-100 hover:bg-zinc-50/50"
                        >
                          <td
                            className="px-4 py-3 font-extrabold truncate max-w-[200px]"
                            title={imp.filename}
                          >
                            {imp.filename}
                          </td>
                          <td className="px-4 py-3 text-zinc-500">
                            {new Date(imp.createdAt).toLocaleDateString(
                              "en-US",
                              {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              },
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {imp.rowCount}
                          </td>
                          <td className="px-4 py-3 text-center text-[#16A34A]">
                            {imp.mappedCount}
                          </td>
                          <td className="px-4 py-3 text-center text-amber-600">
                            {imp.unmappedCount}
                          </td>
                          <td className="px-4 py-3 text-zinc-500 font-semibold">
                            {imp.dateRange}
                          </td>
                          <td className="px-4 py-3">
                            <span className="bg-[#DCFCE7] text-[#16A34A] text-[9px] font-bold px-2 py-0.5 rounded-full border border-[#16A34A]/10">
                              {imp.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="px-5 py-3.5 border-t border-zinc-100 bg-zinc-50 flex justify-end">
              <button
                onClick={() => setShowHistory(false)}
                className="bg-white hover:bg-zinc-100 border border-zinc-200 text-zinc-700 rounded-xl px-4 py-2 text-xs font-bold transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showAllRows && previewData && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-zinc-200 rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50">
              <div className="flex items-center gap-2.5">
                <FileSpreadsheet className="h-5 w-5 text-[#16A34A]" />
                <h2 className="text-sm font-extrabold text-[#0F172A]">
                  All Uploaded Rows Preview ({previewData.totalRows} rows)
                </h2>
              </div>
              <button
                onClick={() => setShowAllRows(false)}
                className="p-1 rounded-lg hover:bg-zinc-200 text-zinc-400 hover:text-zinc-600 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto flex-1 bg-white">
              <div className="border border-zinc-200 rounded-xl overflow-hidden overflow-x-auto">
                <table className="w-full text-left text-xs font-bold border-collapse min-w-[800px]">
                  <thead>
                    <tr className="bg-zinc-100 border-b border-zinc-200 text-[#64748B]">
                      <th className="px-4 py-2.5 font-extrabold w-12 text-center">
                        #
                      </th>
                      {previewData.headers.map((h) => (
                        <th key={h} className="px-4 py-2.5 font-extrabold">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="text-[#0F172A] bg-white">
                    {previewData.rows.map((row, idx) => (
                      <tr
                        key={idx}
                        className="border-b border-zinc-100 hover:bg-zinc-50/50"
                      >
                        <td className="px-4 py-2.5 text-zinc-400 text-center font-semibold">
                          {idx + 1}
                        </td>
                        {row.map((col, cIdx) => (
                          <td key={cIdx} className="px-4 py-2.5">
                            {col}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="px-5 py-3.5 border-t border-zinc-100 bg-zinc-50 flex justify-end">
              <button
                onClick={() => setShowAllRows(false)}
                className="bg-white hover:bg-zinc-100 border border-zinc-200 text-zinc-700 rounded-xl px-4 py-2 text-xs font-bold transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
