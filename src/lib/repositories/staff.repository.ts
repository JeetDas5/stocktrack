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
  priority: number;
  position: string | null;
  max_working_hours: number | null;
  hourly_rate?: number | null;
  reporting_to?: string | null;
  start_date?: string | null;
  employment_type?: string | null;
}

export const getMyStaffProfile = async (businessId: string): Promise<Staff> => {
  const response = await api.get(`/api/businesses/${businessId}/staff/me`);
  const s: BackendStaff = response.data;
  return {
    id: s.id,
    businessId: s.business_id,
    name: s.name,
    phone: s.phone,
    email: s.email,
    role: s.role,
    status: s.status,
    createdAt: s.created_at,
    locations: s.locations?.map((l) => ({
      id: l.id,
      businessId,
      name: l.name,
      type: "",
      isActive: true,
      createdAt: "",
    })),
    priority: s.priority,
    position: s.position,
    maxWorkingHours: s.max_working_hours,
    hourlyRate: s.hourly_rate,
    reportingTo: s.reporting_to,
    startDate: s.start_date,
    employmentType: s.employment_type,
  };
};

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
    locations: s.locations?.map((l) => ({
      id: l.id,
      businessId,
      name: l.name,
      type: "",
      isActive: true,
      createdAt: "",
    })),
    priority: s.priority,
    position: s.position,
    maxWorkingHours: s.max_working_hours,
    hourlyRate: s.hourly_rate,
    reportingTo: s.reporting_to,
    startDate: s.start_date,
    employmentType: s.employment_type,
  }));
};

export const createStaff = async (
  businessId: string,
  data: StaffCreateInput,
): Promise<Staff> => {
  const response = await api.post(`/api/businesses/${businessId}/staff`, {
    name: data.name,
    phone: data.phone,
    email: data.email,
    role: data.role,
    status: data.status,
    location_ids: data.locationIds,
    priority: data.priority,
    position: data.position,
    max_working_hours: data.maxWorkingHours,
    hourly_rate: data.hourlyRate,
    reporting_to: data.reportingTo,
    start_date: data.startDate,
    employment_type: data.employmentType,
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
    priority: s.priority,
    position: s.position,
    maxWorkingHours: s.max_working_hours,
    hourlyRate: s.hourly_rate,
    reportingTo: s.reporting_to,
    startDate: s.start_date,
    employmentType: s.employment_type,
  };
};

export const updateStaff = async (
  businessId: string,
  staffId: string,
  data: StaffCreateInput,
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
      priority: data.priority,
      position: data.position,
      max_working_hours: data.maxWorkingHours,
      assignments: data.assignments,
      hourly_rate: data.hourlyRate,
      reporting_to: data.reportingTo,
      start_date: data.startDate,
      employment_type: data.employmentType,
    },
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
    priority: s.priority,
    position: s.position,
    maxWorkingHours: s.max_working_hours,
    hourlyRate: s.hourly_rate,
    reportingTo: s.reporting_to,
    startDate: s.start_date,
    employmentType: s.employment_type,
  };
};

export const deleteStaff = async (
  businessId: string,
  staffId: string,
): Promise<void> => {
  await api.delete(`/api/businesses/${businessId}/staff/${staffId}`);
};

export const createStaffInvitation = async (
  data: StaffInvitationCreateInput,
): Promise<StaffInvitation> => {
  const response = await api.post("/api/staff/invitations", {
    role: data.role,
    expires_in_hours: data.expiresInHours,
    assignments: data.assignments,
    business_id: data.business_id,
  });
  return response.data;
};

export const getStaffInvitation = async (
  invitationId: string,
): Promise<StaffInvitationPublic> => {
  const response = await api.get(`/api/staff/invitations/${invitationId}`);
  return response.data;
};

export const registerStaffInvitation = async (
  invitationId: string,
  data: { name: string; phone: string },
): Promise<{ message: string }> => {
  const response = await api.post(
    `/api/staff/invitations/${invitationId}/register`,
    data,
  );
  return response.data;
};

export const getPendingStaff = async (
  businessId: string,
): Promise<PendingStaffAssignment[]> => {
  const response = await api.get(`/api/businesses/${businessId}/pending-staff`);
  return response.data;
};

export const approvePendingStaff = async (
  businessId: string,
  assignmentId: string,
  data?: {
    role: string;
    assignments: { business_id: string; location_ids: string[] }[];
    priority?: number;
    position?: string | null;
    max_working_hours?: number | null;
    hourly_rate?: number | null;
    reporting_to?: string | null;
    start_date?: string | null;
    employment_type?: string | null;
  },
): Promise<{ message: string }> => {
  const response = await api.post(
    `/api/businesses/${businessId}/pending-staff/${assignmentId}/approve`,
    data,
  );
  return response.data;
};

export const rejectPendingStaff = async (
  businessId: string,
  assignmentId: string,
  reason: string,
): Promise<{ message: string }> => {
  const response = await api.post(
    `/api/businesses/${businessId}/pending-staff/${assignmentId}/reject`,
    { reason },
  );
  return response.data;
};
