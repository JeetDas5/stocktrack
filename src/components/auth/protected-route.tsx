"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

import { useAuth } from "@/providers/auth-provider";
import Loading from "@/app/loading";
import sidebarPermissions from "@/config/sidebar-permissions.json";
import { getPostLoginRedirect } from "@/lib/auth/get-post-login-redirect";

/** Exact paths that trigger a redirect to the user's "home" route. */
const DASHBOARD_ROOT_PATHS = ["/dashboard", "/dashboard/"];

/**
 * Routes that belong to a specific module — users need both role permission
 * AND that module enabled to access them.
 */
const MODULE_ROUTES: Record<string, string[]> = {
  timesheet: [
    "/dashboard/team-members",
    "/dashboard/timesheet-entry",
    "/dashboard/timesheet-review",
    "/dashboard/timesheet-reports",
    "/dashboard/timesheet-settings",
  ],
  roster: [
    "/dashboard/roaster-builder",
    "/dashboard/roaster-settings",
    "/dashboard/availablity-entry",
    "/dashboard/availability-overview",
  ],
  inventory: [
    "/dashboard/counts",
    "/dashboard/stock-items",
    "/dashboard/categories",
    "/dashboard/suppliers",
    "/dashboard/recipes",
    "/dashboard/refill-planner",
    "/dashboard/purchase-orders",
    "/dashboard/deliveries",
    "/dashboard/reconciliation",
    "/dashboard/sales",
    "/dashboard/sales-imports",
    "/dashboard/consumption",
  ],
};

/** All paths that are module-gated (flattened). */
const ALL_MODULE_PATHS = Object.values(MODULE_ROUTES).flat();

/**
 * Returns true if this user is allowed to view `pathname`.
 * Logic:
 *  1. Role must have permission (via sidebarPermissions).
 *  2a. If the path is NOT a module-gated path → allowed (role permission is enough).
 *  2b. If the path IS a module-gated path → user must also have that module enabled.
 */
function isPathAllowed(
  pathname: string,
  role: string,
  modules: string[]
): boolean {
  const allowedHrefs =
    sidebarPermissions[role as keyof typeof sidebarPermissions] || [];

  const hasRolePermission =
    allowedHrefs.includes("*") || allowedHrefs.includes(pathname);

  if (!hasRolePermission) return false;

  // Non-module paths: role permission alone is sufficient
  if (!ALL_MODULE_PATHS.includes(pathname)) return true;

  // Module paths: also need the module enabled
  return modules.some((mod) => (MODULE_ROUTES[mod] || []).includes(pathname));
}

export default function ProtectedRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile, loading } = useAuth();

  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;

    // Not logged in — send to login
    if (!user) {
      router.push("/login");
      return;
    }

    if (!profile) return;

    // Not an internal/active user
    if (!profile.isInternal) {
      router.push("/invite");
      return;
    }
    if (
      profile.role !== "admin" &&
      profile.role !== "super_admin" &&
      !profile.isActive
    ) {
      router.push("/invite");
      return;
    }

    // Redirect /dashboard (root) to the user's appropriate home
    if (DASHBOARD_ROOT_PATHS.includes(pathname)) {
      router.push(getPostLoginRedirect(profile));
      return;
    }

    // super_admin: no further restrictions
    if (profile.role === "super_admin") return;

    // For all other roles: enforce role+module access
    if (pathname.startsWith("/dashboard")) {
      const allowed = isPathAllowed(
        pathname,
        profile.role || "staff",
        profile.modules || []
      );
      if (!allowed) {
        router.push(getPostLoginRedirect(profile));
      }
    }
  }, [user, profile, loading, router, pathname]);

  if (loading) {
    return <Loading />;
  }

  if (!user) {
    return null;
  }

  if (profile) {
    if (!profile.isInternal) {
      return null;
    }
    if (
      profile.role !== "admin" &&
      profile.role !== "super_admin" &&
      !profile.isActive
    ) {
      return null;
    }

    // Block render on /dashboard root — redirect is in-flight
    if (DASHBOARD_ROOT_PATHS.includes(pathname)) {
      return null;
    }
    if (
      profile.role !== "super_admin" &&
      pathname.startsWith("/dashboard")
    ) {
      const COMMON_ROUTES = [
        "/dashboard",
        "/dashboard/business",
        "/dashboard/locations",
        "/dashboard/profile",
      ];
      const MODULE_ROUTES: Record<string, string[]> = {
        timesheet: [
          "/dashboard/team-members",
          "/dashboard/timesheet-entry",
          "/dashboard/timesheet-review",
          "/dashboard/timesheet-reports",
          "/dashboard/timesheet-settings",
        ],
        roster: [
          "/dashboard/roaster-builder",
          "/dashboard/roaster-settings",
          "/dashboard/availablity-entry",
          "/dashboard/availability-overview",
        ],
      };
      const userRole = profile.role || "staff";
      const allowedHrefs =
        sidebarPermissions[userRole as keyof typeof sidebarPermissions] || [];
      const hasRolePermission =
        allowedHrefs.includes("*") || allowedHrefs.includes(pathname);

      const modules = profile.modules || [];
      const isAllowed =
        hasRolePermission &&
        (COMMON_ROUTES.includes(pathname) ||
          modules.some((mod) =>
            (MODULE_ROUTES[mod] || []).includes(pathname)
          ));
      if (!isAllowed) {
        return null;
      }
    }
  }

  return children;
}
