"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";
import { useBusinessStore } from "@/store/business-store";
import {
  getUserBusinesses,
  createBusinessAndLink,
} from "@/lib/repositories/business.repository";
import { Building2, Plus, ArrowRight, LogOut, Loader2, RefreshCw } from "lucide-react";
import { logoutUser } from "@/lib/services/auth.service";
import { Business } from "@/types/business";

export default function BusinessSelectionPage() {
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();
  const { setActiveBusiness } = useBusinessStore();
  const router = useRouter();

  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [newBusinessName, setNewBusinessName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load user's businesses
  useEffect(() => {
    async function loadBusinesses() {
      if (authLoading) return;
      if (!user || !profile) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const data = await getUserBusinesses(profile.businessIds || []);
        setBusinesses(data);
        
        // Auto-select if there is exactly 1 business and no active business is already selected
        const persistedActiveId = typeof window !== "undefined" ? localStorage.getItem("stocktrack_active_business_id") : null;
        if (data.length === 1 && !persistedActiveId) {
          const singleBus = data[0];
          setActiveBusiness(singleBus.id);
          localStorage.setItem("stocktrack_active_business_id", singleBus.id);
          router.push("/dashboard");
        }
      } catch (err) {
        console.error("Failed to load businesses:", err);
        setError("Could not load your businesses. Please reload.");
      } finally {
        setLoading(false);
      }
    }
    loadBusinesses();
  }, [user, profile, authLoading, setActiveBusiness, router]);

  // Handle selecting a business
  const handleSelect = (businessId: string) => {
    setActiveBusiness(businessId);
    localStorage.setItem("stocktrack_active_business_id", businessId);
    router.push("/dashboard");
  };

  // Handle creating a new business
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBusinessName.trim() || !user) return;

    try {
      setCreating(true);
      setError(null);
      
      const created = await createBusinessAndLink(user.uid, newBusinessName.trim());
      
      // Refresh global profile context to include the new businessId
      await refreshProfile();

      // Update state
      const updatedBusinesses = [...businesses, {
        id: created.id,
        name: created.name,
        createdBy: user.uid,
        createdAt: new Date().toISOString(),
        isActive: true,
      }];
      setBusinesses(updatedBusinesses);
      setNewBusinessName("");
      
      // Automatically select the newly created business
      handleSelect(created.id);
    } catch (err) {
      console.error("Failed to create business:", err);
      setError("Failed to create business. Please try again.");
    } finally {
      setCreating(false);
    }
  };

  const handleLogout = async () => {
    await logoutUser();
    router.push("/login");
  };

  if (authLoading || (loading && businesses.length === 0)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white">
        <Loader2 className="h-8 w-8 text-emerald-400 animate-spin mb-4" />
        <p className="text-zinc-400 text-sm">Loading StockTrack profile...</p>
      </div>
    );
  }

  if (!user) {
    if (typeof window !== "undefined") {
      router.push("/login");
    }
    return null;
  }

  return (
    <div className="relative min-h-screen flex flex-col justify-between bg-black text-white overflow-hidden font-sans p-6">
      {/* Glow Effects */}
      <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-emerald-950/20 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-emerald-950/10 blur-[130px] pointer-events-none" />

      {/* Top Navbar */}
      <header className="relative w-full max-w-5xl mx-auto flex justify-between items-center z-10 pt-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shadow-[0_0_10px_rgba(16,185,129,0.1)]">
            <span className="text-emerald-400 font-bold text-lg tracking-tighter">S</span>
          </div>
          <span className="font-extrabold text-lg tracking-tight">StockTrack</span>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors text-xs font-semibold uppercase tracking-wider bg-zinc-900/60 border border-zinc-800/80 px-4 py-2 rounded-xl cursor-pointer"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sign Out
        </button>
      </header>

      {/* Main content grid */}
      <main className="relative w-full max-w-4xl mx-auto z-10 my-auto py-12 flex flex-col items-center">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-extrabold text-white tracking-tight">
            Welcome back, {profile?.fullName || "Operator"}
          </h2>
          <p className="text-zinc-400 text-sm mt-2">
            Select a hospitality business to manage or register a new one to begin.
          </p>
        </div>

        {error && (
          <div className="w-full max-w-xl bg-rose-950/30 border border-rose-800/50 text-rose-400 text-xs rounded-xl p-3 mb-6 text-center">
            {error}
          </div>
        )}

        {businesses.length === 0 ? (
          /* Empty State - Create First Business */
          <div className="w-full max-w-md bg-zinc-900/70 border border-zinc-800/80 p-8 rounded-2xl backdrop-blur-xl hover:border-emerald-500/20 transition-all duration-300">
            <div className="flex flex-col items-center text-center">
              <div className="h-12 w-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mb-4 shadow-[0_0_15px_rgba(16,185,129,0.05)] text-emerald-400">
                <Building2 className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Create your Business profile</h3>
              <p className="text-zinc-500 text-xs mb-6 max-w-xs leading-relaxed">
                You don't have any businesses linked to your account yet. Let's register your first location profile.
              </p>

              <form onSubmit={handleCreate} className="w-full space-y-4">
                <input
                  type="text"
                  placeholder="e.g. Green Bakery & Café"
                  required
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-emerald-500 rounded-xl py-3 px-4 text-sm text-white placeholder-zinc-700 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all"
                  value={newBusinessName}
                  onChange={(e) => setNewBusinessName(e.target.value)}
                  disabled={creating}
                />
                <button
                  type="submit"
                  disabled={creating || !newBusinessName.trim()}
                  className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white rounded-xl py-3 text-sm font-semibold tracking-wide shadow-[0_0_15px_rgba(16,185,129,0.15)] hover:shadow-[0_0_20px_rgba(16,185,129,0.25)] transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {creating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      Register Business
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        ) : (
          /* Business Grid List */
          <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Active Businesses */}
            {businesses.map((bus) => (
              <div
                key={bus.id}
                onClick={() => handleSelect(bus.id)}
                className="bg-zinc-900/60 border border-zinc-800/80 p-6 rounded-2xl cursor-pointer hover:border-emerald-500/60 hover:bg-zinc-900/90 transition-all duration-300 flex flex-col justify-between group h-44 hover:shadow-[0_0_30px_rgba(16,185,129,0.05)] relative overflow-hidden"
              >
                {/* Visual Accent */}
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-emerald-500/10 to-transparent rounded-bl-full pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                <div className="flex justify-between items-start">
                  <div className="h-10 w-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <span className="text-[10px] uppercase font-bold text-zinc-500 bg-zinc-950 border border-zinc-800/50 px-2 py-0.5 rounded-full tracking-wider">
                    Hospitality
                  </span>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-white group-hover:text-emerald-400 transition-colors">
                    {bus.name}
                  </h3>
                  <div className="flex items-center gap-1 text-zinc-500 text-xs mt-1.5 font-medium group-hover:text-zinc-400 transition-colors">
                    <span>Click to launch dashboard</span>
                    <ArrowRight className="h-3 w-3 translate-x-0 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            ))}

            {/* Quick Add Business Dialog Box inline as card */}
            <div className="bg-zinc-900/20 border border-dashed border-zinc-800/80 p-6 rounded-2xl hover:border-zinc-700 hover:bg-zinc-900/30 transition-all duration-300 flex flex-col justify-between h-44">
              <div className="text-left">
                <h4 className="text-sm font-bold text-zinc-300">Add another business</h4>
                <p className="text-zinc-500 text-xs mt-1 leading-relaxed">
                  Manage separate inventory catalogs for another venue.
                </p>
              </div>

              <form onSubmit={handleCreate} className="flex gap-2 mt-4">
                <input
                  type="text"
                  placeholder="e.g. Pizza Shop"
                  required
                  className="flex-1 bg-zinc-950 border border-zinc-800/80 focus:border-zinc-600 rounded-xl py-2.5 px-3.5 text-xs text-white placeholder-zinc-700 focus:outline-none transition-all"
                  value={newBusinessName}
                  onChange={(e) => setNewBusinessName(e.target.value)}
                  disabled={creating}
                />
                <button
                  type="submit"
                  disabled={creating || !newBusinessName.trim()}
                  className="bg-zinc-100 hover:bg-white text-black p-2.5 rounded-xl flex items-center justify-center cursor-pointer transition-colors disabled:opacity-50 shadow-md"
                >
                  {creating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                </button>
              </form>
            </div>
          </div>
        )}
      </main>

      {/* Footer copyright */}
      <footer className="relative w-full max-w-5xl mx-auto flex justify-between items-center z-10 py-4 text-center border-t border-zinc-900/50 text-[10px] uppercase font-semibold tracking-wider text-zinc-600">
        <span>StockTrack System v1.0</span>
        <span>All Rights Reserved &copy; 2026</span>
      </footer>
    </div>
  );
}
