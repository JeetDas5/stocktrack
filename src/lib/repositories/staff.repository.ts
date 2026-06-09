import api from "../services/api";
import {
  Staff,
  StaffCreateInput,
  StaffInvitation,
  StaffInvitationCreateInput,
  StaffInvitationPublic,
  PendingStaffAssignment,
} from "@/types/staff";

interface BackendStaff {
  id: string;
  business_id: string;
  name: string;
  phone: string;
  email: string;
  role: string;
  status: "Active" | "Inactive";
  created_at: string;
  locations?: { id: string; name: string }[];
}

export const getStaffMembers = async (businessId: string): Promise<Staff[]> => {
  const response = await api.get(`/api/businesses/${businessId}/staff`);
  return response.data.map((s: BackendStaff) => ({
    id: s.id,
    businessId: s.business_id,
    name: s.name,
    phone: s.phone,
    email: s.email,
    role: s.role,
    status: s.status,
    createdAt: s.created_at,
    locations: s.locations,
  }));
};

export const createStaff = async (
  businessId: string,
  data: StaffCreateInput
): Promise<Staff> => {
  const response = await api.post(`/api/businesses/${businessId}/staff`, {
    name: data.name,
    phone: data.phone,
    email: data.email,
    role: data.role,
    status: data.status,
    location_ids: data.locationIds,
  });
  const s = response.data;
  return {
    id: s.id,
    businessId: s.business_id,
    name: s.name,
    phone: s.phone,
    email: s.email,
    role: s.role,
    status: s.status,
    createdAt: s.created_at,
    locations: s.locations,
  };
};

export const updateStaff = async (
  businessId: string,
  staffId: string,
  data: StaffCreateInput
): Promise<Staff> => {
  const response = await api.put(
    `/api/businesses/${businessId}/staff/${staffId}`,
    {
      name: data.name,
      phone: data.phone,
      email: data.email,
      role: data.role,
      status: data.status,
      location_ids: data.locationIds,
    }
  );
  const s = response.data;
  return {
    id: s.id,
    businessId: s.business_id,
    name: s.name,
    phone: s.phone,
    email: s.email,
    role: s.role,
    status: s.status,
    createdAt: s.created_at,
    locations: s.locations,
  };
};

export const deleteStaff = async (
  businessId: string,
  staffId: string
): Promise<void> => {
  await api.delete(`/api/businesses/${businessId}/staff/${staffId}`);
};

export const createStaffInvitation = async (
  data: StaffInvitationCreateInput
): Promise<StaffInvitation> => {
  const response = await api.post("/api/staff/invitations", {
    role: data.role,
    expires_in_hours: data.expiresInHours,
    assignments: data.assignments,
  });
  return response.data;
};

export const getStaffInvitation = async (
  invitationId: string
): Promise<StaffInvitationPublic> => {
  const response = await api.get(`/api/staff/invitations/${invitationId}`);
  return response.data;
};

export const registerStaffInvitation = async (
  invitationId: string,
  data: { name: string; phone: string }
): Promise<{ message: string }> => {
  const response = await api.post(
    `/api/staff/invitations/${invitationId}/register`,
    data
  );
  return response.data;
};

export const getPendingStaff = async (
  businessId: string
): Promise<PendingStaffAssignment[]> => {
  const response = await api.get(`/api/businesses/${businessId}/pending-staff`);
  return response.data;
};

export const approvePendingStaff = async (
  businessId: string,
  assignmentId: string
): Promise<{ message: string }> => {
  const response = await api.post(
    `/api/businesses/${businessId}/pending-staff/${assignmentId}/approve`
  );
  return response.data;
};

export const rejectPendingStaff = async (
  businessId: string,
  assignmentId: string
): Promise<{ message: string }> => {
  const response = await api.post(
    `/api/businesses/${businessId}/pending-staff/${assignmentId}/reject`
  );
  return response.data;
};

