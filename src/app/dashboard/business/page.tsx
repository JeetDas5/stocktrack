"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";
import { useBusinessStore } from "@/stores/business-store";
import {
  getUserBusinesses,
  createBusinessAndLink,
} from "@/lib/repositories/business.repository";
import {
  Building2,
  Plus,
  ChevronRight,
  Loader2,
  Search,
  Lock,
  MapPin,
  Package,
} from "lucide-react";
import { Business } from "@/types/business";
import { toast } from "sonner";

export default function DashboardBusinessPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();
  const { activeBusinessId, setActiveBusiness } = useBusinessStore();

  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [newBusinessName, setNewBusinessName] = useState("");
  const [creating, setCreating] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    async function loadBusinesses() {
      if (authLoading) return;
      if (!user || !profile) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const data = await getUserBusinesses();
        setBusinesses(data);

        const persistedActiveId =
          typeof window !== "undefined"
            ? localStorage.getItem("stocktrack_active_business_id")
            : null;
        if (data.length === 1 && !persistedActiveId) {
          const singleBus = data[0];
          setActiveBusiness(singleBus.id);
          localStorage.setItem("stocktrack_active_business_id", singleBus.id);
        }
      } catch (err) {
        console.error("Failed to load businesses:", err);
        toast.error("Could not load your businesses. Please reload.");
      } finally {
        setLoading(false);
      }
    }
    loadBusinesses();
  }, [user, profile, authLoading, setActiveBusiness]);

  const handleSelect = (businessId: string) => {
    setActiveBusiness(businessId);
    localStorage.setItem("stocktrack_active_business_id", businessId);
    router.push("/dashboard/locations");
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = newBusinessName.trim();
    if (!trimmedName || !user) return;

    if (trimmedName.length > 100) {
      toast.error("Business name must be 100 characters or less.");
      return;
    }

    if (!/[a-zA-Z0-9]/.test(trimmedName)) {
      toast.error("Business name cannot contain only special characters.");
      return;
    }

    try {
      setCreating(true);

      const created = await createBusinessAndLink(user.uid, trimmedName);
      await refreshProfile();

      const newBusiness: Business = {
        id: created.id,
        name: created.name,
        createdBy: user.uid,
        createdAt: new Date().toISOString(),
        isActive: true,
        locationsCount: 0,
        itemsCount: 0,
      };

      setBusinesses([...businesses, newBusiness]);
      setNewBusinessName("");
      setShowAddModal(false);
      toast.success("Business profile created successfully!");

      handleSelect(created.id);
    } catch (err: unknown) {
      console.error("Failed to create business:", err);
      toast.error(
        (err as Error).message ||
          "Failed to create business. Please try again.",
      );
    } finally {
      setCreating(false);
    }
  };

  const filteredBusinesses = businesses.filter((bus) =>
    bus.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  if (authLoading || (loading && businesses.length === 0)) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-[#0F172A]">
        <Loader2 className="h-8 w-8 text-[#16A34A] animate-spin mb-4" />
        <p className="text-[#64748B] text-sm font-bold tracking-wide">
          Syncing workspaces...
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl w-full mx-auto px-4 py-8 flex flex-col justify-start">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10">
        <div>
          <h1 className="text-3xl font-extrabold text-[#0F172A] tracking-tight">
            Select business
          </h1>
          <p className="text-[#64748B] text-xs font-bold mt-1.5">
            Choose the business you want to manage.
          </p>
        </div>

        {(profile?.role === "admin" || profile?.role === "super_admin") && (
          <button
            onClick={() => {
              setShowAddModal(true);
            }}
            className="border-2 border-[#16A34A] text-[#16A34A] bg-white hover:bg-[#DCFCE7]/20 px-5 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 shadow-xs"
          >
            <Plus className="h-4 w-4 stroke-[3px]" />
            Add business
          </button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center mb-6">
        <div className="relative w-full sm:max-w-md">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
            <Search className="h-4 w-4" />
          </span>
          <input
            type="text"
            placeholder="Search businesses..."
            className="w-full bg-white border border-zinc-200 focus:border-[#16A34A] rounded-xl py-2.5 pl-10 pr-4 text-xs text-zinc-950 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-[#16A34A] transition-all shadow-xs"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {filteredBusinesses.length === 0 ? (
        <div className="bg-white border border-zinc-200 rounded-2xl py-16 px-6 text-center flex flex-col items-center justify-center shadow-sm">
          <Building2 className="h-10 w-10 text-zinc-300 mb-3" />
          <h3 className="text-base font-bold text-[#0F172A]">
            No businesses found
          </h3>
          <p className="text-[#64748B] text-xs mt-1 font-semibold max-w-xs leading-relaxed">
            No registered business profiles match your search criteria. Register
            a new business to begin.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredBusinesses.map((bus) => {
            const isSelected = bus.id === activeBusinessId;
            return (
              <div
                key={bus.id}
                onClick={() => handleSelect(bus.id)}
                className={`w-full bg-white border p-5 rounded-2xl flex items-center justify-between transition-all duration-250 cursor-pointer shadow-xs group ${
                  isSelected
                    ? "border-[#16A34A] ring-1 ring-[#16A34A] shadow-md shadow-zinc-200/40"
                    : "border-zinc-200/80 hover:border-[#16A34A]/30 shadow-zinc-100 hover:shadow-md hover:shadow-zinc-200/40"
                }`}
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="h-12 w-12 rounded-full bg-[#DCFCE7] text-[#16A34A] flex items-center justify-center shrink-0 border border-[#16A34A]/10 shadow-xs">
                    <Building2 className="h-5 w-5 stroke-[2.5px]" />
                  </div>

                  <div className="text-left min-w-0">
                    <h3 className="text-base font-bold text-[#0F172A] group-hover:text-[#16A34A] transition-colors truncate">
                      {bus.name}
                    </h3>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-[#64748B] mt-1.5 font-bold">
                      <span className="flex items-center gap-1 shrink-0">
                        <MapPin className="h-3.5 w-3.5 text-zinc-400" />
                        {bus.locationsCount}{" "}
                        {bus.locationsCount === 1 ? "location" : "locations"}
                      </span>
                      <span className="text-zinc-300">•</span>
                      <span className="flex items-center gap-1 shrink-0">
                        <Package className="h-3.5 w-3.5 text-zinc-400" />
                        {bus.itemsCount} stock{" "}
                        {bus.itemsCount === 1 ? "item" : "items"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <span
                    className={`text-[10px] uppercase font-extrabold px-3 py-1 rounded-full flex items-center gap-1.5 border shadow-2xs leading-none ${
                      bus.isActive !== false
                        ? "bg-[#DCFCE7] text-[#16A34A] border-[#16A34A]/10"
                        : "bg-zinc-100 text-[#64748B] border-zinc-200"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                        bus.isActive !== false ? "bg-[#16A34A]" : "bg-[#64748B]"
                      }`}
                    />
                    {bus.isActive !== false ? "Active" : "Inactive"}
                  </span>
                  <ChevronRight className="h-5 w-5 text-zinc-400 group-hover:text-[#16A34A] transition-colors" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex items-center gap-1.5 justify-center py-4 mt-6 text-[#64748B] text-xs font-bold uppercase tracking-wider">
        <Lock className="h-3.5 w-3.5 text-zinc-400" />
        <span>Only businesses you have access to are shown.</span>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-2xl max-w-md w-full mx-4 animate-scale-up">
            <h3 className="text-lg font-extrabold text-[#0F172A] mb-2">
              Create business profile
            </h3>
            <p className="text-[#64748B] text-xs mb-5 font-semibold leading-relaxed">
              Register a new business venue to manage inventory and
              reconciliation counts.
            </p>

            <form onSubmit={handleCreate} className="space-y-4">
              <input
                type="text"
                placeholder="e.g. Starbucks"
                required
                maxLength={100}
                className="w-full bg-white border border-zinc-300 focus:border-[#16A34A] rounded-xl py-3 px-4 text-sm text-zinc-950 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-[#16A34A] transition-all"
                value={newBusinessName}
                onChange={(e) => setNewBusinessName(e.target.value)}
                disabled={creating}
              />

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                  }}
                  className="bg-[#F1F5F9] hover:bg-zinc-200 text-zinc-700 rounded-xl px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
                  disabled={creating}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || !newBusinessName.trim()}
                  className="bg-[#16A34A] hover:bg-[#15803D] text-white rounded-xl px-4 py-2.5 text-xs font-bold uppercase tracking-wider shadow-sm flex items-center gap-2 cursor-pointer transition-colors disabled:opacity-50"
                >
                  {creating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Add business"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
