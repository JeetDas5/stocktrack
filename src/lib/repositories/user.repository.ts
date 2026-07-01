import api from "../services/api";
import { AppUser } from "@/types/user";

export const createUserProfile = async (user: AppUser) => {
  // Map uid to id for SQLModel schema
  const payload = {
    id: user.uid,
    email: user.email,
    name: user.fullName|| user.email || null,
  };
  const response = await api.post("/api/users", payload);
  return response.data;
};

export const getUserProfile = async (uid: string) => {
  try {
    const response = await api.get(`/api/users/${uid}`);
    const data = response.data;
    // Map id back to uid and name to fullName for Next.js frontend compatibility
    return {
      uid: data.id,
      email: data.email || "",
      phone: data.phone || "",
      displayName: data.name || "",
      fullName: data.name || "",
      name: data.name || "",
      role: data.role || "staff",
      isActive: true,
      isInternal: data.is_internal || false,
      businessIds: [],
      createdAt: data.created_at || new Date().toISOString(),
      last_login_at: new Date().toISOString(),
      image: data.image || "",
      updated_at: data.updated_at || "",
      
      first_name: data.first_name || "",
      last_name: data.last_name || "",
      gender: data.gender || "",
      date_of_birth: data.date_of_birth || "",
      address_line1: data.address_line1 || "",
      country: data.country || "",
      suburb: data.suburb || "",
      state: data.state || "",
      post_code: data.post_code || "",
      driving_license_number: data.driving_license_number || "",
      license_expiry_date: data.license_expiry_date || "",
      emergency_contact_name: data.emergency_contact_name || "",
      emergency_contact_relationship: data.emergency_contact_relationship || "",
      emergency_contact_phone: data.emergency_contact_phone || "",
      emergency_contact_email: data.emergency_contact_email || "",
      tax_file_number: data.tax_file_number || "",
      super_fund_name: data.super_fund_name || "",
      super_fund_member_no: data.super_fund_member_no || "",
      bank_account_name: data.bank_account_name || "",
      bank_bsb: data.bank_bsb || "",
      bank_account_number: data.bank_account_number || "",
      weekly_work_hours: data.weekly_work_hours || 0,
      residency_status: data.residency_status || "",
      visa_expiry_date: data.visa_expiry_date || "",
      employee_id: data.employee_id || "",
      position: data.position || "",
      reports_to: data.reports_to || "",
      employment_type: data.employment_type || "",
      modules: data.modules || [],
    } as unknown as AppUser;
  } catch (error: any) {
    if (error.response && error.response.status === 404) {
      return null;
    }
    throw error;
  }
};

export const getMeProfile = async () => {
  try {
    const response = await api.get("/api/users/me");
    const data = response.data;
    return {
      uid: data.id,
      email: data.email || "",
      phone: data.phone || "",
      displayName: data.name || "",
      fullName: data.name || "",
      name: data.name || "",
      role: data.role || "staff",
      isActive: data.is_approved !== false,
      isApproved: data.is_approved !== false,
      isInternal: data.is_internal || false,
      businessIds: [],
      createdAt: data.created_at || new Date().toISOString(),
      last_login_at: new Date().toISOString(),
      image: data.image || "",
      updated_at: data.updated_at || "",
      
      first_name: data.first_name || "",
      last_name: data.last_name || "",
      gender: data.gender || "",
      date_of_birth: data.date_of_birth || "",
      address_line1: data.address_line1 || "",
      country: data.country || "",
      suburb: data.suburb || "",
      state: data.state || "",
      post_code: data.post_code || "",
      driving_license_number: data.driving_license_number || "",
      license_expiry_date: data.license_expiry_date || "",
      emergency_contact_name: data.emergency_contact_name || "",
      emergency_contact_relationship: data.emergency_contact_relationship || "",
      emergency_contact_phone: data.emergency_contact_phone || "",
      emergency_contact_email: data.emergency_contact_email || "",
      tax_file_number: data.tax_file_number || "",
      super_fund_name: data.super_fund_name || "",
      super_fund_member_no: data.super_fund_member_no || "",
      bank_account_name: data.bank_account_name || "",
      bank_bsb: data.bank_bsb || "",
      bank_account_number: data.bank_account_number || "",
      weekly_work_hours: data.weekly_work_hours || 0,
      residency_status: data.residency_status || "",
      visa_expiry_date: data.visa_expiry_date || "",
      employee_id: data.employee_id || "",
      position: data.position || "",
      reports_to: data.reports_to || "",
      employment_type: data.employment_type || "",
      modules: data.modules || [],
    } as unknown as AppUser;
  } catch (error: any) {
    if (error.response && (error.response.status === 401 || error.response.status === 404)) {
      return null;
    }
    throw error;
  }
};

export const updateMeProfile = async (payload: Partial<AppUser>) => {
  const response = await api.put("/api/users/me", payload);
  const data = response.data;
  return {
    uid: data.id,
    email: data.email || "",
    phone: data.phone || "",
    displayName: data.name || "",
    fullName: data.name || "",
    name: data.name || "",
    role: data.role || "staff",
    isActive: data.is_approved !== false,
    isApproved: data.is_approved !== false,
    isInternal: data.is_internal || false,
    businessIds: [],
    createdAt: data.created_at || new Date().toISOString(),
    last_login_at: new Date().toISOString(),
    image: data.image || "",
    updated_at: data.updated_at || "",
    
    first_name: data.first_name || "",
    last_name: data.last_name || "",
    gender: data.gender || "",
    date_of_birth: data.date_of_birth || "",
    address_line1: data.address_line1 || "",
    country: data.country || "",
    suburb: data.suburb || "",
    state: data.state || "",
    post_code: data.post_code || "",
    driving_license_number: data.driving_license_number || "",
    license_expiry_date: data.license_expiry_date || "",
    emergency_contact_name: data.emergency_contact_name || "",
    emergency_contact_relationship: data.emergency_contact_relationship || "",
    emergency_contact_phone: data.emergency_contact_phone || "",
    emergency_contact_email: data.emergency_contact_email || "",
    tax_file_number: data.tax_file_number || "",
    super_fund_name: data.super_fund_name || "",
    super_fund_member_no: data.super_fund_member_no || "",
    bank_account_name: data.bank_account_name || "",
    bank_bsb: data.bank_bsb || "",
    bank_account_number: data.bank_account_number || "",
    weekly_work_hours: data.weekly_work_hours || 0,
    residency_status: data.residency_status || "",
    visa_expiry_date: data.visa_expiry_date || "",
    employee_id: data.employee_id || "",
    position: data.position || "",
    reports_to: data.reports_to || "",
    employment_type: data.employment_type || "",
    modules: data.modules || [],
  } as unknown as AppUser;
};
export const getUserAssignments = async (businessId: string) => {
  const response = await api.get(`/api/businesses/${businessId}/users`);
  return response.data;
};

export const updateUserAssignment = async (businessId: string, assignmentId: string, payload: any) => {
  const response = await api.put(`/api/businesses/${businessId}/users/${assignmentId}`, payload);
  return response.data;
};

export const deleteUserAssignment = async (businessId: string, assignmentId: string) => {
  const response = await api.delete(`/api/businesses/${businessId}/users/${assignmentId}`);
  return response.data;
};

export const getRolesPermissions = async () => {
  const response = await api.get("/api/auth/roles-permissions");
  return response.data;
};

export const createOwnerInvitation = async (data: {
  email: string;
  modules: string[];
}): Promise<any> => {
  const response = await api.post("/api/super-admin/invitations", data);
  return response.data;
};

export const listOwnerInvitations = async (): Promise<any[]> => {
  const response = await api.get("/api/super-admin/invitations");
  return response.data;
};

export const deleteOwnerInvitation = async (invitationId: string): Promise<any> => {
  const response = await api.delete(`/api/super-admin/invitations/${invitationId}`);
  return response.data;
};

export const updateOwnerInvitation = async (invitationId: string, modules: string[]): Promise<any> => {
  const response = await api.put(`/api/super-admin/invitations/${invitationId}`, { modules });
  return response.data;
};

export const listExternalLeads = async (): Promise<any[]> => {
  const response = await api.get("/api/super-admin/external-leads");
  return response.data;
};

export const deleteExternalLead = async (leadId: string): Promise<any> => {
  const response = await api.delete(`/api/super-admin/external-leads/${leadId}`);
  return response.data;
};


