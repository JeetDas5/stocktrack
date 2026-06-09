export interface Timesheet {
  id: string;
  businessId: string;
  locationId: string;
  locationName: string;
  staffId: string;
  staffName: string;
  workDate: string;
  startTime: string;
  endTime: string;
  unpaidBreak: number;
  notes?: string;
  totalHours: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface TimesheetCreateInput {
  locationId: string;
  staffId: string;
  workDate: string;
  startTime: string;
  endTime: string;
  unpaidBreak: number;
  notes?: string;
}
