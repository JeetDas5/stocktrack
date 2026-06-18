export type UserRole = "super_admin" | "admin" | "manager" | "staff";

export interface AppUser {
  uid: string;
  fullName: string;
  email?: string;
  phone?: string;
  role: UserRole;
  isActive: boolean;
  isApproved?: boolean;
  isInternal: boolean;
  businessIds: string[];
  activeBusinessId?: string;
  createdAt: string;
  last_login_at: string;
}
