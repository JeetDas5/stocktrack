export interface TimesheetReport {
  id: string;
  businessId: string;
  businessName: string;
  locationId: string;
  locationName: string;
  staffId: string;
  staffName: string;
  workDate: string;
  startTime: string;
  endTime: string;
  unpaidBreak: number;
  notes?: string;
  project?: string;
  totalHours: number;
  status: string;
  createdAt?: string;
}

export interface TimesheetReportFilters {
  startDate: string;
  endDate: string;
  businessId: string;
  locationId: string;
  staffId: string;
  status: string;
}
