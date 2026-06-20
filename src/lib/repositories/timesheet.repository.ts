import api from "../services/api";
import { Timesheet, TimesheetCreateInput } from "@/types/timesheet";

interface BackendTimesheet {
  id: string;
  business_id: string;
  location_id: string;
  location_name: string;
  staff_id: string;
  staff_name: string;
  work_date: string;
  start_time: string;
  end_time: string;
  unpaid_break: number;
  notes?: string;
  project?: string;
  total_hours: number;
  status: string;
  created_at: string;
}

const mapFromBackend = (t: BackendTimesheet): Timesheet => ({
  id: t.id,
  businessId: t.business_id,
  locationId: t.location_id,
  locationName: t.location_name,
  staffId: t.staff_id,
  staffName: t.staff_name,
  workDate: t.work_date,
  startTime: t.start_time,
  endTime: t.end_time,
  unpaidBreak: t.unpaid_break,
  notes: t.notes,
  project: t.project,
  totalHours: t.total_hours,
  status: t.status,
  createdAt: t.created_at,
});

export const getTimesheets = async (businessId: string): Promise<Timesheet[]> => {
  const response = await api.get(`/api/businesses/${businessId}/timesheets`);
  return response.data.map(mapFromBackend);
};

export const createTimesheet = async (
  businessId: string,
  data: TimesheetCreateInput
): Promise<Timesheet> => {
  const response = await api.post(`/api/businesses/${businessId}/timesheets`, {
    location_id: data.locationId,
    staff_id: data.staffId,
    work_date: data.workDate,
    start_time: data.startTime,
    end_time: data.endTime,
    unpaid_break: data.unpaidBreak,
    notes: data.notes,
    project: data.project,
    status: data.status,
  });
  return mapFromBackend(response.data);
};

export const updateTimesheet = async (
  businessId: string,
  timesheetId: string,
  data: TimesheetCreateInput
): Promise<Timesheet> => {
  const response = await api.put(
    `/api/businesses/${businessId}/timesheets/${timesheetId}`,
    {
      location_id: data.locationId,
      staff_id: data.staffId,
      work_date: data.workDate,
      start_time: data.startTime,
      end_time: data.endTime,
      unpaid_break: data.unpaidBreak,
      notes: data.notes,
      project: data.project,
      status: data.status,
    }
  );
  return mapFromBackend(response.data);
};


export const updateTimesheetStatus = async (
  businessId: string,
  timesheetId: string,
  status: string
): Promise<Timesheet> => {
  const response = await api.patch(
    `/api/businesses/${businessId}/timesheets/${timesheetId}/status`,
    { status }
  );
  return mapFromBackend(response.data);
};

export const deleteTimesheet = async (
  businessId: string,
  timesheetId: string
): Promise<void> => {
  await api.delete(`/api/businesses/${businessId}/timesheets/${timesheetId}`);
};
