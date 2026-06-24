import api from "../services/api";
import { TimesheetReport, TimesheetReportFilters } from "@/types/timesheet-report";

interface BackendTimesheetReport {
  id: string;
  business_id: string;
  business_name: string;
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

const mapFromBackend = (t: BackendTimesheetReport): TimesheetReport => ({
  id: t.id,
  businessId: t.business_id,
  businessName: t.business_name,
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

export const getTimesheetReports = async (
  businessId: string,
  filters: Partial<TimesheetReportFilters>
): Promise<TimesheetReport[]> => {
  const params: Record<string, string> = {};
  if (filters.startDate) params.start_date = filters.startDate;
  if (filters.endDate) params.end_date = filters.endDate;
  if (filters.locationId) params.location_id = filters.locationId;
  if (filters.staffId) params.staff_id = filters.staffId;
  if (filters.status) params.status = filters.status;

  const response = await api.get(`/api/businesses/${businessId}/timesheets/reports`, {
    params,
  });
  return response.data.map(mapFromBackend);
};
