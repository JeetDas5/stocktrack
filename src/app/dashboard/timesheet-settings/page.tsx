"use client";

import { toast } from "sonner";
import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  Loader2,
  Info,
  Calendar as CalendarIcon,
} from "lucide-react";

import Calendar from "@/components/ui/calendar";
import { useAuth } from "@/providers/auth-provider";
import { Dropdown } from "@/components/ui/dropdown";
import { useBusinessStore } from "@/stores/business-store";
import {
  getTimesheetSettings,
  saveTimesheetSettings,
  TimesheetSettings,
} from "@/lib/repositories/timesheet-settings.repository";

const AUTO_APPROVE_OPTIONS = [
  { value: "disabled", label: "Disabled" },
  { value: "1", label: "1 day" },
  { value: "2", label: "2 days" },
  { value: "3", label: "3 days" },
  { value: "5", label: "5 days" },
  { value: "7", label: "7 days" },
  { value: "14", label: "14 days" },
  { value: "30", label: "30 days" },
] as const;

const MAX_PAST_DAYS_OPTIONS = [
  { value: "1", label: "1 day" },
  { value: "2", label: "2 days" },
  { value: "3", label: "3 days" },
  { value: "4", label: "4 days" },
  { value: "5", label: "5 days" },
  { value: "6", label: "6 days" },
  { value: "7", label: "7 days" },
  { value: "10", label: "10 days" },
  { value: "14", label: "14 days" },
  { value: "30", label: "30 days" },
] as const;

const DEFAULT_BREAK_OPTIONS = [
  { value: "15", label: "15 minutes" },
  { value: "30", label: "30 minutes" },
  { value: "45", label: "45 minutes" },
  { value: "60", label: "60 minutes" },
] as const;

const WEEKLY_HOURS_OPTIONS = [
  { value: "35", label: "35 hours" },
  { value: "36", label: "36 hours" },
  { value: "38", label: "38 hours" },
  { value: "40", label: "40 hours" },
  { value: "45", label: "45 hours" },
  { value: "48", label: "48 hours" },
  { value: "50", label: "50 hours" },
] as const;

const DAILY_HOURS_OPTIONS = [
  { value: "8", label: "8 hours" },
  { value: "9", label: "9 hours" },
  { value: "10", label: "10 hours" },
  { value: "11", label: "11 hours" },
  { value: "12", label: "12 hours" },
] as const;

const WEEK_START_OPTIONS = [
  { value: "Monday", label: "Monday" },
  { value: "Tuesday", label: "Tuesday" },
  { value: "Wednesday", label: "Wednesday" },
  { value: "Thursday", label: "Thursday" },
  { value: "Friday", label: "Friday" },
  { value: "Saturday", label: "Saturday" },
  { value: "Sunday", label: "Sunday" },
] as const;

const PAYROLL_EXPORT_OPTIONS = [
  { value: "CSV", label: "CSV" },
  { value: "Excel", label: "Excel" },
  { value: "Xero", label: "Xero" },
  { value: "MYOB", label: "MYOB" },
] as const;

export default function TimesheetSettingsPage() {
  const router = useRouter();

  const { activeBusinessId } = useBusinessStore();
  const { profile, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [openSections, setOpenSections] = useState({
    approval: true,
    rules: true,
    breaks: true,
    overtime: true,
    notifications: true,
    payroll: true,
  });

  const [requireApproval, setRequireApproval] = useState(true);
  const [approvalRoles, setApprovalRoles] = useState<string[]>([
    "Admin",
    "Manager",
  ]);
  const [autoApproveAfterDays, setAutoApproveAfterDays] = useState<
    number | null
  >(null);

  const [allowPastEntry, setAllowPastEntry] = useState(true);
  const [maxPastDays, setMaxPastDays] = useState(1);
  const [lockSubmitted, setLockSubmitted] = useState(true);
  const [allowStaffEditPending, setAllowStaffEditPending] = useState(false);
  const [allowManagersEditApproved, setAllowManagersEditApproved] =
    useState(true);

  const [requireBreakEntry, setRequireBreakEntry] = useState(true);
  const [defaultBreakMinutes, setDefaultBreakMinutes] = useState(30);
  const [requireReasonNoBreak, setRequireReasonNoBreak] = useState(true);

  const [showOvertimeWarnings, setShowOvertimeWarnings] = useState(true);
  const [weeklyHoursWarning, setWeeklyHoursWarning] = useState(38);
  const [dailyHoursWarning, setDailyHoursWarning] = useState(10);

  const [notifyManagerOnSubmission, setNotifyManagerOnSubmission] =
    useState(true);
  const [notifyStaffOnApproval, setNotifyStaffOnApproval] = useState(true);
  const [notifyStaffOnRejection, setNotifyStaffOnRejection] = useState(true);

  const [weekStartsOn, setWeekStartsOn] = useState("Monday");
  const [payrollExportFormat, setPayrollExportFormat] = useState("Excel");
  const [lockPayrollPeriodDate, setLockPayrollPeriodDate] = useState("");
  const [lockTimesheetsBeforeDate, setLockTimesheetsBeforeDate] =
    useState(true);

  const [originalSettings, setOriginalSettings] =
    useState<TimesheetSettings | null>(null);

  const [showCalendar, setShowCalendar] = useState(false);
  const calendarContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        calendarContainerRef.current &&
        !calendarContainerRef.current.contains(event.target as Node)
      ) {
        setShowCalendar(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const applySettings = (data: TimesheetSettings) => {
    setRequireApproval(data.require_approval);
    setApprovalRoles(data.approval_roles || []);
    setAutoApproveAfterDays(data.auto_approve_after_days);
    setAllowPastEntry(data.allow_past_entry);
    setMaxPastDays(data.max_past_days);
    setLockSubmitted(data.lock_submitted);
    setAllowStaffEditPending(data.allow_staff_edit_pending);
    setAllowManagersEditApproved(data.allow_managers_edit_approved);
    setRequireBreakEntry(data.require_break_entry);
    setDefaultBreakMinutes(data.default_break_minutes);
    setRequireReasonNoBreak(data.require_reason_no_break);
    setShowOvertimeWarnings(data.show_overtime_warnings);
    setWeeklyHoursWarning(data.weekly_hours_warning);
    setDailyHoursWarning(data.daily_hours_warning);
    setNotifyManagerOnSubmission(data.notify_manager_on_submission);
    setNotifyStaffOnApproval(data.notify_staff_on_approval);
    setNotifyStaffOnRejection(data.notify_staff_on_rejection);
    setWeekStartsOn(data.week_starts_on);
    setPayrollExportFormat(data.payroll_export_format);
    setLockPayrollPeriodDate(data.lock_payroll_period_date || "");
    setLockTimesheetsBeforeDate(data.lock_timesheets_before_date);
  };

  useEffect(() => {
    if (!authLoading && profile) {
      if (profile.role !== "admin" && profile.role !== "super_admin") {
        router.push("/dashboard/profile");
      }
    }
  }, [profile, authLoading, router]);

  useEffect(() => {
    async function loadSettings() {
      if (!activeBusinessId) return;
      try {
        setLoading(true);
        const data = await getTimesheetSettings(activeBusinessId);
        setOriginalSettings(data);
        applySettings(data);
      } catch (err) {
        console.error("Error loading timesheet settings:", err);
        toast.error("Failed to load timesheet settings.");
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, [activeBusinessId]);

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const handleRoleCheckboxChange = (role: string) => {
    if (approvalRoles.includes(role)) {
      setApprovalRoles(approvalRoles.filter((r) => r !== role));
    } else {
      setApprovalRoles([...approvalRoles, role]);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBusinessId) return;

    try {
      setSaving(true);
      const payload = {
        require_approval: requireApproval,
        approval_roles: approvalRoles,
        auto_approve_after_days: autoApproveAfterDays,
        allow_past_entry: allowPastEntry,
        max_past_days: maxPastDays,
        lock_submitted: lockSubmitted,
        allow_staff_edit_pending: allowStaffEditPending,
        allow_managers_edit_approved: allowManagersEditApproved,
        require_break_entry: requireBreakEntry,
        default_break_minutes: defaultBreakMinutes,
        require_reason_no_break: requireReasonNoBreak,
        show_overtime_warnings: showOvertimeWarnings,
        weekly_hours_warning: weeklyHoursWarning,
        daily_hours_warning: dailyHoursWarning,
        notify_manager_on_submission: notifyManagerOnSubmission,
        notify_staff_on_approval: notifyStaffOnApproval,
        notify_staff_on_rejection: notifyStaffOnRejection,
        week_starts_on: weekStartsOn,
        payroll_export_format: payrollExportFormat,
        lock_payroll_period_date: lockPayrollPeriodDate || null,
        lock_timesheets_before_date: lockTimesheetsBeforeDate,
      };

      const updated = await saveTimesheetSettings(activeBusinessId, payload);
      setOriginalSettings(updated);
      toast.success("Timesheet settings saved successfully!");
    } catch (err) {
      console.error("Error saving timesheet settings:", err);
      toast.error("Failed to save timesheet settings.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (originalSettings) {
      applySettings(originalSettings);
      toast.info("Changes discarded.");
    }
  };

  if (authLoading || loading) {
    return (
      <div className="h-[75vh] flex flex-col items-center justify-center bg-white text-[#0F172A]">
        <Loader2 className="h-7 w-7 text-[#0a2924] animate-spin mb-3" />
        <span className="text-[#64748B] text-xs font-bold uppercase tracking-wider">
          Retrieving settings...
        </span>
      </div>
    );
  }

  const roleOptions = ["Admin", "Manager"];

  return (
    <div className="bg-white min-h-[85vh] select-none pb-12">
      <form
        onSubmit={handleSave}
        className="max-w-6xl mx-auto space-y-6 px-4 md:px-6"
      >
        <div className="bg-white border border-[#E2E8F0] rounded-2xl py-5 px-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-xs">
          <div>
            <h1 className="text-xl md:text-2xl font-extrabold text-zinc-900 tracking-tight">
              Timesheet Settings
            </h1>
            <p className="text-zinc-400 text-[10px] font-bold mt-1 uppercase tracking-wide">
              Configure timesheet approval workflows, rules, alerts, and payroll
              specifications.
            </p>
          </div>
        </div>

        <div className="bg-white border border-zinc-200 rounded-2xl shadow-xs">
          <button
            type="button"
            onClick={() => toggleSection("approval")}
            className={`w-full flex justify-between items-center px-6 py-4.5 bg-zinc-50/50 border-b border-zinc-100 hover:bg-zinc-50/80 transition-colors text-left rounded-t-2xl ${
              !openSections.approval ? "rounded-b-2xl" : ""
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-sm font-extrabold text-zinc-900 tracking-wide uppercase">
                1. Approval Workflow
              </span>
            </div>
            <ChevronDown
              className={`h-4.5 w-4.5 text-zinc-400 transition-transform duration-350 ease-out ${
                openSections.approval ? "rotate-180" : ""
              }`}
            />
          </button>

          <div
            className={`accordion-grid ${openSections.approval ? "accordion-grid-open" : ""}`}
          >
            <div className="accordion-grid-inner rounded-b-2xl">
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-1.5">
                    <label className="text-xs font-extrabold text-zinc-700 uppercase tracking-wide">
                      Require Timesheet Approval
                    </label>
                    <div className="group relative">
                      <Info className="h-3.5 w-3.5 text-zinc-400 cursor-pointer" />
                      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block w-48 bg-zinc-900 text-white text-[10px] p-2 rounded shadow-lg text-center font-normal z-50">
                        Submitted timesheets will remain pending approval or get
                        automatically approved.
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="radio"
                        name="requireApproval"
                        checked={requireApproval === true}
                        onChange={() => setRequireApproval(true)}
                        className="mt-0.5 h-3.5 w-3.5 text-[#0a2924] border-zinc-300 focus:ring-[#0a2924]"
                      />
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-zinc-950">
                          Yes, Require Approval
                        </span>
                        <p className="text-[10px] text-zinc-400 mt-0.5">
                          Submitted timesheets remain pending until approved
                        </p>
                      </div>
                    </label>
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="radio"
                        name="requireApproval"
                        checked={requireApproval === false}
                        onChange={() => setRequireApproval(false)}
                        className="mt-0.5 h-3.5 w-3.5 text-[#0a2924] border-zinc-300 focus:ring-[#0a2924]"
                      />
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-zinc-950">
                          No, Auto Approve Timesheets
                        </span>
                        <p className="text-[10px] text-zinc-400 mt-0.5">
                          Timesheets will be approved automatically
                        </p>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-1.5">
                    <label className="text-xs font-extrabold text-zinc-700 uppercase tracking-wide">
                      Require Timesheet Approval
                    </label>
                    <div className="group relative">
                      <Info className="h-3.5 w-3.5 text-zinc-400 cursor-pointer" />
                      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block w-48 bg-zinc-900 text-white text-[10px] p-2 rounded shadow-lg text-center font-normal z-50">
                        Specify which managerial roles are permitted to approve
                        timesheets.
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {roleOptions.map((role) => (
                      <label
                        key={role}
                        className="flex items-center gap-2.5 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={approvalRoles.includes(role)}
                          onChange={() => handleRoleCheckboxChange(role)}
                          className="h-3.5 w-3.5 accent-[#0C830C] text-[#0C830C] border-zinc-300 rounded focus:ring-[#0C830C]"
                        />
                        <span className="text-xs font-bold text-zinc-950">
                          {role}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-1.5">
                    <label className="text-xs font-extrabold text-zinc-700 uppercase tracking-wide">
                      Auto Approve After
                    </label>
                    <div className="group relative">
                      <Info className="h-3.5 w-3.5 text-zinc-400 cursor-pointer" />
                      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block w-48 bg-zinc-900 text-white text-[10px] p-2 rounded shadow-lg text-center font-normal z-50">
                        Pending timesheets will auto-approve after this
                        duration.
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Dropdown
                      value={
                        autoApproveAfterDays === null
                          ? "disabled"
                          : String(autoApproveAfterDays)
                      }
                      onChange={(val) =>
                        setAutoApproveAfterDays(
                          val === "disabled" ? null : Number(val),
                        )
                      }
                      options={AUTO_APPROVE_OPTIONS}
                      className="w-full"
                      triggerClassName="rounded-xl py-2 px-3.5 border-zinc-200 font-bold text-zinc-950"
                      optionClassName="font-bold text-zinc-700"
                    />
                    <p className="text-[10px] text-zinc-400 mt-1.5">
                      If enabled, pending timesheets auto-approve after the
                      specified days.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white border border-zinc-200 rounded-2xl shadow-xs">
          <button
            type="button"
            onClick={() => toggleSection("rules")}
            className={`w-full flex justify-between items-center px-6 py-4.5 bg-zinc-50/50 border-b border-zinc-100 hover:bg-zinc-50/80 transition-colors text-left rounded-t-2xl ${
              !openSections.rules ? "rounded-b-2xl" : ""
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-sm font-extrabold text-zinc-900 tracking-wide uppercase">
                2. Timesheet Entry Rules
              </span>
            </div>
            <ChevronDown
              className={`h-4.5 w-4.5 text-zinc-400 transition-transform duration-350 ease-out ${
                openSections.rules ? "rotate-180" : ""
              }`}
            />
          </button>

          <div
            className={`accordion-grid ${openSections.rules ? "accordion-grid-open" : ""}`}
          >
            <div className="accordion-grid-inner rounded-b-2xl">
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="space-y-3">
                    <div className="flex items-center gap-1.5">
                      <label className="text-xs font-extrabold text-zinc-700 uppercase tracking-wide">
                        Allow Past Timesheet Entry
                      </label>
                      <div className="group relative">
                        <Info className="h-3.5 w-3.5 text-zinc-400 cursor-pointer" />
                        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block w-48 bg-zinc-900 text-white text-[10px] p-2 rounded shadow-lg text-center font-normal z-50">
                          Toggle whether employees can log shifts
                          retrospectively.
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="allowPastEntry"
                          checked={allowPastEntry === true}
                          onChange={() => setAllowPastEntry(true)}
                          className="h-3.5 w-3.5 text-[#0a2924] border-zinc-300 focus:ring-[#0a2924]"
                        />
                        <span className="text-xs font-bold text-zinc-950">
                          Yes
                        </span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="allowPastEntry"
                          checked={allowPastEntry === false}
                          onChange={() => setAllowPastEntry(false)}
                          className="h-3.5 w-3.5 text-[#0a2924] border-zinc-300 focus:ring-[#0a2924]"
                        />
                        <span className="text-xs font-bold text-zinc-950">
                          No
                        </span>
                      </label>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-1.5">
                      <label className="text-xs font-extrabold text-zinc-700 uppercase tracking-wide">
                        Maximum Days in the Past
                      </label>
                      <div className="group relative">
                        <Info className="h-3.5 w-3.5 text-zinc-400 cursor-pointer" />
                        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block w-48 bg-zinc-900 text-white text-[10px] p-2 rounded shadow-lg text-center font-normal z-50">
                          Configure how far back staff are permitted to register
                          timesheets.
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Dropdown
                        value={String(maxPastDays)}
                        onChange={(val) => setMaxPastDays(Number(val))}
                        options={MAX_PAST_DAYS_OPTIONS}
                        className="w-28"
                        triggerClassName={`rounded-xl py-2 px-3.5 border-zinc-200 font-bold text-zinc-950 ${!allowPastEntry ? "opacity-50 pointer-events-none" : ""}`}
                        optionClassName="font-bold text-zinc-700"
                      />
                      <span className="text-xs text-zinc-500 font-bold ml-1">
                        days
                      </span>
                    </div>
                    <p className="text-[10px] text-zinc-400">
                      Staff can enter timesheets up to this many days in the
                      past.
                    </p>
                  </div>
                </div>

                <div className="border-t border-zinc-100 pt-5 grid grid-cols-1 md:grid-cols-3 gap-5">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={lockSubmitted}
                      onChange={(e) => setLockSubmitted(e.target.checked)}
                      className="mt-0.5 h-3.5 w-3.5 accent-[#0C830C] text-[#0C830C] border-zinc-300 rounded focus:ring-[#0C830C]"
                    />
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-bold text-zinc-950">
                        Lock Submitted Timesheets
                      </span>
                      <p className="text-[10px] text-zinc-400 mt-0.5">
                        Staff cannot edit timesheets after they are submitted
                      </p>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allowStaffEditPending}
                      onChange={(e) =>
                        setAllowStaffEditPending(e.target.checked)
                      }
                      className="mt-0.5 h-3.5 w-3.5 accent-[#0C830C] text-[#0C830C] border-zinc-300 rounded focus:ring-[#0C830C]"
                    />
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-bold text-zinc-950">
                        Allow Staff to Edit Pending Timesheets
                      </span>
                      <p className="text-[10px] text-zinc-400 mt-0.5">
                        Staff can edit timesheets while they are pending
                        approval
                      </p>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allowManagersEditApproved}
                      onChange={(e) =>
                        setAllowManagersEditApproved(e.target.checked)
                      }
                      className="mt-0.5 h-3.5 w-3.5 accent-[#0C830C] text-[#0C830C] border-zinc-300 rounded focus:ring-[#0C830C]"
                    />
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-bold text-zinc-950">
                        Allow Managers to Edit Approved Timesheets
                      </span>
                      <p className="text-[10px] text-zinc-400 mt-0.5">
                        Managers can edit timesheets even after approval
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white border border-zinc-200 rounded-2xl shadow-xs">
          <button
            type="button"
            onClick={() => toggleSection("breaks")}
            className={`w-full flex justify-between items-center px-6 py-4.5 bg-zinc-50/50 border-b border-zinc-100 hover:bg-zinc-50/80 transition-colors text-left rounded-t-2xl ${
              !openSections.breaks ? "rounded-b-2xl" : ""
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-sm font-extrabold text-zinc-900 tracking-wide uppercase">
                3. Break Rules
              </span>
            </div>
            <ChevronDown
              className={`h-4.5 w-4.5 text-zinc-400 transition-transform duration-350 ease-out ${
                openSections.breaks ? "rotate-180" : ""
              }`}
            />
          </button>

          <div
            className={`accordion-grid ${openSections.breaks ? "accordion-grid-open" : ""}`}
          >
            <div className="accordion-grid-inner rounded-b-2xl">
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-1.5">
                    <label className="text-xs font-extrabold text-zinc-700 uppercase tracking-wide">
                      Require Break Entry
                    </label>
                    <div className="group relative">
                      <Info className="h-3.5 w-3.5 text-zinc-400 cursor-pointer" />
                      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block w-48 bg-zinc-900 text-white text-[10px] p-2 rounded shadow-lg text-center font-normal z-50">
                        Force staff to record unpaid breaks when logging shifts.
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="requireBreakEntry"
                        checked={requireBreakEntry === true}
                        onChange={() => setRequireBreakEntry(true)}
                        className="h-3.5 w-3.5 text-[#0a2924] border-zinc-300 focus:ring-[#0a2924]"
                      />
                      <span className="text-xs font-bold text-zinc-950">
                        Yes
                      </span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="requireBreakEntry"
                        checked={requireBreakEntry === false}
                        onChange={() => setRequireBreakEntry(false)}
                        className="h-3.5 w-3.5 text-[#0a2924] border-zinc-300 focus:ring-[#0a2924]"
                      />
                      <span className="text-xs font-bold text-zinc-950">
                        No
                      </span>
                    </label>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-1.5">
                    <label className="text-xs font-extrabold text-zinc-700 uppercase tracking-wide">
                      Default Break (Minutes)
                    </label>
                    <div className="group relative">
                      <Info className="h-3.5 w-3.5 text-zinc-400 cursor-pointer" />
                      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block w-48 bg-zinc-900 text-white text-[10px] p-2 rounded shadow-lg text-center font-normal z-50">
                        Specify default unpaid break duration applied
                        automatically.
                      </span>
                    </div>
                  </div>
                  <div>
                    <Dropdown
                      value={String(defaultBreakMinutes)}
                      onChange={(val) => setDefaultBreakMinutes(Number(val))}
                      options={DEFAULT_BREAK_OPTIONS}
                      className="w-full"
                      triggerClassName="rounded-xl py-2 px-3.5 border-zinc-200 font-bold text-zinc-950"
                      optionClassName="font-bold text-zinc-700"
                    />
                    <p className="text-[10px] text-zinc-400 mt-1.5">
                      Default unpaid break time for each shift.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-1.5">
                    <label className="text-xs font-extrabold text-zinc-700 uppercase tracking-wide">
                      Require Reason for No Break
                    </label>
                    <div className="group relative">
                      <Info className="h-3.5 w-3.5 text-zinc-400 cursor-pointer" />
                      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block w-48 bg-zinc-900 text-white text-[10px] p-2 rounded shadow-lg text-center font-normal z-50">
                        Require description text if no break was recorded for
                        longer shifts.
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="requireReasonNoBreak"
                        checked={requireReasonNoBreak === true}
                        onChange={() => setRequireReasonNoBreak(true)}
                        className="h-3.5 w-3.5 text-[#0a2924] border-zinc-300 focus:ring-[#0a2924]"
                      />
                      <span className="text-xs font-bold text-zinc-950">
                        Yes
                      </span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="requireReasonNoBreak"
                        checked={requireReasonNoBreak === false}
                        onChange={() => setRequireReasonNoBreak(false)}
                        className="h-3.5 w-3.5 text-[#0a2924] border-zinc-300 focus:ring-[#0a2924]"
                      />
                      <span className="text-xs font-bold text-zinc-950">
                        No
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white border border-zinc-200 rounded-2xl shadow-xs">
          <button
            type="button"
            onClick={() => toggleSection("overtime")}
            className={`w-full flex justify-between items-center px-6 py-4.5 bg-zinc-50/50 border-b border-zinc-100 hover:bg-zinc-50/80 transition-colors text-left rounded-t-2xl ${
              !openSections.overtime ? "rounded-b-2xl" : ""
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-sm font-extrabold text-zinc-900 tracking-wide uppercase">
                4. Overtime Rules
              </span>
            </div>
            <ChevronDown
              className={`h-4.5 w-4.5 text-zinc-400 transition-transform duration-350 ease-out ${
                openSections.overtime ? "rotate-180" : ""
              }`}
            />
          </button>

          <div
            className={`accordion-grid ${openSections.overtime ? "accordion-grid-open" : ""}`}
          >
            <div className="accordion-grid-inner rounded-b-2xl">
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-1.5">
                    <label className="text-xs font-extrabold text-zinc-700 uppercase tracking-wide">
                      Show Overtime Warnings
                    </label>
                    <div className="group relative">
                      <Info className="h-3.5 w-3.5 text-zinc-400 cursor-pointer" />
                      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block w-48 bg-zinc-900 text-white text-[10px] p-2 rounded shadow-lg text-center font-normal z-50">
                        Display warnings in review pages when shifts cross
                        warning thresholds.
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="showOvertimeWarnings"
                        checked={showOvertimeWarnings === true}
                        onChange={() => setShowOvertimeWarnings(true)}
                        className="h-3.5 w-3.5 text-[#0a2924] border-zinc-300 focus:ring-[#0a2924]"
                      />
                      <span className="text-xs font-bold text-zinc-950">
                        Yes
                      </span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="showOvertimeWarnings"
                        checked={showOvertimeWarnings === false}
                        onChange={() => setShowOvertimeWarnings(false)}
                        className="h-3.5 w-3.5 text-[#0a2924] border-zinc-300 focus:ring-[#0a2924]"
                      />
                      <span className="text-xs font-bold text-zinc-950">
                        No
                      </span>
                    </label>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-1.5">
                    <label className="text-xs font-extrabold text-zinc-700 uppercase tracking-wide">
                      Weekly Hours Warning
                    </label>
                    <div className="group relative">
                      <Info className="h-3.5 w-3.5 text-zinc-400 cursor-pointer" />
                      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block w-48 bg-zinc-900 text-white text-[10px] p-2 rounded shadow-lg text-center font-normal z-50">
                        Threshold in hours for weekly shift warnings.
                      </span>
                    </div>
                  </div>
                  <div>
                    <Dropdown
                      value={String(weeklyHoursWarning)}
                      onChange={(val) => setWeeklyHoursWarning(Number(val))}
                      options={WEEKLY_HOURS_OPTIONS}
                      className="w-full"
                      triggerClassName={`rounded-xl py-2 px-3.5 border-zinc-200 font-bold text-zinc-950 ${!showOvertimeWarnings ? "opacity-50 pointer-events-none" : ""}`}
                      optionClassName="font-bold text-zinc-700"
                    />
                    <p className="text-[10px] text-zinc-400 mt-1.5">
                      Show warning when weekly hours exceed this.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-1.5">
                    <label className="text-xs font-extrabold text-zinc-700 uppercase tracking-wide">
                      Daily Hours Warning
                    </label>
                    <div className="group relative">
                      <Info className="h-3.5 w-3.5 text-zinc-400 cursor-pointer" />
                      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block w-48 bg-zinc-900 text-white text-[10px] p-2 rounded shadow-lg text-center font-normal z-50">
                        Threshold in hours for single day shift warnings.
                      </span>
                    </div>
                  </div>
                  <div>
                    <Dropdown
                      value={String(dailyHoursWarning)}
                      onChange={(val) => setDailyHoursWarning(Number(val))}
                      options={DAILY_HOURS_OPTIONS}
                      className="w-full"
                      triggerClassName={`rounded-xl py-2 px-3.5 border-zinc-200 font-bold text-zinc-950 ${!showOvertimeWarnings ? "opacity-50 pointer-events-none" : ""}`}
                      optionClassName="font-bold text-zinc-700"
                    />
                    <p className="text-[10px] text-zinc-400 mt-1.5">
                      Show warning when daily hours exceed this.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white border border-zinc-200 rounded-2xl shadow-xs">
          <button
            type="button"
            onClick={() => toggleSection("notifications")}
            className={`w-full flex justify-between items-center px-6 py-4.5 bg-zinc-50/50 border-b border-zinc-100 hover:bg-zinc-50/80 transition-colors text-left rounded-t-2xl ${
              !openSections.notifications ? "rounded-b-2xl" : ""
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-sm font-extrabold text-zinc-900 tracking-wide uppercase">
                5. Notifications
              </span>
            </div>
            <ChevronDown
              className={`h-4.5 w-4.5 text-zinc-400 transition-transform duration-350 ease-out ${
                openSections.notifications ? "rotate-180" : ""
              }`}
            />
          </button>

          <div
            className={`accordion-grid ${openSections.notifications ? "accordion-grid-open" : ""}`}
          >
            <div className="accordion-grid-inner rounded-b-2xl">
              <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifyManagerOnSubmission}
                    onChange={(e) =>
                      setNotifyManagerOnSubmission(e.target.checked)
                    }
                    className="mt-0.5 h-3.5 w-3.5 accent-[#0C830C] text-[#0C830C] border-zinc-300 rounded focus:ring-[#0C830C]"
                  />
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-zinc-950">
                      Notify Manager When Submitted
                    </span>
                    <p className="text-[10px] text-zinc-400 mt-0.5">
                      Send notification to managers when timesheets are
                      submitted
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifyStaffOnApproval}
                    onChange={(e) => setNotifyStaffOnApproval(e.target.checked)}
                    className="mt-0.5 h-3.5 w-3.5 accent-[#0C830C] text-[#0C830C] border-zinc-300 rounded focus:ring-[#0C830C]"
                  />
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-zinc-950">
                      Notify Staff When Approved
                    </span>
                    <p className="text-[10px] text-zinc-400 mt-0.5">
                      Notify staff when their timesheets are approved
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifyStaffOnRejection}
                    onChange={(e) =>
                      setNotifyStaffOnRejection(e.target.checked)
                    }
                    className="mt-0.5 h-3.5 w-3.5 accent-[#0C830C] text-[#0C830C] border-zinc-300 rounded focus:ring-[#0C830C]"
                  />
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-zinc-950">
                      Notify Staff When Rejected
                    </span>
                    <p className="text-[10px] text-zinc-400 mt-0.5">
                      Notify staff if their timesheet is rejected or requires
                      revision
                    </p>
                  </div>
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white border border-zinc-200 rounded-2xl shadow-xs">
          <button
            type="button"
            onClick={() => toggleSection("payroll")}
            className={`w-full flex justify-between items-center px-6 py-4.5 bg-zinc-50/50 border-b border-zinc-100 hover:bg-zinc-50/80 transition-colors text-left rounded-t-2xl ${
              !openSections.payroll ? "rounded-b-2xl" : ""
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-sm font-extrabold text-zinc-900 tracking-wide uppercase">
                6. Payroll Settings
              </span>
            </div>
            <ChevronDown
              className={`h-4.5 w-4.5 text-zinc-400 transition-transform duration-350 ease-out ${
                openSections.payroll ? "rotate-180" : ""
              }`}
            />
          </button>

          <div
            className={`accordion-grid ${openSections.payroll ? "accordion-grid-open" : ""}`}
          >
            <div className="accordion-grid-inner rounded-b-2xl">
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="space-y-3">
                    <div className="flex items-center gap-1.5">
                      <label className="text-xs font-extrabold text-zinc-700 uppercase tracking-wide">
                        Timesheet Week Starts On
                      </label>
                      <div className="group relative">
                        <Info className="h-3.5 w-3.5 text-zinc-400 cursor-pointer" />
                        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block w-48 bg-zinc-900 text-white text-[10px] p-2 rounded shadow-lg text-center font-normal z-50">
                          Select the starting day for formatting weekly
                          summaries.
                        </span>
                      </div>
                    </div>
                    <div>
                      <Dropdown
                        value={weekStartsOn}
                        onChange={(val) => setWeekStartsOn(val)}
                        options={WEEK_START_OPTIONS}
                        className="w-full"
                        triggerClassName="rounded-xl py-2 px-3.5 border-zinc-200 font-bold text-zinc-950"
                        optionClassName="font-bold text-zinc-700"
                      />
                      <p className="text-[10px] text-zinc-400 mt-1.5">
                        Select the first day of the week.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-1.5">
                      <label className="text-xs font-extrabold text-zinc-700 uppercase tracking-wide">
                        Payroll Export Format
                      </label>
                      <div className="group relative">
                        <Info className="h-3.5 w-3.5 text-zinc-400 cursor-pointer" />
                        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block w-48 bg-zinc-900 text-white text-[10px] p-2 rounded shadow-lg text-center font-normal z-50">
                          Determine target file type or system integration
                          format.
                        </span>
                      </div>
                    </div>
                    <div>
                      <Dropdown
                        value={payrollExportFormat}
                        onChange={(val) => setPayrollExportFormat(val)}
                        options={PAYROLL_EXPORT_OPTIONS}
                        className="w-full"
                        triggerClassName="rounded-xl py-2 px-3.5 border-zinc-200 font-bold text-zinc-950"
                        optionClassName="font-bold text-zinc-700"
                      />
                      <p className="text-[10px] text-zinc-400 mt-1.5">
                        Select format for payroll export.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-1.5">
                      <label className="text-xs font-extrabold text-zinc-700 uppercase tracking-wide">
                        Lock Payroll Period
                      </label>
                      <div className="group relative">
                        <Info className="h-3.5 w-3.5 text-zinc-400 cursor-pointer" />
                        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block w-48 bg-zinc-900 text-white text-[10px] p-2 rounded shadow-lg text-center font-normal z-50">
                          Lock timesheets up to a specific date to prevent late
                          edits.
                        </span>
                      </div>
                    </div>
                    <div ref={calendarContainerRef} className="relative">
                      <button
                        type="button"
                        onClick={() => setShowCalendar(!showCalendar)}
                        className="w-full flex justify-between items-center bg-white border border-zinc-200 text-xs hover:bg-zinc-50/50 transition-colors focus:outline-none focus:ring-1 focus:ring-[#0a2924] focus:border-[#0a2924] cursor-pointer rounded-xl py-2.5 px-3.5 shadow-xs font-bold animate-fade-in"
                      >
                        <span
                          className={
                            lockPayrollPeriodDate
                              ? "text-zinc-950"
                              : "text-zinc-400"
                          }
                        >
                          {lockPayrollPeriodDate || "Select date"}
                        </span>
                        <CalendarIcon className="h-4 w-4 text-zinc-400" />
                      </button>

                      {showCalendar && (
                        <Calendar
                          selectedDate={lockPayrollPeriodDate}
                          onChange={(dateStr) => {
                            setLockPayrollPeriodDate(dateStr);
                            setShowCalendar(false);
                          }}
                          className="right-0 top-full mt-1.5"
                        />
                      )}
                    </div>
                  </div>
                </div>

                <div className="border-t border-zinc-100 pt-5">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={lockTimesheetsBeforeDate}
                      onChange={(e) =>
                        setLockTimesheetsBeforeDate(e.target.checked)
                      }
                      className="mt-0.5 h-3.5 w-3.5 accent-[#0C830C] text-[#0C830C] border-zinc-300 rounded focus:ring-[#0C830C]"
                    />
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-zinc-950">
                        Lock timesheets before this date
                      </span>
                      <p className="text-[10px] text-zinc-400 mt-0.5">
                        Locked timesheets cannot be edited or deleted by staff
                        or managers.
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-zinc-100">
          <button
            type="button"
            onClick={handleCancel}
            className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-zinc-600 hover:text-zinc-900 border border-zinc-200 hover:bg-zinc-50 rounded-4xl transition-all cursor-pointer"
          >
            Discard Changes
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 bg-[#0a2924] hover:bg-[#08211d] text-white px-6 py-2.5 text-xs font-bold rounded-4xl transition-all shadow-sm disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
          >
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </form>
    </div>
  );
}
