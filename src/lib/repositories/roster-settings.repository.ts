import api from "../services/api";

export interface RosterSettings {
  id: string;
  business_id: string;
  roster_period: string;
  availability_deadline_day: string;
  availability_deadline_time: string;
  default_shift_types: { name: string; hours: number; color: string }[];
  required_roles: {
    shift_type: string;
    roles: { role: string; min_count: number }[];
  }[];
  default_priority: number;
  allow_admin_override: boolean;
  notify_staff_approved: boolean;
  positions: string[];
}

export const getRosterSettings = async (
  businessId: string,
): Promise<RosterSettings> => {
  const response = await api.get(
    `/api/businesses/${businessId}/roster-settings`,
  );
  return response.data;
};

export const saveRosterSettings = async (
  businessId: string,
  data: Omit<RosterSettings, "id" | "business_id">,
): Promise<RosterSettings> => {
  const response = await api.post(
    `/api/businesses/${businessId}/roster-settings`,
    data,
  );
  return response.data;
};
