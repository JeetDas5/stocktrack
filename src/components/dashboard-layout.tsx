/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import React, { useEffect, useState, useRef } from "react";
import { HugeiconsIcon, IconSvgElement } from "@hugeicons/react";

import { Business } from "@/types/business";
import { useAuth } from "@/providers/auth-provider";

import api from "@/lib/services/api";
import { useLocationStore } from "@/stores/location-store";
import { useBusinessStore } from "@/stores/business-store";
import sidebarPermissions from "@/config/sidebar-permissions.json";
import { getUserBusinesses } from "@/lib/repositories/business.repository";
import {
  DashboardSquare02Icon,
  Layers01Icon,
  PackageIcon,
  TruckDeliveryIcon,
  ChefHatIcon,
  CheckListIcon,
  Invoice01Icon,
  Analytics01Icon,
  BalanceScaleIcon,
  Logout01Icon,
  Building01Icon,
  ChevronDownIcon,
  Menu01Icon,
  Cancel01Icon,
  ListViewIcon,
  UserGroupIcon,
  Loading01Icon,
  BellIcon,
  MenuTwoLineIcon,
  Settings01Icon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  CheckIcon,
  ShoppingCartIcon,
  FileImportIcon,
  CalendarClockIcon,
  UserIcon,
  ShippingTruck01Icon,
  IdentityCardIcon,
  CalendarPlusIcon,
  CalendarSearchIcon,
  ClockPlusIcon,
  ClockCheckIcon,
  ClipboardClockIcon,
  Briefcase01Icon,
  Location06Icon,
  Location03Icon,
  BankIcon,
} from "@hugeicons/core-free-icons";
import Image from "next/image";

interface SidebarSubLink {
  name: string;
  href: string;
  icon: IconSvgElement;
}

interface SidebarLink {
  name: string;
  href?: string;
  icon: IconSvgElement;
  subLinks?: SidebarSubLink[];
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile, loading: authLoading, logout } = useAuth();
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [locationsLoaded, setLocationsLoaded] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<
    Record<string, boolean>
  >({});
  const [collapsedSubMenus, setCollapsedSubMenus] = useState<
    Record<string, boolean>
  >({});

  const [isReadOnly, setIsReadOnly] = useState<boolean>(false);
  const [userSearch, setUserSearch] = useState("");
  const [showSuperAdminDropdown, setShowSuperAdminDropdown] = useState(false);
  const [allUsers, setAllUsers] = useState<any[]>([]);

  const businessDropdownRef = useRef<HTMLDivElement>(null);
  const locationDropdownRef = useRef<HTMLDivElement>(null);
  const profileDropdownRef = useRef<HTMLDivElement>(null);
  const superAdminDropdownRef = useRef<HTMLDivElement>(null);

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
      if (
        superAdminDropdownRef.current &&
        !superAdminDropdownRef.current.contains(event.target as Node)
      ) {
        setShowSuperAdminDropdown(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsReadOnly(
        localStorage.getItem("stocktrack_super_admin_readonly") === "true",
      );
    }
  }, []);

  const handleReadOnlyToggle = (val: boolean) => {
    setIsReadOnly(val);
    if (typeof window !== "undefined") {
      localStorage.setItem(
        "stocktrack_super_admin_readonly",
        val ? "true" : "false",
      );
    }
  };

  useEffect(() => {
    const isSuperAdmin =
      profile?.role === "super_admin" ||
      (typeof window !== "undefined" &&
        !!localStorage.getItem("stocktrack_impersonated_user_id"));
    if (isSuperAdmin) {
      api
        .get("/api/super-admin/users")
        .then((res) => {
          setAllUsers(res.data);
        })
        .catch((err) => {
          console.error("Failed to load users for super admin:", err);
        });
    }
  }, [profile]);

  const handleUserImpersonate = (userId: string) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("stocktrack_impersonated_user_id", userId);
      localStorage.removeItem("stocktrack_active_business_id");
      localStorage.removeItem("stocktrack_active_location_id");
      window.location.reload();
    }
  };

  const handleStopImpersonating = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("stocktrack_impersonated_user_id");
      localStorage.removeItem("stocktrack_active_business_id");
      localStorage.removeItem("stocktrack_active_location_id");
      window.location.reload();
    }
  };

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
    setShowHeaderBusinessDropdown(false);
  };

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  // const getHeaderBreadcrumb = (path: string) => {
  //   switch (path) {
  //     case "/dashboard/business":
  //       return { title: "Businesses" };
  //     case "/dashboard/locations":
  //       return { title: "Locations" };
  //     case "/dashboard/stock-items":
  //       return { title: "Stock Items" };
  //     case "/dashboard/categories":
  //       return { title: "Categories" };
  //     case "/dashboard/recipes":
  //       return { title: "Recipes" };
  //     case "/dashboard/suppliers":
  //       return { title: "Suppliers" };
  //     case "/dashboard/refill-planner":
  //       return { title: "Refill Planner" };
  //     case "/dashboard/deliveries":
  //       return { title: "Deliveries" };
  //     case "/dashboard/sales":
  //       return { title: "Sales Entry" };
  //     case "/dashboard/sales-imports":
  //       return { title: "Sales Imports" };
  //     case "/dashboard/consumption":
  //       return { title: "Consumption Analysis" };
  //     case "/dashboard/purchase-orders":
  //       return { title: "Purchase Orders" };
  //     case "/dashboard/reconciliation":
  //       return { title: "Reconciliation" };
  //     case "/dashboard/users":
  //       return { title: "Users" };
  //     case "/dashboard/staff-dashboard":
  //       return { title: "Staff Dashboard" };
  //     case "/dashboard/staff-directory":
  //       return { title: "Staff Directory" };
  //     case "/dashboard/timesheet-entry":
  //       return { title: "Timesheet Entry" };
  //     case "/dashboard/timesheet-review":
  //       return { title: "Timesheet Review" };
  //     case "/dashboard/timesheet-reports":
  //       return { title: "Timesheet Reports" };
  //     case "/dashboard/roaster-availablity":
  //       return { title: "Availability Entry" };
  //     case "/dashboard/availability-overview":
  //       return { title: "Availability Overview" };
  //     default:
  //       return { title: "Dashboard" };
  //   }
  // };

  // const pinnedLinks: SidebarLink[] = [
  //   {
  //     name: "Refill Planner",
  //     href: "/dashboard/refill-planner",
  //     icon: ClipboardList,
  //   },
  //   {
  //     name: "Purchase Orders",
  //     href: "/dashboard/purchase-orders",
  //     icon: FileText,
  //   },
  //   { name: "Deliveries", href: "/dashboard/deliveries", icon: PackageOpen },
  // ];

  const inventoryLinks: SidebarLink[] = [
    { name: "Stock Counts", href: "/dashboard/counts", icon: Layers01Icon },
    {
      name: "Restock Planner",
      href: "/dashboard/refill-planner",
      icon: CalendarClockIcon,
    },
    {
      name: "Purchase Orders",
      href: "/dashboard/purchase-orders",
      icon: Invoice01Icon,
    },
    {
      name: "Deliveries",
      href: "/dashboard/deliveries",
      icon: TruckDeliveryIcon,
    },
  ];

  const salesLinks: SidebarLink[] = [
    {
      name: "Manual Entry",
      href: "/dashboard/sales",
      icon: ShoppingCartIcon,
    },
    {
      name: "Sales Imports",
      href: "/dashboard/sales-imports",
      icon: FileImportIcon,
    },
  ];

  const reportsLinks: SidebarLink[] = [
    {
      name: "Consumption",
      href: "/dashboard/consumption",
      icon: Analytics01Icon,
    },
    {
      name: "Reconciliation",
      href: "/dashboard/reconciliation",
      icon: BalanceScaleIcon,
    },
    {
      name: "Reports",
      href: "/dashboard/timesheet-reports",
      icon: Analytics01Icon,
    },
  ];

  const businessSetupLinks: SidebarLink[] = [
    { name: "Business", href: "/dashboard/business", icon: Building01Icon },
    { name: "Locations", href: "/dashboard/locations", icon: Location06Icon },
  ];

  const inventorySetupLinks: SidebarLink[] = [
    { name: "Stock Items", href: "/dashboard/stock-items", icon: PackageIcon },
    { name: "Categories", href: "/dashboard/categories", icon: Layers01Icon },
    {
      name: "Suppliers",
      href: "/dashboard/suppliers",
      icon: ShippingTruck01Icon,
    },
    { name: "Recipes", href: "/dashboard/recipes", icon: ChefHatIcon },
  ];

  const staffLinks: SidebarLink[] = [
    {
      name: "Team Members",
      href: "/dashboard/team-members",
      icon: IdentityCardIcon,
    },
    {
      name: "Roster",
      icon: CalendarClockIcon,
      subLinks: [
        {
          name: "Roster Builder",
          href: "/dashboard/roaster-builder",
          icon: CalendarClockIcon,
        },
        {
          name: "Roster Settings",
          href: "/dashboard/roaster-settings",
          icon: Settings01Icon,
        },
        {
          name: "Availability Entry",
          href: "/dashboard/availablity-entry",
          icon: CalendarPlusIcon,
        },
        {
          name: "Availability Overview",
          href: "/dashboard/availability-overview",
          icon: CalendarSearchIcon,
        },
      ],
    },
    {
      name: "Timesheet",
      icon: ClipboardClockIcon,
      subLinks: [
        {
          name: "Timesheet Entry",
          href: "/dashboard/timesheet-entry",
          icon: ClockPlusIcon,
        },
        {
          name: "Timesheet Review",
          href: "/dashboard/timesheet-review",
          icon: ClockCheckIcon,
        },
        {
          name: "Timesheet Reports",
          href: "/dashboard/timesheet-reports",
          icon: ClipboardClockIcon,
        },
        {
          name: "Timesheet Settings",
          href: "/dashboard/timesheet-settings",
          icon: Settings01Icon,
        },
      ],
    },
  ];

  const accountLinks: SidebarLink[] = [
    { name: "Profile", href: "/dashboard/profile", icon: UserIcon },
  ];

  const userRole = profile?.role || "staff";
  const allowedHrefs =
    sidebarPermissions[userRole as keyof typeof sidebarPermissions] || [];

  const isLinkAllowed = (href: string) => {
    if (allowedHrefs.includes("*")) return true;
    if (href === "/login" || href === "/dashboard/profile") {
      return true;
    }
    return allowedHrefs.includes(href);
  };

  const filterSidebarLinks = (links: SidebarLink[]) => {
    return links
      .map((link) => {
        if (link.subLinks) {
          const allowedSubLinks = link.subLinks.filter((sub) =>
            isLinkAllowed(sub.href),
          );
          if (allowedSubLinks.length === 0) return null;
          return {
            ...link,
            subLinks: allowedSubLinks,
          };
        }
        return link.href && isLinkAllowed(link.href) ? link : null;
      })
      .filter((link): link is SidebarLink => link !== null);
  };

  const filteredInventoryLinks = filterSidebarLinks(inventoryLinks);
  const filteredSalesLinks = filterSidebarLinks(salesLinks);
  const filteredReportsLinks = filterSidebarLinks(reportsLinks);
  const filteredBusinessSetupLinks = filterSidebarLinks(businessSetupLinks);
  const filteredInventorySetupLinks = filterSidebarLinks(inventorySetupLinks);
  const filteredStaffLinks = filterSidebarLinks(staffLinks);
  const filteredAccountLinks = filterSidebarLinks(accountLinks);

  const flatSidebarLinks: SidebarLink[] = [];
  if (isLinkAllowed("/dashboard")) {
    flatSidebarLinks.push({
      name: "Dashboard",
      href: "/dashboard",
      icon: DashboardSquare02Icon,
    });
  }
  const otherLinks = [
    ...inventoryLinks,
    ...salesLinks,
    ...reportsLinks,
    ...businessSetupLinks,
    ...inventorySetupLinks,
    ...staffLinks,
    ...accountLinks,
  ];
  otherLinks.forEach((link) => {
    if (link.subLinks) {
      link.subLinks.forEach((sub) => {
        if (
          isLinkAllowed(sub.href) &&
          !flatSidebarLinks.some((l) => l.href === sub.href)
        ) {
          flatSidebarLinks.push(sub);
        }
      });
    } else if (
      link.href &&
      isLinkAllowed(link.href) &&
      !flatSidebarLinks.some((l) => l.href === link.href)
    ) {
      flatSidebarLinks.push(link);
    }
  });
  if (isLinkAllowed("/dashboard/settings")) {
    flatSidebarLinks.push({
      name: "Settings",
      href: "/dashboard/settings",
      icon: Settings01Icon,
    });
  }

  const isActive = (href: string) => pathname === href;

  const toggleGroup = (groupName: string) => {
    setCollapsedGroups((prev) => {
      const isCurrentlyCollapsed = prev[groupName] !== false;
      return {
        [groupName]: !isCurrentlyCollapsed,
      };
    });
  };

  const isGroupCollapsed = (groupName: string) => {
    return collapsedGroups[groupName] !== false;
  };

  const isSubMenuOpen = (menuName: string, subLinks: SidebarSubLink[]) => {
    if (collapsedSubMenus[menuName] !== undefined) {
      return !collapsedSubMenus[menuName];
    }
    return subLinks.some((sub) => isActive(sub.href));
  };

  const toggleSubMenu = (menuName: string, subLinks: SidebarSubLink[]) => {
    const currentOpen = isSubMenuOpen(menuName, subLinks);
    setCollapsedSubMenus((prev) => ({
      ...prev,
      [menuName]: currentOpen,
    }));
  };

  const groupIcons: Record<string, IconSvgElement> = {
    Inventory: ListViewIcon,
    Sales: ShoppingCartIcon,
    Reports: Analytics01Icon,
    "Business Setup": BankIcon,
    "Inventory Setup": PackageIcon,
    Staff: UserGroupIcon,
    Account: UserIcon,
    Settings: Settings01Icon,
  };

  const renderLink = (
    link: SidebarLink,
    hasGrip = false,
    isCollapsed = false,
  ) => {
    if (link.subLinks) {
      if (isCollapsed) {
        return (
          <React.Fragment key={link.name}>
            {link.subLinks.map((sub) => {
              const active = isActive(sub.href);
              return (
                <Link
                  key={sub.href}
                  href={sub.href}
                  title={sub.name}
                  onClick={(e) => {
                    e.preventDefault();
                    router.push(sub.href);
                    setMobileSidebarOpen(false);
                  }}
                  className={`flex items-center justify-center px-3 py-2 rounded-lg text-black text-sm transition-all duration-400 cursor-pointer ${
                    active ? "bg-primary-50 font-bold" : "hover:bg-gray-soft"
                  }`}
                >
                  <HugeiconsIcon
                    icon={sub.icon}
                    size={18}
                    className="text-black"
                  />
                </Link>
              );
            })}
          </React.Fragment>
        );
      }

      const isOpen = isSubMenuOpen(link.name, link.subLinks);
      const isAnyChildActive = link.subLinks.some((sub) => isActive(sub.href));

      return (
        <div key={link.name} className="space-y-0.5">
          <button
            onClick={() => toggleSubMenu(link.name, link.subLinks!)}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-black text-sm transition-all duration-400 cursor-pointer ${
              isAnyChildActive
                ? "bg-primary-50/40 font-semibold"
                : "hover:bg-gray-soft"
            }`}
          >
            <div className="flex items-center gap-2 text-[16px]">
              <HugeiconsIcon
                icon={link.icon}
                size={18}
                className="text-black"
              />
              <span>{link.name}</span>
            </div>
            <HugeiconsIcon
              icon={ChevronDownIcon}
              size={14}
              className={`text-black transition-transform duration-200 ${
                isOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          <div
            className={`pl-3.5 space-y-0 border-l border-gray-soft ml-5 overflow-hidden transition-all duration-300 ${
              isOpen
                ? "max-h-64 opacity-100 mt-0.5"
                : "max-h-0 opacity-0 pointer-events-none"
            }`}
          >
            {link.subLinks.map((sub) => {
              const active = isActive(sub.href);
              return (
                <Link
                  key={sub.href}
                  href={sub.href}
                  onClick={(e) => {
                    e.preventDefault();
                    router.push(sub.href);
                    setMobileSidebarOpen(false);
                  }}
                  className={`flex items-center justify-between px-3 py-0.5 rounded-lg text-black text-[13px] transition-all duration-400 cursor-pointer ${
                    active ? "bg-primary-50 font-bold" : "hover:bg-gray-soft"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <HugeiconsIcon
                      icon={sub.icon}
                      size={16}
                      className="text-black opacity-80"
                    />
                    <span>{sub.name}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      );
    }

    const active = isActive(link.href!);
    return (
      <Link
        key={link.href}
        href={link.href!}
        title={isCollapsed ? link.name : undefined}
        onClick={(e) => {
          e.preventDefault();
          router.push(link.href!);
          setMobileSidebarOpen(false);
        }}
        className={`flex items-center ${isCollapsed ? "justify-center" : "justify-between"} px-3 py-2 rounded-lg text-black text-sm transition-all duration-400 cursor-pointer ${
          active ? "bg-primary-50 font-bold" : "hover:bg-gray-soft"
        }`}
      >
        <div className="flex items-center gap-2 text-[16px]">
          <HugeiconsIcon icon={link.icon} size={18} className="text-black" />
          {!isCollapsed && <span>{link.name}</span>}
        </div>
        {!isCollapsed && hasGrip && (
          <HugeiconsIcon
            icon={MenuTwoLineIcon}
            size={14}
            className="text-gray-light opacity-0 group-hover:opacity-100 transition-opacity"
          />
        )}
      </Link>
    );
  };

  const renderGroup = (
    groupName: string,
    links: SidebarLink[],
    options?: { hasGrip?: boolean; extraContent?: React.ReactNode },
    isSidebarCollapsed = false,
  ) => {
    if (links.length === 0 && !options?.extraContent) {
      return null;
    }
    const collapsed = isSidebarCollapsed ? false : isGroupCollapsed(groupName);
    const GroupIcon = groupIcons[groupName] || CheckListIcon;

    return (
      <div key={groupName} className="space-y-1">
        {!isSidebarCollapsed ? (
          <button
            onClick={() => toggleGroup(groupName)}
            className="w-full flex items-center justify-between px-3 py-2 cursor-pointer group/header hover:bg-gray-soft/20 rounded-lg transition-colors text-[#546A5D] hover:text-black font-bold"
          >
            <div className="flex items-center gap-2.5">
              <HugeiconsIcon
                icon={GroupIcon}
                size={18}
                className="text-gray-muted group-hover/header:text-black transition-colors"
              />
              <span className="text-[12px] uppercase font-bold tracking-normal">
                {groupName}
              </span>
            </div>
            <HugeiconsIcon
              icon={ChevronDownIcon}
              size={16}
              className={`text-black transition-transform duration-200 ${
                collapsed ? "" : "rotate-180"
              }`}
            />
          </button>
        ) : (
          <div className="border-t border-gray-soft my-2 first:hidden" />
        )}
        <div
          className={`accordion-grid ${collapsed ? "" : "accordion-grid-open"}`}
        >
          <div
            className={`accordion-grid-inner ${isSidebarCollapsed ? "pl-0" : "pl-4"} space-y-0.5`}
          >
            {links.map((link) => {
              const itemKey = link.href || link.name;
              return options?.hasGrip && !isSidebarCollapsed ? (
                <div key={itemKey} className="group relative">
                  {renderLink(link, true, isSidebarCollapsed)}
                </div>
              ) : (
                renderLink(link, false, isSidebarCollapsed)
              );
            })}
            {options?.extraContent &&
              (!isSidebarCollapsed || groupName === "Admin") &&
              (isSidebarCollapsed ? (
                <button
                  onClick={handleLogout}
                  title="Log Out"
                  className="w-full flex items-center justify-center px-3 py-2 rounded-lg text-xs font-bold text-[#546A5D] hover:text-red-500 hover:bg-red-50/50 transition-all cursor-pointer group"
                >
                  <HugeiconsIcon
                    icon={Logout01Icon}
                    size={18}
                    className="text-[#546A5D] group-hover:text-red-500 transition-colors"
                  />
                </button>
              ) : (
                options.extraContent
              ))}
          </div>
        </div>
      </div>
    );
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white text-black">
        <HugeiconsIcon
          icon={Loading01Icon}
          className="h-8 w-8 text-black animate-spin mb-4"
        />
        <p className="text-gray-dark text-sm font-semibold uppercase tracking-wider">
          Syncing dashboard workspace...
        </p>
      </div>
    );
  }

  return (
    <div className="relative h-screen flex bg-white text-black font-sans overflow-x-hidden">
      <aside
        className={`hidden lg:flex flex-col ${sidebarCollapsed ? "w-16 px-2 py-4" : "w-60 p-4"} border-r border-gray-soft bg-white shrink-0 sticky top-0 h-screen z-20 overflow-y-auto scrollbar-thin scrollbar-track-slate-100 scrollbar-thumb-gray-400 hover:scrollbar-thumb-gray-500 transition-all duration-300`}
      >
        <div
          className={`flex items-center ${sidebarCollapsed ? "justify-center" : "justify-between"} mb-5`}
        >
          <Link href="/" className="flex items-center gap-2 md:ml-2">
            <div className="h-8 w-8 rounded-xl bg-white text-black flex items-center justify-center shadow-sm">
              <Image src="/logos/icon.svg" alt="logo" width={50} height={50} />
            </div>
            {!sidebarCollapsed && (
              <span className="font-bold text-base tracking-tight text-primary">
                NexBrix
              </span>
            )}
          </Link>
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-1 rounded-lg hover:bg-gray-soft/30 text-gray-muted hover:text-black cursor-pointer transition-colors"
          >
            <HugeiconsIcon
              icon={sidebarCollapsed ? ChevronsRightIcon : ChevronsLeftIcon}
              size={16}
            />
          </button>
        </div>

        <div
          className={`flex-1 ${userRole === "staff" ? "space-y-1.5" : "space-y-4"}`}
        >
          {userRole === "staff" ? (
            <>
              {flatSidebarLinks.map((link) =>
                renderLink(link, false, sidebarCollapsed),
              )}
              <div className="border-t border-gray-soft my-2" />
              {sidebarCollapsed ? (
                <button
                  onClick={handleLogout}
                  title="Log Out"
                  className="w-full flex items-center justify-center px-3 py-2 rounded-lg text-black hover:text-red-500 hover:bg-red-50/50 transition-all cursor-pointer group animate-fade-in"
                >
                  <HugeiconsIcon
                    icon={Logout01Icon}
                    size={18}
                    className="text-black group-hover:text-red-500 transition-colors"
                  />
                </button>
              ) : (
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-black text-sm hover:text-red-500 hover:bg-red-50/50 transition-all cursor-pointer group animate-fade-in"
                >
                  <HugeiconsIcon
                    icon={Logout01Icon}
                    size={18}
                    className="text-black group-hover:text-red-500 transition-colors"
                  />
                  <span className="group-hover:text-red-500 transition-colors">
                    Log Out
                  </span>
                </button>
              )}
            </>
          ) : (
            <>
              {isLinkAllowed("/dashboard") && (
                <Link
                  href="/dashboard"
                  onClick={(e) => {
                    e.preventDefault();
                    router.push("/dashboard");
                    setMobileSidebarOpen(false);
                  }}
                  className={`flex items-center ${
                    sidebarCollapsed ? "justify-center" : "justify-between"
                  } px-3 py-2 rounded-lg text-[12px] font-bold uppercase tracking-normal cursor-pointer transition-all duration-400 ${
                    sidebarCollapsed
                      ? isActive("/dashboard")
                        ? "bg-primary-50 text-black"
                        : "text-black hover:bg-gray-soft"
                      : isActive("/dashboard")
                        ? "bg-gray-soft/60 text-black"
                        : "text-gray-dark hover:text-black hover:bg-gray-soft/20"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <HugeiconsIcon
                      icon={DashboardSquare02Icon}
                      size={18}
                      className={
                        sidebarCollapsed
                          ? "text-black"
                          : isActive("/dashboard")
                            ? "text-black"
                            : "text-gray-muted"
                      }
                    />
                    {!sidebarCollapsed && <span>Dashboard</span>}
                  </div>
                </Link>
              )}

              {renderGroup(
                "Inventory",
                filteredInventoryLinks,
                undefined,
                sidebarCollapsed,
              )}
              {renderGroup(
                "Sales",
                filteredSalesLinks,
                undefined,
                sidebarCollapsed,
              )}
              {renderGroup(
                "Reports",
                filteredReportsLinks,
                undefined,
                sidebarCollapsed,
              )}
              {renderGroup(
                "Business Setup",
                filteredBusinessSetupLinks,
                undefined,
                sidebarCollapsed,
              )}
              {renderGroup(
                "Inventory Setup",
                filteredInventorySetupLinks,
                undefined,
                sidebarCollapsed,
              )}
              {renderGroup(
                "Staff",
                filteredStaffLinks,
                undefined,
                sidebarCollapsed,
              )}
              {renderGroup(
                "Account",
                filteredAccountLinks,
                {
                  extraContent: (
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-black hover:text-red-500 hover:bg-red-50/50 transition-all cursor-pointer group"
                    >
                      <HugeiconsIcon
                        icon={Logout01Icon}
                        size={18}
                        className="text-black group-hover:text-red-500 transition-colors"
                      />
                      <span className="text-[14px] tracking-normal group-hover:text-red-500 transition-colors">
                        Log Out
                      </span>
                    </button>
                  ),
                },
                sidebarCollapsed,
              )}

              {isLinkAllowed("/dashboard/settings") && (
                <Link
                  href="/dashboard/settings"
                  onClick={(e) => {
                    e.preventDefault();
                    router.push("/dashboard/settings");
                    setMobileSidebarOpen(false);
                  }}
                  className={`flex items-center ${
                    sidebarCollapsed ? "justify-center" : "justify-between"
                  } px-3 py-2 rounded-lg text-[12px] font-bold uppercase tracking-widest cursor-pointer transition-all duration-400 ${
                    sidebarCollapsed
                      ? isActive("/dashboard/settings")
                        ? "bg-primary-50 text-black"
                        : "text-black hover:bg-gray-soft"
                      : isActive("/dashboard/settings")
                        ? "bg-gray-soft/60 text-black"
                        : "text-gray-dark hover:text-black hover:bg-gray-soft/20"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <HugeiconsIcon
                      icon={Settings01Icon}
                      size={18}
                      className={
                        sidebarCollapsed
                          ? "text-black"
                          : isActive("/dashboard/settings")
                            ? "text-black"
                            : "text-gray-muted"
                      }
                    />
                    {!sidebarCollapsed && <span>Settings</span>}
                  </div>
                </Link>
              )}
            </>
          )}
        </div>

        <div
          className={`pt-4 border-t border-gray-soft mt-4 text-[10px] font-bold text-gray-muted ${sidebarCollapsed ? "text-center" : ""}`}
        >
          {sidebarCollapsed ? "v1.0" : "v1.0.0"}
        </div>
      </aside>

      {mobileSidebarOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/40 backdrop-blur-xs z-30 flex animate-fade-in">
          <aside className="w-60 bg-white border-r border-gray-soft p-4 flex flex-col h-full z-45 relative overflow-y-auto">
            <button
              onClick={() => setMobileSidebarOpen(false)}
              className="absolute top-4 right-4 text-gray-muted hover:text-black cursor-pointer transition-colors"
            >
              <HugeiconsIcon icon={Cancel01Icon} size={20} />
            </button>

            <div className="flex items-center gap-2 mb-5">
              <div className="h-8 w-8 rounded-xl bg-black flex items-center justify-center shadow-sm"></div>
              <span className="font-bold text-base tracking-tight text-black">
                NexBrix
              </span>
            </div>

            <div
              className={`flex-1 ${userRole === "staff" ? "space-y-1.5" : "space-y-3"}`}
            >
              {userRole === "staff" ? (
                <>
                  {flatSidebarLinks.map((link) =>
                    renderLink(link, false, false),
                  )}
                  <div className="border-t border-gray-soft my-2" />
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-black text-sm hover:text-red-500 hover:bg-red-50/50 transition-all cursor-pointer group"
                  >
                    <HugeiconsIcon
                      icon={Logout01Icon}
                      size={18}
                      className="text-black group-hover:text-red-500 transition-colors"
                    />
                    <span className="group-hover:text-red-500 transition-colors">
                      Log Out
                    </span>
                  </button>
                </>
              ) : (
                <>
                  {isLinkAllowed("/dashboard") && (
                    <Link
                      href="/dashboard"
                      onClick={(e) => {
                        e.preventDefault();
                        router.push("/dashboard");
                        setMobileSidebarOpen(false);
                      }}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-[12px] font-bold uppercase tracking-widest cursor-pointer transition-all ${
                        isActive("/dashboard")
                          ? "bg-gray-soft/60 text-black"
                          : "text-gray-dark hover:text-black hover:bg-gray-soft/20"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <HugeiconsIcon
                          icon={DashboardSquare02Icon}
                          size={18}
                          className={
                            isActive("/dashboard")
                              ? "text-black"
                              : "text-gray-muted"
                          }
                        />
                        <span>Dashboard</span>
                      </div>
                    </Link>
                  )}
                  {renderGroup("Inventory", filteredInventoryLinks)}
                  {renderGroup("Sales", filteredSalesLinks)}
                  {renderGroup("Reports", filteredReportsLinks)}
                  {renderGroup("Business Setup", filteredBusinessSetupLinks)}
                  {renderGroup("Inventory Setup", filteredInventorySetupLinks)}
                  {renderGroup("Staff", filteredStaffLinks)}
                  {renderGroup("Account", filteredAccountLinks, {
                    extraContent: (
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-bold text-gray-dark hover:text-red-500 hover:bg-red-50/50 cursor-pointer transition-all"
                      >
                        <HugeiconsIcon
                          icon={Logout01Icon}
                          size={18}
                          className="text-gray-muted"
                        />
                        <span>Log Out</span>
                      </button>
                    ),
                  })}
                  {isLinkAllowed("/dashboard/settings") && (
                    <Link
                      href="/dashboard/settings"
                      onClick={(e) => {
                        e.preventDefault();
                        router.push("/dashboard/settings");
                        setMobileSidebarOpen(false);
                      }}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-[12px] font-bold uppercase tracking-widest cursor-pointer transition-all ${
                        isActive("/dashboard/settings")
                          ? "bg-gray-soft/60 text-black"
                          : "text-gray-dark hover:text-black hover:bg-gray-soft/20"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <HugeiconsIcon
                          icon={Settings01Icon}
                          size={18}
                          className={
                            isActive("/dashboard/settings")
                              ? "text-black"
                              : "text-gray-muted"
                          }
                        />
                        <span>Settings</span>
                      </div>
                    </Link>
                  )}
                </>
              )}
            </div>
          </aside>
          <div className="flex-1" onClick={() => setMobileSidebarOpen(false)} />
        </div>
      )}

      <div className="flex-1 h-full flex flex-col relative bg-white min-w-0">
        {/* Super Admin Impersonation Bar */}
        {(profile?.role === "super_admin" ||
          (typeof window !== "undefined" &&
            !!localStorage.getItem("stocktrack_impersonated_user_id"))) && (
          <div className="bg-neutral-950 text-white px-6 py-2.5 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 z-20 select-none">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-[10px] tracking-wide text-amber-500 font-semibold uppercase animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                Super Admin Mode
              </span>
              <span className="text-[12px] text-neutral-400 font-medium">
                Impersonating:{" "}
                <strong className="text-white">
                  {typeof window !== "undefined" &&
                  localStorage.getItem("stocktrack_impersonated_user_id")
                    ? `${profile?.fullName || ""} (${profile?.email || ""})`
                    : "None (Self)"}
                </strong>
              </span>
              {typeof window !== "undefined" &&
                localStorage.getItem("stocktrack_impersonated_user_id") && (
                  <button
                    onClick={handleStopImpersonating}
                    className="ml-2 text-[10px] bg-white/10 hover:bg-white/20 text-white px-2.5 py-1 rounded-md font-bold uppercase transition duration-200 cursor-pointer"
                  >
                    Reset View
                  </button>
                )}
            </div>

            <div className="flex items-center gap-6">
              <label className="relative flex items-center gap-2.5 cursor-pointer text-xs font-semibold select-none">
                <input
                  type="checkbox"
                  checked={isReadOnly}
                  onChange={(e) => handleReadOnlyToggle(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-neutral-800 rounded-full peer peer-focus:ring-2 peer-focus:ring-neutral-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-neutral-400 after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-600 peer-checked:after:bg-white"></div>
                <span
                  className={
                    isReadOnly
                      ? "text-amber-500 animate-pulse"
                      : "text-neutral-400"
                  }
                >
                  {isReadOnly ? "Read-Only Mode Active" : "Read-Only Mode Off"}
                </span>
              </label>

              {/* Searchable User Impersonator Dropdown */}
              <div className="relative" ref={superAdminDropdownRef}>
                <button
                  onClick={() =>
                    setShowSuperAdminDropdown(!showSuperAdminDropdown)
                  }
                  className="flex items-center gap-2 px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 border border-white/10 rounded-full text-xs font-medium text-white transition-all cursor-pointer shadow-sm hover:border-white/20"
                >
                  <span>Select Customer User...</span>
                  <HugeiconsIcon
                    icon={ChevronDownIcon}
                    size={14}
                    className="text-neutral-400"
                  />
                </button>

                {showSuperAdminDropdown && (
                  <div className="absolute right-0 mt-2 w-72 bg-neutral-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-30 animate-fade-in p-2">
                    {/* Search Field */}
                    <div className="relative mb-2">
                      <input
                        type="text"
                        placeholder="Search customer by name or email..."
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                        className="w-full px-3 py-2 bg-neutral-950 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-white/20 focus:ring-1 focus:ring-white/20 transition-all placeholder-neutral-500"
                      />
                    </div>

                    <div className="max-h-56 overflow-y-auto space-y-0.5">
                      {allUsers
                        .filter(
                          (u) =>
                            (u.name || "")
                              .toLowerCase()
                              .includes(userSearch.toLowerCase()) ||
                            (u.email || "")
                              .toLowerCase()
                              .includes(userSearch.toLowerCase()),
                        )
                        .map((u) => {
                          const isSelected =
                            typeof window !== "undefined" &&
                            localStorage.getItem(
                              "stocktrack_impersonated_user_id",
                            ) === u.id;
                          return (
                            <button
                              key={u.id}
                              onClick={() => {
                                handleUserImpersonate(u.id);
                                setShowSuperAdminDropdown(false);
                              }}
                              className={`w-full text-left px-3 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer block ${
                                isSelected
                                  ? "bg-white/10 text-white"
                                  : "text-neutral-400 hover:bg-white/5 hover:text-white"
                              }`}
                            >
                              <div className="font-bold text-white truncate">
                                {u.name || "No Name"}
                              </div>
                              <div className="text-[10px] text-neutral-400 truncate mt-0.5">
                                {u.email}
                              </div>
                            </button>
                          );
                        })}
                      {allUsers.filter(
                        (u) =>
                          (u.name || "")
                            .toLowerCase()
                            .includes(userSearch.toLowerCase()) ||
                          (u.email || "")
                            .toLowerCase()
                            .includes(userSearch.toLowerCase()),
                      ).length === 0 && (
                        <div className="px-3 py-2 text-xs text-neutral-500 text-center">
                          No users found
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        <header className="sticky top-0 z-15 bg-white border-b border-gray-soft w-full">
          <div className="max-w-[1600px] w-full mx-auto px-6 py-2 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setMobileSidebarOpen(true)}
                className="lg:hidden p-1.5 rounded-lg bg-gray-soft/30 text-gray-dark hover:text-black border border-gray-soft/50 transition-colors cursor-pointer"
              >
                <HugeiconsIcon icon={Menu01Icon} size={18} />
              </button>
              <div className="flex items-center gap-2">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-gray-muted uppercase tracking-wider">
                    Business
                  </span>
                  <div className="relative" ref={businessDropdownRef}>
                    <button
                      onClick={() =>
                        setShowHeaderBusinessDropdown(
                          !showHeaderBusinessDropdown,
                        )
                      }
                      className="flex items-center gap-2 px-3 py-1.5 bg-white hover:bg-gray-soft/20 border border-gray-soft rounded-md text-xs font-bold text-black transition duration-200 cursor-pointer shadow-2xs mt-1"
                    >
                      <HugeiconsIcon
                        icon={Briefcase01Icon}
                        size={16}
                        className="text-gray-dark"
                      />
                      <span>
                        {activeBusiness?.name
                          ? activeBusiness.name.length > 20
                            ? activeBusiness.name.substring(0, 20) + "..."
                            : activeBusiness.name
                          : "Select Business"}
                      </span>
                      <HugeiconsIcon
                        icon={ChevronDownIcon}
                        size={14}
                        className="text-gray-muted"
                      />
                    </button>

                    {showHeaderBusinessDropdown && (
                      <div className="absolute left-0 mt-1.5 w-52 bg-white border border-gray-soft rounded-xl shadow-xl overflow-hidden z-30 animate-fade-in">
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
                                    ? "bg-gray-soft/60 text-black"
                                    : "text-gray-dark hover:bg-gray-soft/30 hover:text-black"
                                }`}
                              >
                                <span>{b.name}</span>
                                {isSelected && (
                                  <HugeiconsIcon
                                    icon={CheckIcon}
                                    size={14}
                                    className="text-black"
                                  />
                                )}
                              </button>
                            );
                          })}
                        </div>
                        <div className="border-t border-gray-soft p-1.5 bg-white">
                          <a
                            href="/dashboard/business"
                            onClick={(e) => {
                              e.preventDefault();
                              router.push("/dashboard/business");
                              setShowHeaderBusinessDropdown(false);
                            }}
                            className="w-full text-center py-2 text-[10px] uppercase font-bold tracking-wider text-black hover:text-black block hover:bg-gray-soft/30 rounded-lg transition-colors cursor-pointer"
                          >
                            Manage Business
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {activeBusinessId && (
                <>
                  <div className="flex items-center gap-2">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-gray-muted uppercase tracking-wider">
                        Location
                      </span>
                      <div className="relative" ref={locationDropdownRef}>
                        <button
                          onClick={() =>
                            setShowHeaderLocationDropdown(
                              !showHeaderLocationDropdown,
                            )
                          }
                          className="flex items-center gap-2 px-3 py-1.5 bg-white hover:bg-gray-soft/20 border border-gray-soft rounded-md text-xs font-bold text-black transition duration-200 cursor-pointer shadow-2xs mt-1"
                        >
                          <HugeiconsIcon
                            icon={Location03Icon}
                            size={16}
                            className="text-gray-dark"
                          />
                          <span>
                            {activeLocation?.name
                              ? activeLocation.name.length > 20
                                ? activeLocation.name.substring(0, 20) + "..."
                                : activeLocation.name
                              : "Select Location"}
                          </span>
                          <HugeiconsIcon
                            icon={ChevronDownIcon}
                            size={14}
                            className="text-gray-muted"
                          />
                        </button>

                        {showHeaderLocationDropdown && (
                          <div className="absolute left-0 mt-1.5 w-52 bg-white border border-gray-soft rounded-xl shadow-xl overflow-hidden z-30 animate-fade-in">
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
                                        ? "bg-gray-soft/60 text-black"
                                        : "text-gray-dark hover:bg-gray-soft/30 hover:text-black"
                                    }`}
                                  >
                                    <span>{loc.name}</span>
                                    {isSelected && (
                                      <HugeiconsIcon
                                        icon={CheckIcon}
                                        size={14}
                                        className="text-black"
                                      />
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                            <div className="border-t border-gray-soft p-1.5 bg-white">
                              <a
                                href="/dashboard/locations"
                                onClick={(e) => {
                                  e.preventDefault();
                                  router.push("/dashboard/locations");
                                  setShowHeaderLocationDropdown(false);
                                }}
                                className="w-full text-center py-2 text-[10px] uppercase font-bold tracking-wider text-black hover:text-black block hover:bg-gray-soft/30 rounded-lg transition-colors cursor-pointer"
                              >
                                Manage Locations
                              </a>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center gap-5">
              <button className="relative p-1.5 rounded-full hover:bg-gray-soft/30 text-gray-dark hover:text-black transition-colors cursor-pointer animate-fade-in">
                <HugeiconsIcon icon={BellIcon} size={20} />
                <span className="absolute top-0 right-0 h-4 w-4 bg-black text-white text-[9px] font-extrabold flex items-center justify-center rounded-full ring-2 ring-white">
                  5
                </span>
              </button>
              <div className="h-5 w-px bg-gray-soft" />
              <div
                className="flex items-center gap-3 relative"
                ref={profileDropdownRef}
              >
                <div className="h-9 w-9 rounded-full bg-black text-white flex items-center justify-center font-extrabold text-xs shadow-sm border border-gray-soft">
                  {profile?.fullName
                    ?.split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()
                    .substring(0, 2) || "SM"}
                </div>
                <div className="hidden md:block text-left">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-bold text-black leading-tight">
                      {profile?.fullName || "User name"}
                    </p>
                  </div>
                  <p className="text-[10px] font-bold text-gray-muted mt-0.5">
                    {profile?.role
                      ? profile.role.replace("_", " ").toUpperCase()
                      : "STAFF"}
                  </p>
                </div>
                <button
                  onClick={() => setShowBusinessDropdown(!showBusinessDropdown)}
                  className="p-1 rounded-md hover:bg-gray-soft/30 text-gray-muted hover:text-black cursor-pointer transition-colors"
                >
                  <HugeiconsIcon icon={ChevronDownIcon} size={16} />
                </button>

                {showBusinessDropdown && (
                  <div className="absolute top-full right-0 mt-2 w-40 bg-white border border-gray-soft rounded-xl shadow-xl overflow-hidden z-30 animate-fade-in p-1">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center justify-center gap-2 py-2 text-[10px] uppercase font-bold tracking-wider text-gray-dark hover:text-red-500 hover:bg-red-50/50 rounded-lg transition-colors cursor-pointer"
                    >
                      <HugeiconsIcon
                        icon={Logout01Icon}
                        size={14}
                        className="text-gray-muted"
                      />
                      <span>Log Out</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 pt-4 max-w-[1600px] w-full mx-auto relative select-none bg-white overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
