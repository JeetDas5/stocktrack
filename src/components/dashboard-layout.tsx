"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";
import { useBusinessStore } from "@/store/business-store";
import { getUserBusinesses } from "@/lib/repositories/business.repository";
import { logoutUser } from "@/lib/services/auth.service";
import { Business } from "@/types/business";
import {
  LayoutDashboard,
  MapPin,
  Layers,
  Package,
  Truck,
  ChefHat,
  ClipboardList,
  FileText,
  PackageOpen,
  TrendingUp,
  Scale,
  BarChart3,
  Users,
  LogOut,
  Building2,
  ChevronDown,
  Menu,
  X,
  Loader2,
  Settings,
} from "lucide-react";

interface SidebarLink {
  name: string;
  href: string;
  icon: React.ComponentType<any>;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile, loading: authLoading } = useAuth();
  const { activeBusinessId, setActiveBusiness } = useBusinessStore();
  const router = useRouter();
  const pathname = usePathname();

  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [activeBusiness, setActiveBusinessDoc] = useState<Business | null>(null);
  const [showBusinessDropdown, setShowBusinessDropdown] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Sync state with local storage
  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.push("/login");
      return;
    }

    let currentId = activeBusinessId;
    if (!currentId && typeof window !== "undefined") {
      const persisted = localStorage.getItem("stocktrack_active_business_id");
      if (persisted) {
        setActiveBusiness(persisted);
        currentId = persisted;
      }
    }

    if (!currentId && !authLoading) {
      router.push("/business");
      return;
    }

    // Load list of businesses for the switcher
    async function loadBusinesses() {
      try {
        if (profile?.businessIds) {
          const list = await getUserBusinesses(profile.businessIds);
          setBusinesses(list);
          const activeDoc = list.find((b) => b.id === currentId) || null;
          setActiveBusinessDoc(activeDoc);
        }
      } catch (err) {
        console.error("Error loading businesses switcher:", err);
      } finally {
        setLoading(false);
      }
    }
    loadBusinesses();
  }, [user, profile, authLoading, activeBusinessId, setActiveBusiness, router]);

  // Update active doc when switcher updates
  useEffect(() => {
    if (businesses.length > 0 && activeBusinessId) {
      const activeDoc = businesses.find((b) => b.id === activeBusinessId) || null;
      setActiveBusinessDoc(activeDoc);
    }
  }, [businesses, activeBusinessId]);

  const handleBusinessChange = (id: string) => {
    setActiveBusiness(id);
    localStorage.setItem("stocktrack_active_business_id", id);
    setShowBusinessDropdown(false);
    router.push("/dashboard");
  };

  const handleLogout = async () => {
    await logoutUser();
    router.push("/login");
  };

  // Nav Links categories
  const masterDataLinks: SidebarLink[] = [
    { name: "Locations", href: "/dashboard/locations", icon: MapPin },
    { name: "Categories", href: "/dashboard/categories", icon: Layers },
    { name: "Stock Items", href: "/dashboard/stock-items", icon: Package },
    { name: "Suppliers", href: "/dashboard/suppliers", icon: Truck },
    { name: "Recipes", href: "/dashboard/recipes", icon: ChefHat },
  ];

  const operationsLinks: SidebarLink[] = [
    { name: "Refill Planner", href: "/dashboard/refill-planner", icon: ClipboardList },
    { name: "Purchase Orders", href: "/dashboard/purchase-orders", icon: FileText },
    { name: "Deliveries", href: "/dashboard/deliveries", icon: PackageOpen },
    { name: "Sales & CSV Import", href: "/dashboard/sales", icon: TrendingUp },
  ];

  const analysisLinks: SidebarLink[] = [
    { name: "Variance Reconciliation", href: "/dashboard/reconciliation", icon: Scale },
    { name: "Printable Reports", href: "/dashboard/reports", icon: BarChart3 },
  ];

  const adminLinks: SidebarLink[] = [
    { name: "Staff Roster", href: "/dashboard/users", icon: Users },
  ];

  const isActive = (href: string) => pathname === href;

  const renderLink = (link: SidebarLink) => {
    const active = isActive(link.href);
    return (
      <a
        key={link.href}
        href={link.href}
        onClick={(e) => {
          e.preventDefault();
          router.push(link.href);
          setMobileSidebarOpen(false);
        }}
        className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
          active
            ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold shadow-[0_0_15px_rgba(16,185,129,0.05)]"
            : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/60 border border-transparent"
        }`}
      >
        <link.icon className={`h-4.5 w-4.5 transition-colors ${active ? "text-emerald-400" : "text-zinc-500"}`} />
        {link.name}
      </a>
    );
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white">
        <Loader2 className="h-8 w-8 text-emerald-400 animate-spin mb-4" />
        <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wider">
          Syncing dashboard workspace...
        </p>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex bg-black text-zinc-100 font-sans overflow-x-hidden">
      {/* Decorative glows */}
      <div className="absolute top-[-30%] left-[-10%] w-[70%] h-[70%] rounded-full bg-emerald-950/10 blur-[130px] pointer-events-none" />

      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-zinc-900 bg-zinc-950/70 backdrop-blur-xl z-20 shrink-0 sticky top-0 h-screen p-5">
        {/* Branding header */}
        <div className="flex items-center gap-2 mb-6">
          <div className="h-7 w-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shadow-[0_0_8px_rgba(16,185,129,0.1)]">
            <span className="text-emerald-400 font-bold text-base tracking-tighter">S</span>
          </div>
          <span className="font-extrabold text-base tracking-tight text-white">StockTrack</span>
          <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-500 border border-zinc-800">
            V1
          </span>
        </div>

        {/* Business Selector Dropdown */}
        <div className="relative mb-6">
          <button
            onClick={() => setShowBusinessDropdown(!showBusinessDropdown)}
            className="w-full bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800/80 rounded-xl p-3 flex justify-between items-center text-left transition-all duration-200 cursor-pointer focus:outline-none focus:border-emerald-500/30 group"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-7 w-7 rounded-lg bg-emerald-500/5 text-emerald-400 border border-emerald-500/10 flex items-center justify-center shrink-0">
                <Building2 className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider leading-none">Venue</p>
                <p className="text-xs font-bold text-white truncate mt-1">
                  {activeBusiness?.name || "Select Business"}
                </p>
              </div>
            </div>
            <ChevronDown className="h-4 w-4 text-zinc-500 shrink-0 group-hover:text-zinc-300 transition-colors" />
          </button>

          {showBusinessDropdown && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden z-30 backdrop-blur-xl">
              <div className="max-h-48 overflow-y-auto py-1">
                {businesses
                  .filter((b) => b.id !== activeBusinessId)
                  .map((b) => (
                    <button
                      key={b.id}
                      onClick={() => handleBusinessChange(b.id)}
                      className="w-full text-left px-4 py-2.5 text-xs font-bold text-zinc-300 hover:bg-zinc-800/60 hover:text-white transition-colors truncate block cursor-pointer"
                    >
                      {b.name}
                    </button>
                  ))}
              </div>
              <div className="border-t border-zinc-800/80 p-1.5">
                <a
                  href="/business"
                  onClick={(e) => {
                    e.preventDefault();
                    router.push("/business");
                  }}
                  className="w-full text-center py-2 text-[10px] uppercase font-bold tracking-wider text-emerald-400 hover:text-emerald-300 block hover:bg-emerald-500/5 rounded-lg transition-colors cursor-pointer"
                >
                  Manage/Switch Business
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Categories */}
        <div className="flex-1 overflow-y-auto space-y-5 pr-1 py-1 custom-scrollbar">
          {/* Main Dashboard Link */}
          <div>
            <a
              href="/dashboard"
              onClick={(e) => {
                e.preventDefault();
                router.push("/dashboard");
              }}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                isActive("/dashboard")
                  ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold"
                  : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/60 border border-transparent"
              }`}
            >
              <LayoutDashboard className="h-4.5 w-4.5 shrink-0" />
              Overview Dashboard
            </a>
          </div>

          {/* Master Data Group */}
          <div className="space-y-1.5">
            <span className="text-[9px] uppercase font-extrabold tracking-widest text-zinc-600 px-3.5 block">
              Master Data
            </span>
            <div className="space-y-1">{masterDataLinks.map(renderLink)}</div>
          </div>

          {/* Operations Group */}
          <div className="space-y-1.5">
            <span className="text-[9px] uppercase font-extrabold tracking-widest text-zinc-600 px-3.5 block">
              Operations
            </span>
            <div className="space-y-1">{operationsLinks.map(renderLink)}</div>
          </div>

          {/* Analysis Group */}
          <div className="space-y-1.5">
            <span className="text-[9px] uppercase font-extrabold tracking-widest text-zinc-600 px-3.5 block">
              Analytics
            </span>
            <div className="space-y-1">{analysisLinks.map(renderLink)}</div>
          </div>

          {/* Administration Group */}
          <div className="space-y-1.5">
            <span className="text-[9px] uppercase font-extrabold tracking-widest text-zinc-600 px-3.5 block">
              Roster & Admin
            </span>
            <div className="space-y-1">{adminLinks.map(renderLink)}</div>
          </div>
        </div>

        {/* User profile footer */}
        <div className="mt-auto pt-4 border-t border-zinc-900 flex flex-col gap-3">
          <div className="flex items-center justify-between min-w-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-8.5 w-8.5 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0 text-white font-extrabold text-xs shadow-md">
                {profile?.fullName?.substring(0, 2).toUpperCase() || "OP"}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-white truncate leading-none">
                  {profile?.fullName || "Admin User"}
                </p>
                <p className="text-[9px] font-semibold text-zinc-500 uppercase tracking-wide truncate mt-1">
                  {profile?.role || "Administrator"}
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 text-zinc-400 hover:text-white hover:bg-rose-950/20 hover:border-rose-900/40 bg-zinc-900/40 border border-zinc-800/80 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5 text-zinc-500" />
            Logout System
          </button>
        </div>
      </aside>

      {/* Sidebar - Mobile drawer */}
      {mobileSidebarOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-30 flex">
          <aside className="w-64 bg-zinc-950 border-r border-zinc-900 p-5 flex flex-col h-full z-40 relative animate-slide-in">
            {/* Close button */}
            <button
              onClick={() => setMobileSidebarOpen(false)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Branding header */}
            <div className="flex items-center gap-2 mb-6">
              <div className="h-7 w-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                <span className="text-emerald-400 font-bold text-base tracking-tighter">S</span>
              </div>
              <span className="font-extrabold text-base tracking-tight text-white">StockTrack</span>
            </div>

            {/* Active Business Banner */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3.5 mb-6">
              <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider leading-none">Selected Venue</p>
              <p className="text-sm font-bold text-white truncate mt-1">{activeBusiness?.name || "None Selected"}</p>
            </div>

            {/* Navigation links inside drawer */}
            <div className="flex-1 overflow-y-auto space-y-5 pr-1 py-1 custom-scrollbar">
              <div>
                <a
                  href="/dashboard"
                  onClick={(e) => {
                    e.preventDefault();
                    router.push("/dashboard");
                    setMobileSidebarOpen(false);
                  }}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                    isActive("/dashboard")
                      ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold"
                      : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/60 border border-transparent"
                  }`}
                >
                  <LayoutDashboard className="h-4.5 w-4.5" />
                  Overview Dashboard
                </a>
              </div>

              <div className="space-y-1.5">
                <span className="text-[9px] uppercase font-extrabold tracking-widest text-zinc-600 px-3.5 block">
                  Master Data
                </span>
                <div className="space-y-1">{masterDataLinks.map(renderLink)}</div>
              </div>

              <div className="space-y-1.5">
                <span className="text-[9px] uppercase font-extrabold tracking-widest text-zinc-600 px-3.5 block">
                  Operations
                </span>
                <div className="space-y-1">{operationsLinks.map(renderLink)}</div>
              </div>

              <div className="space-y-1.5">
                <span className="text-[9px] uppercase font-extrabold tracking-widest text-zinc-600 px-3.5 block">
                  Analytics
                </span>
                <div className="space-y-1">{analysisLinks.map(renderLink)}</div>
              </div>

              <div className="space-y-1.5">
                <span className="text-[9px] uppercase font-extrabold tracking-widest text-zinc-600 px-3.5 block">
                  Roster & Admin
                </span>
                <div className="space-y-1">{adminLinks.map(renderLink)}</div>
              </div>
            </div>

            {/* Logout footer */}
            <div className="mt-auto pt-4 border-t border-zinc-900">
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5 text-zinc-500" />
                Logout System
              </button>
            </div>
          </aside>
          <div className="flex-1" onClick={() => setMobileSidebarOpen(false)} />
        </div>
      )}

      {/* Main container */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Top Navbar Header */}
        <header className="sticky top-0 z-15 bg-black/50 backdrop-blur-md border-b border-zinc-900/80 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden p-1.5 rounded-lg bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer"
            >
              <Menu className="h-4.5 w-4.5" />
            </button>
            <div>
              <span className="text-[10px] uppercase font-bold text-emerald-400 bg-emerald-500/5 border border-emerald-500/10 px-2 py-0.5 rounded-full tracking-wider leading-none shadow-[0_0_8px_rgba(16,185,129,0.05)]">
                {activeBusiness?.name || "Active Session"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="hidden sm:inline text-xs font-semibold text-zinc-400">
              Session Ref: <span className="font-mono text-white">#{activeBusinessId?.substring(0, 6) || "none"}</span>
            </span>
            <div className="h-4.5 w-px bg-zinc-800" />
            <a
              href="/business"
              className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors font-medium hover:underline"
            >
              <Building2 className="h-3.5 w-3.5 text-zinc-500" />
              Switch Venue
            </a>
          </div>
        </header>

        {/* Active Child Content Area */}
        <main className="flex-1 p-6 max-w-[1600px] w-full mx-auto relative z-10 select-none">
          {children}
        </main>
      </div>
    </div>
  );
}
