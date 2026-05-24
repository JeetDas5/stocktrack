export type UserRole = "admin" | "staff";

export interface AuthUser {
  uid: string;
  phone?: string;
  email?: string;
  fullName: string;
  role: UserRole;
  businessIds: string[];
}