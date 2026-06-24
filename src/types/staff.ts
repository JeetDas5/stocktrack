import { Location } from "./inventory";

export interface Staff {
  id: string;
  businessId: string;
  name: string;
  phone: string;
  email: string;
  role: string;
  status: "Active" | "Inactive";
  createdAt: string;
  locations?: Location[];
  priority: number;
  position: string | null;
  maxWorkingHours: number | null;
}

export interface StaffCreateInput {
  name: string;
  phone: string;
  email: string;
  role: string;
  status: "Active" | "Inactive";
  locationIds: string[];
  priority?: number;
  position?: string | null;
  maxWorkingHours?: number | null;
}

export interface StaffInvitationCreateInput {
  role?: string;
  expiresInHours?: number;
  assignments?: { business_id: string; location_ids: string[] }[];
  business_id?: string;
}

export interface StaffInvitation {
  id: string;
  role: string;
  assignments_json: { business_id: string; location_ids: string[] }[];
  expires_at: string;
  created_at: string;
  status: string;
}

export interface StaffInvitationPublic {
  id: string;
  role: string;
  expires_at: string;
  status: string;
  invited_by?: string;
  email?: string;
  modules?: string[];
  businesses: {
    id: string;
    name: string;
    locations: { id: string; name: string }[];
  }[];
}

export interface PendingStaffAssignment {
  id: string;
  user_id: string;
  user_name: string | null;
  user_email: string;
  user_phone: string | null;
  business_id: string;
  business_name: string;
  location_id: string | null;
  location_name: string | null;
  role: string;
  status: string;
  created_at: string;
}

