import api from "../services/api";
import { AvailabilitySubmission, AvailabilityOverviewItem } from "@/types/availability";

interface BackendSlot {
  id: string;
  time_from: string;
  time_to: string;
  location_id?: string;
  location?: { id: string; name: string };
  note?: string;
}

interface BackendDay {
  id: string;
  date: string;
  is_available: boolean;
  slots: BackendSlot[];
}

interface BackendSubmission {
  id: string;
  business_id: string;
  user_id: string;
  start_date: string;
  end_date: string;
  period_type: "weekly" | "fortnightly";
  general_note?: string;
  created_at: string;
  updated_at: string;
  days: BackendDay[];
}

export const getAvailability = async (
  businessId: string,
  startDate: string
): Promise<AvailabilitySubmission | null> => {
  const response = await api.get(
    `/api/businesses/${businessId}/availability/my-availability`,
    { params: { start_date: startDate } }
  );
  if (!response.data) return null;
  const s: BackendSubmission = response.data;
  return {
    id: s.id,
    businessId: s.business_id,
    userId: s.user_id,
    startDate: s.start_date,
    endDate: s.end_date,
    periodType: s.period_type,
    generalNote: s.general_note,
    createdAt: s.created_at,
    updatedAt: s.updated_at,
    days: s.days.map((d: BackendDay) => ({
      id: d.id,
      date: d.date,
      isAvailable: d.is_available,
      slots: d.slots.map((sl: BackendSlot) => ({
        id: sl.id,
        timeFrom: sl.time_from,
        timeTo: sl.time_to,
        locationId: sl.location_id,
        location: sl.location,
        note: sl.note,
      })),
    })),
  };
};

export const submitAvailability = async (
  businessId: string,
  data: AvailabilitySubmission
): Promise<AvailabilitySubmission> => {
  const payload = {
    start_date: data.startDate,
    end_date: data.endDate,
    period_type: data.periodType,
    general_note: data.generalNote,
    days: data.days.map((d) => ({
      date: d.date,
      is_available: d.isAvailable,
      slots: d.slots.map((sl) => ({
        time_from: sl.timeFrom,
        time_to: sl.timeTo,
        location_id: sl.locationId || null,
        note: sl.note || null,
      })),
    })),
  };
  const response = await api.post(
    `/api/businesses/${businessId}/availability`,
    payload
  );
  const s: BackendSubmission = response.data;
  return {
    id: s.id,
    businessId: s.business_id,
    userId: s.user_id,
    startDate: s.start_date,
    endDate: s.end_date,
    periodType: s.period_type,
    generalNote: s.general_note,
    createdAt: s.created_at,
    updatedAt: s.updated_at,
    days: s.days.map((d: BackendDay) => ({
      id: d.id,
      date: d.date,
      isAvailable: d.is_available,
      slots: d.slots.map((sl: BackendSlot) => ({
        id: sl.id,
        timeFrom: sl.time_from,
        timeTo: sl.time_to,
        locationId: sl.location_id,
        location: sl.location,
        note: sl.note,
      })),
    })),
  };
};

interface BackendOverviewStaff {
  id: string;
  name: string;
  priority: number;
  already_assigned: number;
  worked_previous_day: string;
}

interface BackendOverviewItem {
  date: string;
  day: string;
  location_id?: string;
  location_name: string;
  time_from: string;
  time_to: string;
  shift_label: string;
  available_staff_count: number;
  staff_members: BackendOverviewStaff[];
}

export const getAvailabilityOverview = async (
  businessId: string,
  startDate: string,
  endDate: string,
  locationId?: string,
  shift?: string
): Promise<AvailabilityOverviewItem[]> => {
  const params: Record<string, string> = {
    start_date: startDate,
    end_date: endDate,
  };
  if (locationId) params.location_id = locationId;
  if (shift) params.shift = shift;

  const response = await api.get(
    `/api/businesses/${businessId}/availability/overview`,
    { params }
  );

  return response.data.map((item: BackendOverviewItem) => ({
    date: item.date,
    day: item.day,
    locationId: item.location_id,
    locationName: item.location_name,
    timeFrom: item.time_from,
    timeTo: item.time_to,
    shiftLabel: item.shift_label,
    availableStaffCount: item.available_staff_count,
    staffMembers: item.staff_members.map((s: BackendOverviewStaff) => ({
      id: s.id,
      name: s.name,
      priority: s.priority,
      alreadyAssigned: s.already_assigned,
      workedPreviousDay: s.worked_previous_day,
    })),
  }));
};
