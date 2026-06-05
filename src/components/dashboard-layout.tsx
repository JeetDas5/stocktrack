/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useRouter, usePathname } from "next/navigation";
import React, { useEffect, useState, useRef } from "react";

import { Business } from "@/types/business";
import { useAuth } from "@/providers/auth-provider";
import { logoutUser } from "@/lib/services/auth.service";
import { useLocationStore } from "@/store/location-store";
import { useBusinessStore } from "@/store/business-store";
import { getUserBusinesses } from "@/lib/repositories/business.repository";
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
  Scale,
  BarChart3,
  Users,
  LogOut,
  Building2,
  ChevronDown,
  Menu,
  X,
  Loader2,
  Bell,
  GripVertical,
  Settings,
  ChevronsLeft,
  Check,
  ShoppingCart,
  FileDown,
  FilePlusCorner,
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
  const [activeBusiness, setActiveBusinessDoc] = useState<Business | null>(
    null,
  );
  const [showBusinessDropdown, setShowBusinessDropdown] = useState(false);
  const [showHeaderBusinessDropdown, setShowHeaderBusinessDropdown] =
    useState(false);
  const [showHeaderLocationDropdown, setShowHeaderLocationDropdown] =
    useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [locationsLoaded, setLocationsLoaded] = useState(false);

  const businessDropdownRef = useRef<HTMLDivElement>(null);
  const locationDropdownRef = useRef<HTMLDivElement>(null);
  const profileDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        businessDropdownRef.current &&
        !businessDropdownRef.current.contains(event.target as Node)
      ) {
        setShowHeaderBusinessDropdown(false);
      }
      if (
        locationDropdownRef.current &&
        !locationDropdownRef.current.contains(event.target as Node)
      ) {
        setShowHeaderLocationDropdown(false);
      }
      if (
        profileDropdownRef.current &&
        !profileDropdownRef.current.contains(event.target as Node)
      ) {
        setShowBusinessDropdown(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const { locations, activeLocationId, setActiveLocation, fetchLocations } =
    useLocationStore();
  const activeLocation =
    locations.find((l) => l.id === activeLocationId) || null;

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.push("/login");
      return;
    }

    if (
      !activeBusinessId ||
      activeBusinessId === "null" ||
      activeBusinessId === "undefined"
    ) {
      if (pathname !== "/dashboard/business") {
        router.push("/dashboard/business");
        return;
      } else {
        setLoading(false);
        return;
      }
    }

    async function loadBusinesses() {
      try {
        const list = await getUserBusinesses();
        setBusinesses(list);
        const activeDoc = list.find((b) => b.id === activeBusinessId) || null;
        if (!activeDoc) {
          // Stale/invalid business ID in store/localStorage. Clear it and redirect.
          setActiveBusiness("");
          localStorage.removeItem("stocktrack_active_business_id");
          router.push("/dashboard/business");
          return;
        }
        setActiveBusinessDoc(activeDoc);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadBusinesses();
  }, [
    user,
    profile,
    authLoading,
    activeBusinessId,
    setActiveBusiness,
    router,
    pathname,
  ]);

  useEffect(() => {
    if (businesses.length > 0 && activeBusinessId) {
      const activeDoc =
        businesses.find((b) => b.id === activeBusinessId) || null;
      setActiveBusinessDoc(activeDoc);
    }
  }, [businesses, activeBusinessId]);

  useEffect(() => {
    if (activeBusinessId) {
      setLocationsLoaded(false);
      fetchLocations(activeBusinessId)
        .then(() => setLocationsLoaded(true))
        .catch(() => setLocationsLoaded(true));
    }
  }, [activeBusinessId, fetchLocations]);

  useEffect(() => {
    if (locations.length > 0) {
      let currentLocId = activeLocationId;
      if (!currentLocId && typeof window !== "undefined") {
        const persisted = localStorage.getItem("stocktrack_active_location_id");
        if (persisted && locations.some((loc) => loc.id === persisted)) {
          setActiveLocation(persisted);
          currentLocId = persisted;
        }
      }
      if (!currentLocId || !locations.some((loc) => loc.id === currentLocId)) {
        setActiveLocation(locations[0].id);
      }
    } else {
      setActiveLocation(null);
    }
  }, [locations, activeLocationId, setActiveLocation]);

  useEffect(() => {
    if (authLoading || loading || !locationsLoaded) return;

    if (activeBusinessId && !activeLocationId) {
      if (
        pathname !== "/dashboard/locations" &&
        pathname !== "/dashboard/business"
      ) {
        router.push("/dashboard/locations");
      }
    }
  }, [
    activeBusinessId,
    activeLocationId,
    pathname,
    authLoading,
    loading,
    locationsLoaded,
    router,
  ]);

  const handleBusinessChange = (id: string) => {
    setActiveBusiness(id);
    localStorage.setItem("stocktrack_active_business_id", id);
    setShowBusinessDropdown(false);
  };

  const handleLogout = async () => {
    await logoutUser();
    router.push("/login");
  };

  const getHeaderBreadcrumb = (path: string) => {
    switch (path) {
      case "/dashboard/business":
        return { title: "Businesses" };
      case "/dashboard/locations":
        return { title: "Locations" };
      case "/dashboard/stock-items":
        return { title: "Stock Items" };
      case "/dashboard/categories":
        return { title: "Categories" };
      case "/dashboard/recipes":
        return { title: "Recipes" };
      case "/dashboard/suppliers":
        return { title: "Suppliers" };
      case "/dashboard/refill-planner":
        return { title: "Refill Planner" };
      case "/dashboard/deliveries":
        return { title: "Deliveries" };
      case "/dashboard/sales":
        return { title: "Sales Entry" };
      case "/dashboard/sales-imports":
        return { title: "Sales Imports" };
      case "/dashboard/consumption":
        return { title: "Consumption Analysis" };
      case "/dashboard/purchase-orders":
        return { title: "Purchase Orders" };
      case "/dashboard/reconciliation":
        return { title: "Reconciliation" };
      case "/dashboard/reports":
        return { title: "Reports" };
      case "/dashboard/users":
        return { title: "Users" };
      default:
        return { title: "Dashboard" };
    }
  };

  const breadcrumb = getHeaderBreadcrumb(pathname);

  const pinnedLinks: SidebarLink[] = [
    {
      name: "Refill Planner",
      href: "/dashboard/refill-planner",
      icon: ClipboardList,
    },
    {
      name: "Purchase Orders",
      href: "/dashboard/purchase-orders",
      icon: FileText,
    },
    { name: "Deliveries", href: "/dashboard/deliveries", icon: PackageOpen },
  ];

  const overviewLinks: SidebarLink[] = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Businesses", href: "/dashboard/business", icon: Building2 },
  ];

  const masterDataLinks: SidebarLink[] = [
    { name: "Locations", href: "/dashboard/locations", icon: MapPin },
    { name: "Suppliers", href: "/dashboard/suppliers", icon: Truck },
    { name: "Categories", href: "/dashboard/categories", icon: Layers },
    { name: "Stock Items", href: "/dashboard/stock-items", icon: Package },
    { name: "Recipes", href: "/dashboard/recipes", icon: ChefHat },
  ];

  const operationsLinks: SidebarLink[] = [
    {
      name: "Refill Planner",
      href: "/dashboard/refill-planner",
      icon: ClipboardList,
    },
    {
      name: "Purchase Orders",
      href: "/dashboard/purchase-orders",
      icon: FileText,
    },
    { name: "Deliveries", href: "/dashboard/deliveries", icon: PackageOpen },
    { name: "Stock Counts", href: "/dashboard/counts", icon: ClipboardList },
  ];

  const salesLinks: SidebarLink[] = [
    { name: "Sales Entry", href: "/dashboard/sales", icon: FilePlusCorner },
    {
      name: "Sales Imports",
      href: "/dashboard/sales-imports",
      icon: FileDown,
    },
  ];

  const analysisLinks: SidebarLink[] = [
    { name: "Consumption", href: "/dashboard/consumption", icon: ShoppingCart },
    { name: "Reconciliation", href: "/dashboard/reconciliation", icon: Scale },
    { name: "Reports", href: "/dashboard/reports", icon: BarChart3 },
  ];

  const adminLinks: SidebarLink[] = [
    { name: "Users", href: "/dashboard/users", icon: Users },
    { name: "Settings", href: "/dashboard/settings", icon: Settings },
  ];

  const isActive = (href: string) => pathname === href;

  const renderLink = (link: SidebarLink, hasGrip = false) => {
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
        className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer ${
          active
            ? "bg-[#DCFCE7] text-[#16A34A]"
            : "text-zinc-600 hover:text-[#0F172A] hover:bg-zinc-200/50"
        }`}
      >
        <div className="flex items-center gap-2.5">
          <link.icon
            className={`h-4.5 w-4.5 ${active ? "text-[#16A34A]" : "text-zinc-400"}`}
          />
          <span>{link.name}</span>
        </div>
        {hasGrip && (
          <GripVertical className="h-3.5 w-3.5 text-zinc-300 opacity-0 group-hover:opacity-100 transition-opacity" />
        )}
      </a>
    );
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F1F5F9] text-[#0F172A]">
        <Loader2 className="h-8 w-8 text-[#16A34A] animate-spin mb-4" />
        <p className="text-[#64748B] text-sm font-semibold uppercase tracking-wider">
          Syncing dashboard workspace...
        </p>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex bg-white text-[#0F172A] font-sans overflow-x-hidden">
      <aside className="hidden lg:flex flex-col w-60 border-r border-zinc-200 bg-[#F1F5F9] shrink-0 sticky top-0 h-screen p-4 z-20 overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-[#DCFCE7] border border-[#16A34A]/20 flex items-center justify-center shadow-sm">
              <span className="text-[#16A34A] font-extrabold text-base tracking-tighter">
                S
              </span>
            </div>
            <span className="font-extrabold text-base tracking-tight text-[#0F172A]">
              StockTrack
            </span>
          </div>
          <button className="p-1 rounded-lg hover:bg-zinc-200/50 text-zinc-400 hover:text-zinc-600">
            <ChevronsLeft className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-5">
          <div className="space-y-1">
            <span className="text-[9px] uppercase font-extrabold tracking-widest text-[#64748B] px-3 block">
              Pinned
            </span>
            <div className="space-y-0.5">
              {pinnedLinks.map((link) => (
                <div key={link.href} className="group relative">
                  {renderLink(link, true)}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-[9px] uppercase font-extrabold tracking-widest text-[#64748B] px-3 block">
              Overview
            </span>
            <div className="space-y-0.5">
              {overviewLinks.map((link) => renderLink(link))}
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-[9px] uppercase font-extrabold tracking-widest text-[#64748B] px-3 block">
              Inventory Setup
            </span>
            <div className="space-y-0.5">
              {masterDataLinks.map((link) => renderLink(link))}
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-[9px] uppercase font-extrabold tracking-widest text-[#64748B] px-3 block">
              Stock Operations
            </span>
            <div className="space-y-0.5">
              {operationsLinks.map((link) => renderLink(link))}
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-[9px] uppercase font-extrabold tracking-widest text-[#64748B] px-3 block">
              Sales & Usage
            </span>
            <div className="space-y-0.5">
              {salesLinks.map((link) => renderLink(link))}
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-[9px] uppercase font-extrabold tracking-widest text-[#64748B] px-3 block">
              Analysis
            </span>
            <div className="space-y-0.5">
              {analysisLinks.map((link) => renderLink(link))}
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-[9px] uppercase font-extrabold tracking-widest text-[#64748B] px-3 block">
              Admin
            </span>
            <div className="space-y-0.5">
              {adminLinks.map((link) => renderLink(link))}
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-bold text-zinc-600 hover:text-[#EF4444] hover:bg-rose-50/50 transition-all cursor-pointer"
              >
                <LogOut className="h-4.5 w-4.5 text-zinc-400" />
                <span>Log Out</span>
              </button>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-zinc-200 mt-4 text-[10px] font-bold text-[#64748B]">
          v1.0.0
        </div>
      </aside>

      {mobileSidebarOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/40 backdrop-blur-xs z-30 flex">
          <aside className="w-60 bg-[#F1F5F9] border-r border-zinc-200 p-4 flex flex-col h-full z-45 relative overflow-y-auto">
            <button
              onClick={() => setMobileSidebarOpen(false)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-900 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2 mb-5">
              <div className="h-7 w-7 rounded-lg bg-[#DCFCE7] border border-[#16A34A]/20 flex items-center justify-center">
                <span className="text-[#16A34A] font-extrabold text-base tracking-tighter">
                  S
                </span>
              </div>
              <span className="font-extrabold text-base tracking-tight text-[#0F172A]">
                StockTrack
              </span>
            </div>

            <div className="flex-1 space-y-5">
              <div className="space-y-1">
                <span className="text-[9px] uppercase font-extrabold tracking-widest text-[#64748B] px-3 block">
                  Pinned
                </span>
                <div className="space-y-0.5">
                  {pinnedLinks.map((link) => renderLink(link))}
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[9px] uppercase font-extrabold tracking-widest text-[#64748B] px-3 block">
                  Overview
                </span>
                <div className="space-y-0.5">
                  {overviewLinks.map((link) => renderLink(link))}
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[9px] uppercase font-extrabold tracking-widest text-[#64748B] px-3 block">
                  Inventory Setup
                </span>
                <div className="space-y-0.5">
                  {masterDataLinks.map((link) => renderLink(link))}
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[9px] uppercase font-extrabold tracking-widest text-[#64748B] px-3 block">
                  Stock Operations
                </span>
                <div className="space-y-0.5">
                  {operationsLinks.map((link) => renderLink(link))}
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[9px] uppercase font-extrabold tracking-widest text-[#64748B] px-3 block">
                  Sales & Usage
                </span>
                <div className="space-y-0.5">
                  {salesLinks.map((link) => renderLink(link))}
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[9px] uppercase font-extrabold tracking-widest text-[#64748B] px-3 block">
                  Analysis
                </span>
                <div className="space-y-0.5">
                  {analysisLinks.map((link) => renderLink(link))}
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[9px] uppercase font-extrabold tracking-widest text-[#64748B] px-3 block">
                  Admin
                </span>
                <div className="space-y-0.5">
                  {adminLinks.map((link) => renderLink(link))}
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-bold text-[#64748B] hover:text-[#EF4444] cursor-pointer"
                  >
                    <LogOut className="h-4.5 w-4.5 text-zinc-400" />
                    <span>Log Out</span>
                  </button>
                </div>
              </div>
            </div>
          </aside>
          <div className="flex-1" onClick={() => setMobileSidebarOpen(false)} />
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0 relative bg-white">
        <header className="sticky top-0 z-15 bg-white border-b border-zinc-200 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden p-1.5 rounded-lg bg-zinc-100 text-zinc-600 hover:text-[#0F172A] border border-zinc-200 transition-colors cursor-pointer"
            >
              <Menu className="h-4.5 w-4.5" />
            </button>
            <div className="text-xs font-extrabold text-[#0F172A]">
              <span className="text-[#0F172A]">{breadcrumb.title}</span>
            </div>

            <div className="h-4 w-px bg-zinc-200 hidden sm:block" />

            <div className="relative" ref={businessDropdownRef}>
              <button
                onClick={() =>
                  setShowHeaderBusinessDropdown(!showHeaderBusinessDropdown)
                }
                className="flex items-center gap-2 px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200/70 border border-zinc-200 rounded-xl text-xs font-extrabold text-[#0F172A] transition duration-200 cursor-pointer shadow-2xs"
              >
                <Building2 className="h-3.5 w-3.5 text-[#16A34A]" />
                <span>
                  {activeBusiness?.name
                    ? activeBusiness.name.length > 20
                      ? activeBusiness.name.substring(0, 20) + "..."
                      : activeBusiness.name
                    : "Select Business"}
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-zinc-400" />
              </button>

              {showHeaderBusinessDropdown && (
                <div className="absolute left-0 mt-1.5 w-52 bg-white border border-zinc-200 rounded-xl shadow-xl overflow-hidden z-30 animate-fade-in">
                  <div className="max-h-56 overflow-y-auto py-1">
                    {businesses.map((b) => {
                      const isSelected = b.id === activeBusinessId;
                      return (
                        <button
                          key={b.id}
                          onClick={() => {
                            handleBusinessChange(b.id);
                            setShowHeaderBusinessDropdown(false);
                          }}
                          className={`w-full flex items-center justify-between px-4 py-2.5 text-xs font-bold transition-colors truncate cursor-pointer ${
                            isSelected
                              ? "bg-[#DCFCE7] text-[#16A34A]"
                              : "text-zinc-700 hover:bg-zinc-100 hover:text-[#0F172A]"
                          }`}
                        >
                          <span>{b.name}</span>
                          {isSelected && (
                            <Check className="h-3.5 w-3.5 text-[#16A34A]" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                  <div className="border-t border-zinc-200 p-1.5 bg-zinc-50">
                    <a
                      href="/dashboard/business"
                      onClick={(e) => {
                        e.preventDefault();
                        router.push("/dashboard/business");
                        setShowHeaderBusinessDropdown(false);
                      }}
                      className="w-full text-center py-2 text-[10px] uppercase font-bold tracking-wider text-[#16A34A] hover:text-[#16A34A] block hover:bg-[#DCFCE7] rounded-lg transition-colors cursor-pointer"
                    >
                      Manage Switcher
                    </a>
                  </div>
                </div>
              )}
            </div>

            {activeBusinessId && (
              <>
                <div className="h-4 w-px bg-zinc-200 hidden sm:block" />
                <div className="relative" ref={locationDropdownRef}>
                  <button
                    onClick={() =>
                      setShowHeaderLocationDropdown(!showHeaderLocationDropdown)
                    }
                    className="flex items-center gap-2 px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200/70 border border-zinc-200 rounded-xl text-xs font-extrabold text-[#0F172A] transition duration-200 cursor-pointer shadow-2xs"
                  >
                    <MapPin className="h-3.5 w-3.5 text-[#16A34A]" />
                    <span>
                      {activeLocation?.name
                        ? activeLocation.name.length > 20
                          ? activeLocation.name.substring(0, 20) + "..."
                          : activeLocation.name
                        : "Select Location"}
                    </span>
                    <ChevronDown className="h-3.5 w-3.5 text-zinc-400" />
                  </button>

                  {showHeaderLocationDropdown && (
                    <div className="absolute left-0 mt-1.5 w-52 bg-white border border-zinc-200 rounded-xl shadow-xl overflow-hidden z-30 animate-fade-in">
                      <div className="max-h-56 overflow-y-auto py-1">
                        {locations.map((loc) => {
                          const isSelected = loc.id === activeLocationId;
                          return (
                            <button
                              key={loc.id}
                              onClick={() => {
                                setActiveLocation(loc.id);
                                setShowHeaderLocationDropdown(false);
                              }}
                              className={`w-full flex items-center justify-between px-4 py-2.5 text-xs font-bold transition-colors truncate cursor-pointer ${
                                isSelected
                                  ? "bg-[#DCFCE7] text-[#16A34A]"
                                  : "text-zinc-700 hover:bg-zinc-100 hover:text-[#0F172A]"
                              }`}
                            >
                              <span>{loc.name}</span>
                              {isSelected && (
                                <Check className="h-3.5 w-3.5 text-[#16A34A]" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                      <div className="border-t border-zinc-200 p-1.5 bg-zinc-50">
                        <a
                          href="/dashboard/locations"
                          onClick={(e) => {
                            e.preventDefault();
                            router.push("/dashboard/locations");
                            setShowHeaderLocationDropdown(false);
                          }}
                          className="w-full text-center py-2 text-[10px] uppercase font-bold tracking-wider text-[#16A34A] hover:text-[#16A34A] block hover:bg-[#DCFCE7] rounded-lg transition-colors cursor-pointer"
                        >
                          Manage Locations
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-5">
            <button className="relative p-1.5 rounded-full hover:bg-zinc-100 text-zinc-600 transition-colors cursor-pointer">
              <Bell className="h-5 w-5" />
              <span className="absolute top-0 right-0 h-4 w-4 bg-[#EF4444] text-white text-[9px] font-extrabold flex items-center justify-center rounded-full ring-2 ring-white">
                5
              </span>
            </button>
            <div className="h-5 w-px bg-zinc-200" />
            <div
              className="flex items-center gap-3 relative"
              ref={profileDropdownRef}
            >
              <div className="h-9 w-9 rounded-full bg-[#16A34A] text-white flex items-center justify-center font-extrabold text-xs shadow-sm border border-[#16A34A]/10">
                {profile?.fullName
                  ?.split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()
                  .substring(0, 2) || "SM"}
              </div>
              <div className="hidden md:block text-left">
                <p className="text-xs font-extrabold text-[#0F172A] leading-tight">
                  {profile?.fullName || "User name"}
                </p>
                <p className="text-[10px] font-bold text-[#64748B]">
                  {profile?.email || "User email"}
                </p>
              </div>
              <button
                onClick={() => setShowBusinessDropdown(!showBusinessDropdown)}
                className="p-1 rounded-md hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600 cursor-pointer"
              >
                <ChevronDown className="h-4 w-4" />
              </button>

              {showBusinessDropdown && (
                <div className="absolute top-full right-0 mt-2 w-48 bg-white border border-zinc-200 rounded-xl shadow-xl overflow-hidden z-30 animate-fade-in">
                  <div className="max-h-48 overflow-y-auto py-1">
                    {businesses
                      .filter((b) => b.id !== activeBusinessId)
                      .map((b) => (
                        <button
                          key={b.id}
                          onClick={() => handleBusinessChange(b.id)}
                          className="w-full text-left px-4 py-2.5 text-xs font-bold text-zinc-700 hover:bg-zinc-100 hover:text-[#0F172A] transition-colors truncate block cursor-pointer"
                        >
                          {b.name}
                        </button>
                      ))}
                  </div>
                  <div className="border-t border-zinc-200 p-1.5 bg-zinc-50">
                    <a
                      href="/dashboard/business"
                      onClick={(e) => {
                        e.preventDefault();
                        router.push("/dashboard/business");
                        setShowBusinessDropdown(false);
                      }}
                      className="w-full text-center py-2 text-[10px] uppercase font-bold tracking-wider text-[#16A34A] hover:text-[#16A34A] block hover:bg-[#DCFCE7] rounded-lg transition-colors cursor-pointer"
                    >
                      Manage Switcher
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 max-w-[1600px] w-full mx-auto relative select-none bg-white">
          {children}
        </main>
      </div>
    </div>
  );
}
