import api from "../services/api";

export interface TimesheetSettings {
  id: string;
  business_id: string;

  // 1. Approval Workflow
  require_approval: boolean;
  approval_roles: string[];
  auto_approve_after_days: number | null;

  // 2. Timesheet Entry Rules
  allow_past_entry: boolean;
  max_past_days: number;
  lock_submitted: boolean;
  allow_staff_edit_pending: boolean;
  allow_managers_edit_approved: boolean;

  // 3. Break Rules
  require_break_entry: boolean;
  default_break_minutes: number;
  require_reason_no_break: boolean;

  // 4. Overtime Rules
  show_overtime_warnings: boolean;
  weekly_hours_warning: number;
  daily_hours_warning: number;

  // 5. Notifications
  notify_manager_on_submission: boolean;
  notify_staff_on_approval: boolean;
  notify_staff_on_rejection: boolean;

  // 6. Payroll Settings
  week_starts_on: string;
  payroll_export_format: string;
  lock_payroll_period_date: string | null;
  lock_timesheets_before_date: boolean;
}

export const getTimesheetSettings = async (
  businessId: string,
): Promise<TimesheetSettings> => {
  const response = await api.get(
    `/api/businesses/${businessId}/timesheet-settings`,
  );
  return response.data;
};

export const saveTimesheetSettings = async (
  businessId: string,
  data: Omit<TimesheetSettings, "id" | "business_id">,
): Promise<TimesheetSettings> => {
  const response = await api.post(
    `/api/businesses/${businessId}/timesheet-settings`,
    data,
  );
  return response.data;
};
