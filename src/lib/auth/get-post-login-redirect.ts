import { AppUser } from "@/types/user";

/**
 * Determines where to redirect a user after login or on /dashboard route visit,
 * based on their role and enabled modules.
 *
 * Priority:
 *  1. super_admin → /dashboard/super-admin
 *  2. Has timesheet module + role is admin → /dashboard/team-members
 *  3. Has timesheet module + role is manager or staff → /dashboard/timesheet-entry
 *  4. Fallback → /dashboard/business
 */
export function getPostLoginRedirect(profile: AppUser): string {
  if (profile.role === "super_admin") {
    return "/dashboard/super-admin";
  }

  const modules: string[] = profile.modules ?? [];
  const hasTimesheet = modules.includes("timesheet");

  if (hasTimesheet) {
    if (profile.role === "admin") {
      return "/dashboard/team-members";
    }
    if (profile.role === "manager" || profile.role === "staff") {
      return "/dashboard/timesheet-entry";
    }
  }

  return "/dashboard/business";
}
