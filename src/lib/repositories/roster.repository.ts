import api from "../services/api";
import { RosterShift, RosterShiftCreateInput } from "@/types/roster";

interface BackendRosterShift {
  id: string;
  business_id: string;
  location_id: string;
  user_id: string | null;
  date: string;
  shift_name: string;
  time_from: string;
  time_to: string;
  required_count: number;
  status: string;
  created_at: string;
  updated_at: string;
  user?: {
    id: string;
    name: string | null;
    email: string;
    role: string;
    priority: number;
    position: string | null;
    max_working_hours: number | null;
  } | null;
  location?: {
    id: string;
    name: string;
  } | null;
}

const mapBackendShift = (s: BackendRosterShift): RosterShift => ({
  id: s.id,
  businessId: s.business_id,
  locationId: s.location_id,
  userId: s.user_id,
  date: s.date,
  shiftName: s.shift_name,
  timeFrom: s.time_from,
  timeTo: s.time_to,
  requiredCount: s.required_count,
  status: s.status,
  createdAt: s.created_at,
  updatedAt: s.updated_at,
  user: s.user ? {
    id: s.user.id,
    name: s.user.name,
    email: s.user.email,
    role: s.user.role,
    priority: s.user.priority,
    position: s.user.position,
    max_working_hours: s.user.max_working_hours,
  } : null,
  location: s.location ? {
    id: s.location.id,
    name: s.location.name,
  } : null,
});

export const getRosterShifts = async (
  businessId: string,
  startDate: string,
  endDate: string,
): Promise<RosterShift[]> => {
  const response = await api.get(`/api/businesses/${businessId}/rosters`, {
    params: { start_date: startDate, end_date: endDate },
  });
  return response.data.map(mapBackendShift);
};

export const bulkSaveRosterShifts = async (
  businessId: string,
  shifts: RosterShiftCreateInput[],
  startDate: string,
  endDate: string,
): Promise<RosterShift[]> => {
  const response = await api.post(`/api/businesses/${businessId}/rosters/bulk`, {
    start_date: startDate,
    end_date: endDate,
    shifts,
  });
  return response.data.map(mapBackendShift);
};

export const copyPreviousWeekRoster = async (
  businessId: string,
  srcStartDate: string,
  targetStartDate: string,
): Promise<{ message: string }> => {
  const response = await api.post(`/api/businesses/${businessId}/rosters/copy`, {
    src_start_date: srcStartDate,
    target_start_date: targetStartDate,
  });
  return response.data;
};

export const publishRoster = async (
  businessId: string,
  startDate: string,
  endDate: string,
): Promise<{ message: string }> => {
  const response = await api.post(`/api/businesses/${businessId}/rosters/publish`, {
    start_date: startDate,
    end_date: endDate,
  });
  return response.data;
};

export const autoBuildRoster = async (
  businessId: string,
  startDate: string,
  endDate: string,
): Promise<RosterShift[]> => {
  const response = await api.post(`/api/businesses/${businessId}/rosters/auto-build`, {
    start_date: startDate,
    end_date: endDate,
  });
  return response.data.map(mapBackendShift);
};
