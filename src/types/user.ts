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
  image?: string;
  updated_at?: string;

  // Profile Fields
  first_name?: string;
  last_name?: string;
  gender?: string;
  date_of_birth?: string;
  address_line1?: string;
  country?: string;
  suburb?: string;
  state?: string;
  post_code?: string;
  driving_license_number?: string;
  license_expiry_date?: string;

  emergency_contact_name?: string;
  emergency_contact_relationship?: string;
  emergency_contact_phone?: string;
  emergency_contact_email?: string;

  tax_file_number?: string;
  super_fund_name?: string;
  super_fund_member_no?: string;
  bank_account_name?: string;
  bank_bsb?: string;
  bank_account_number?: string;
  weekly_work_hours?: number;
  residency_status?: string;
  visa_expiry_date?: string;

  employee_id?: string;
  position?: string;
  reports_to?: string;
  employment_type?: string;
}
