"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

import { useAuth } from "@/providers/auth-provider";
import Loading from "@/app/loading";

export default function ProtectedRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile, loading } = useAuth();

  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/login");
      } else if (profile) {
        if (!profile.isInternal) {
          router.push("/invite");
        } else if (
          profile.role !== "admin" &&
          profile.role !== "super_admin" &&
          !profile.isActive
        ) {
          router.push("/invite");
        } else if (
          profile.role === "super_admin" &&
          (pathname === "/dashboard" || pathname === "/dashboard/business" || pathname === "/dashboard/")
        ) {
          router.push("/dashboard/super-admin");
        } else if (
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
          };
          const modules = profile.modules || [];
          const isAllowed =
            COMMON_ROUTES.includes(pathname) ||
            modules.some((mod) =>
              (MODULE_ROUTES[mod] || []).includes(pathname)
            );
          if (!isAllowed) {
            router.push("/dashboard/business");
          }
        }
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
    if (
      profile.role === "super_admin" &&
      (pathname === "/dashboard" || pathname === "/dashboard/business" || pathname === "/dashboard/")
    ) {
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
      };
      const modules = profile.modules || [];
      const isAllowed =
        COMMON_ROUTES.includes(pathname) ||
        modules.some((mod) =>
          (MODULE_ROUTES[mod] || []).includes(pathname)
        );
      if (!isAllowed) {
        return null;
      }
    }
  }

  return children;
}
