import api from "../services/api";
import { AvailabilitySubmission } from "@/types/availability";

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
