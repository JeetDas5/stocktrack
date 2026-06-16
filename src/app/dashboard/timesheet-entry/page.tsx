/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { toast } from "sonner";
import { useEffect, useState, useMemo, useRef } from "react";
import {
  Calendar as CalendarIcon,
  Clock,
  ChevronDown,
  ChevronRight,
  X,
  Send,
  Loader2,
} from "lucide-react";

import { Staff } from "@/types/staff";
import Calendar from "@/components/ui/calendar";
import { useAuth } from "@/providers/auth-provider";
import TimePicker from "@/components/ui/time-picker";
import { useBusinessStore } from "@/stores/business-store";
import { useLocationStore } from "@/stores/location-store";
import { getStaffMembers } from "@/lib/repositories/staff.repository";
import { createTimesheet } from "@/lib/repositories/timesheet.repository";

export default function TimesheetEntryPage() {
  const { activeBusinessId } = useBusinessStore();
  const { activeLocationId } = useLocationStore();
  const { profile, loading: authLoading } = useAuth();

  const isStaff = profile?.role === "staff";

  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [staffId, setStaffId] = useState("");

  const [workDate, setWorkDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [unpaidBreak, setUnpaidBreak] = useState("30");
  const [notes, setNotes] = useState("");

  const [loadingContext, setLoadingContext] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [showStaffDropdown, setShowStaffDropdown] = useState(false);
  const staffRef = useRef<HTMLDivElement>(null);

  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const calendarRef = useRef<HTMLDivElement>(null);

  const [isStartTimeOpen, setIsStartTimeOpen] = useState(false);
  const startTimeRef = useRef<HTMLDivElement>(null);

  const [isEndTimeOpen, setIsEndTimeOpen] = useState(false);
  const endTimeRef = useRef<HTMLDivElement>(null);

  const getTodayDateString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = (d.getMonth() + 1).toString().padStart(2, "0");
    const day = d.getDate().toString().padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const getCurrentTimeString = () => {
    const d = new Date();
    const hour = d.getHours().toString().padStart(2, "0");
    const minute = d.getMinutes().toString().padStart(2, "0");
    return `${hour}:${minute}`;
  };

  useEffect(() => {
    setWorkDate(getTodayDateString());
    setStartTime(getCurrentTimeString());
    setEndTime(getCurrentTimeString());
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        staffRef.current &&
        !staffRef.current.contains(event.target as Node)
      ) {
        setShowStaffDropdown(false);
      }
      if (
        calendarRef.current &&
        !calendarRef.current.contains(event.target as Node)
      ) {
        setIsCalendarOpen(false);
      }
      if (
        startTimeRef.current &&
        !startTimeRef.current.contains(event.target as Node)
      ) {
        setIsStartTimeOpen(false);
      }
      if (
        endTimeRef.current &&
        !endTimeRef.current.contains(event.target as Node)
      ) {
        setIsEndTimeOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (profile) {
      if (profile.role === "staff") {
        setStaffId(profile.uid);
      }
    }
  }, [profile]);

  useEffect(() => {
    const currentBusinessId = activeBusinessId;
    if (!currentBusinessId) {
      setStaffList([]);
      setLoadingContext(false);
      return;
    }

    async function loadStaffList() {
      if (!currentBusinessId) return;
      try {
        setLoadingContext(true);
        const sList = await getStaffMembers(currentBusinessId);
        setStaffList(sList);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingContext(false);
      }
    }
    loadStaffList();
  }, [activeBusinessId]);

  const selectedStaffName = useMemo(() => {
    if (isStaff && profile) {
      return profile.fullName;
    }
    return staffList.find((s) => s.id === staffId)?.name || "";
  }, [isStaff, profile, staffList, staffId]);

  const filteredStaffList = useMemo(() => {
    if (isStaff) return [];
    return staffList.filter((s) => {
      if (s.businessId !== activeBusinessId) return false;
      if (!activeLocationId) return true;
      return s.locations?.some((loc) => loc.id === activeLocationId);
    });
  }, [staffList, activeBusinessId, activeLocationId, isStaff]);

  const getInitials = (name: string) => {
    if (!name) return "";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();
  };

  const getAvatarColor = (name: string) => {
    const hash = name
      .split("")
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const colors = [
      "bg-purple-100 text-purple-700 border-purple-200",
      "bg-emerald-100 text-emerald-700 border-emerald-200",
      "bg-indigo-100 text-indigo-700 border-indigo-200",
      "bg-blue-100 text-blue-700 border-blue-200",
      "bg-rose-100 text-rose-700 border-rose-200",
      "bg-amber-100 text-amber-700 border-amber-200",
    ];
    return colors[hash % colors.length];
  };

  const totalHoursCalculated = useMemo(() => {
    if (!startTime || !endTime) return { text: "0h 00m", hours: 0 };
    const [startH, startM] = startTime.split(":").map(Number);
    const [endH, endM] = endTime.split(":").map(Number);
    let diffMins = endH * 60 + endM - (startH * 60 + startM);
    if (diffMins < 0) {
      diffMins += 24 * 60;
    }
    const breakMins = parseInt(unpaidBreak, 10) || 0;
    const netMins = Math.max(0, diffMins - breakMins);
    const h = Math.floor(netMins / 60);
    const m = netMins % 60;
    return {
      text: `${h}h ${m.toString().padStart(2, "0")}m`,
      hours: netMins / 60,
    };
  }, [startTime, endTime, unpaidBreak]);

  const formatTimeToAMPM = (timeStr: string) => {
    if (!timeStr) return "";
    const [hourStr, minStr] = timeStr.split(":");
    const hour = parseInt(hourStr, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    const formattedHour = hour % 12 === 0 ? 12 : hour % 12;
    const zeroPaddedHour = formattedHour.toString().padStart(2, "0");
    return `${zeroPaddedHour}:${minStr} ${ampm}`;
  };

  const formatDateToDisplay = (dateStr: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = d.getDate();
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  };

  const handleStaffChange = (selectedStaffId: string) => {
    setStaffId(selectedStaffId);
  };

  const handleClear = () => {
    setWorkDate(getTodayDateString());
    setStartTime(getCurrentTimeString());
    setEndTime(getCurrentTimeString());
    setUnpaidBreak("30");
    setNotes("");
    if (!isStaff) {
      setStaffId("");
    }
    toast.success("Form cleared successfully.");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBusinessId) {
      toast.error(
        "Active business not found. Please select a business from the switcher.",
      );
      return;
    }
    if (!activeLocationId) {
      toast.error(
        "Active location not found. Please select a location from the switcher.",
      );
      return;
    }
    if (!staffId) {
      toast.error("Please select a staff member.");
      return;
    }
    if (startTime > endTime) {
      toast.error("Start time should be before end time.");
      return;
    }
    if (startTime == endTime) {
      toast.error("Start time and end time cannot be the same.");
      return;
    }
    if (!workDate) {
      toast.error("Work date is required.");
      return;
    }
    setSubmitting(true);
    try {
      await createTimesheet(activeBusinessId, {
        locationId: activeLocationId,
        staffId,
        workDate,
        startTime,
        endTime,
        unpaidBreak: parseInt(unpaidBreak, 10) || 0,
        notes: notes.trim() || undefined,
      });
      toast.success("Timesheet submitted successfully!");
      setNotes("");
      setWorkDate(getTodayDateString());
      setStartTime(getCurrentTimeString());
      setEndTime(getCurrentTimeString());
      setUnpaidBreak("30");
    } catch (err: unknown) {
      toast.error((err as Error).message || "Failed to submit timesheet.");
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || loadingContext) {
    return (
      <div className="h-[75vh] flex flex-col items-center justify-center bg-white text-[#0F172A]">
        <Loader2 className="h-7 w-7 text-[#16A34A] animate-spin mb-3" />
        <span className="text-[#64748B] text-xs font-bold uppercase tracking-wider">
          Syncing entry layout...
        </span>
      </div>
    );
  }

  return (
    <div className="p-6 bg-zinc-50/30 min-h-[85vh] relative select-none">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-1.5 text-xs font-bold text-[#16A34A] mb-3 uppercase tracking-wider">
          <span>Timesheet Entry</span>
          <ChevronRight className="h-3 w-3 text-zinc-400" />
          <span className="text-zinc-500">Enter Timesheet</span>
        </div>

        <h1 className="text-3xl font-extrabold text-[#0F172A] tracking-tight">
          Enter Timesheet
        </h1>
        <p className="text-sm text-zinc-500 mt-1 mb-8">
          Manually enter work hours for a staff member.
        </p>

        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto space-y-6">
          <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-2xs space-y-6">
            <h2 className="text-base font-extrabold text-[#0F172A] border-b border-zinc-100 pb-3">
              Timesheet Details
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="flex flex-col space-y-2" ref={staffRef}>
                <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider flex items-center">
                  Staff Member <span className="text-red-500 ml-1">*</span>
                </label>
                {isStaff ? (
                  <div className="flex items-center gap-2.5 w-full border border-zinc-200 rounded-xl bg-zinc-50/50 px-3 py-2.5 cursor-not-allowed">
                    <div
                      className={`h-6 w-6 rounded-full flex items-center justify-center font-extrabold text-[10px] border ${getAvatarColor(selectedStaffName)}`}
                    >
                      {getInitials(selectedStaffName)}
                    </div>
                    <span className="text-xs font-extrabold text-zinc-800">
                      {selectedStaffName}
                    </span>
                  </div>
                ) : (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowStaffDropdown(!showStaffDropdown)}
                      className="flex items-center gap-2.5 w-full border border-zinc-200 rounded-xl bg-white px-3 py-2.5 text-left focus:outline-none focus:ring-2 focus:ring-[#16A34A]/20 focus:border-[#16A34A] transition-all cursor-pointer"
                    >
                      {staffId ? (
                        <>
                          <div
                            className={`h-6 w-6 rounded-full flex items-center justify-center font-extrabold text-[10px] border ${getAvatarColor(selectedStaffName)}`}
                          >
                            {getInitials(selectedStaffName)}
                          </div>
                          <span className="text-xs font-extrabold text-zinc-800">
                            {selectedStaffName}
                          </span>
                        </>
                      ) : (
                        <span className="text-xs text-zinc-400 font-semibold">
                          Select Staff Member
                        </span>
                      )}
                      <ChevronDown className="h-4 w-4 text-zinc-400 ml-auto" />
                    </button>

                    {showStaffDropdown && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-zinc-200 rounded-xl shadow-lg z-30 max-h-56 overflow-y-auto">
                        {filteredStaffList.map((staff) => (
                          <button
                            type="button"
                            key={staff.id}
                            onClick={() => {
                              handleStaffChange(staff.id);
                              setShowStaffDropdown(false);
                            }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-zinc-50 transition-colors text-left"
                          >
                            <div
                              className={`h-6 w-6 rounded-full flex items-center justify-center font-extrabold text-[10px] border ${getAvatarColor(staff.name)}`}
                            >
                              {getInitials(staff.name)}
                            </div>
                            <span className="text-xs font-extrabold text-zinc-855">
                              {staff.name}
                            </span>
                          </button>
                        ))}
                        {filteredStaffList.length === 0 && (
                          <div className="p-3 text-center text-xs text-zinc-400 font-semibold">
                            No staff members found
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex flex-col space-y-2" ref={calendarRef}>
                <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider flex items-center">
                  Work Date <span className="text-red-500 ml-1">*</span>
                </label>
                <div className="relative">
                  <div
                    onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                    className="flex items-center border border-zinc-200 rounded-xl bg-white px-3 py-2.5 focus-within:ring-2 focus-within:ring-[#16A34A]/20 focus-within:border-[#16A34A] transition-all cursor-pointer"
                  >
                    <CalendarIcon className="h-4 w-4 text-zinc-400 mr-2.5" />
                    <span className="text-xs font-extrabold text-zinc-800">
                      {formatDateToDisplay(workDate) || "Select Work Date"}
                    </span>
                  </div>
                  {isCalendarOpen && (
                    <Calendar
                      selectedDate={workDate}
                      onChange={(dateStr) => {
                        setWorkDate(dateStr);
                        setIsCalendarOpen(false);
                      }}
                      className="right-auto left-0"
                    />
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="flex flex-col space-y-2" ref={startTimeRef}>
                <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider flex items-center">
                  Start Time <span className="text-red-500 ml-1">*</span>
                </label>
                <div className="relative">
                  <div
                    onClick={() => setIsStartTimeOpen(!isStartTimeOpen)}
                    className="flex items-center border border-zinc-200 rounded-xl bg-white px-3 py-2.5 focus-within:ring-2 focus-within:ring-[#16A34A]/20 focus-within:border-[#16A34A] transition-all cursor-pointer"
                  >
                    <Clock className="h-4 w-4 text-zinc-400 mr-2.5" />
                    <span className="text-xs font-extrabold text-zinc-800">
                      {formatTimeToAMPM(startTime) || "Select Start Time"}
                    </span>
                  </div>
                  {isStartTimeOpen && (
                    <TimePicker
                      value={startTime}
                      onChange={(timeStr) => {
                        setStartTime(timeStr);
                      }}
                      className="right-auto left-0"
                    />
                  )}
                </div>
              </div>

              <div className="flex flex-col space-y-2" ref={endTimeRef}>
                <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider flex items-center">
                  End Time <span className="text-red-500 ml-1">*</span>
                </label>
                <div className="relative">
                  <div
                    onClick={() => setIsEndTimeOpen(!isEndTimeOpen)}
                    className="flex items-center border border-zinc-200 rounded-xl bg-white px-3 py-2.5 focus-within:ring-2 focus-within:ring-[#16A34A]/20 focus-within:border-[#16A34A] transition-all cursor-pointer"
                  >
                    <Clock className="h-4 w-4 text-zinc-400 mr-2.5" />
                    <span className="text-xs font-extrabold text-zinc-800">
                      {formatTimeToAMPM(endTime) || "Select End Time"}
                    </span>
                  </div>
                  {isEndTimeOpen && (
                    <TimePicker
                      value={endTime}
                      onChange={(timeStr) => {
                        setEndTime(timeStr);
                      }}
                      className="right-auto left-0"
                    />
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="flex flex-col space-y-2">
                <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
                  Unpaid Break (minutes)
                </label>
                <input
                  type="number"
                  min="0"
                  value={unpaidBreak}
                  onChange={(e) => setUnpaidBreak(e.target.value)}
                  className="w-full bg-white border border-zinc-200 focus:border-[#16A34A] rounded-xl py-2.5 px-3.5 text-xs text-zinc-800 font-extrabold placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-[#16A34A] transition-all shadow-2xs"
                />
                <span className="text-[10px] text-zinc-400 font-semibold">
                  Total unpaid break time in minutes.
                </span>
              </div>

              <div className="bg-[#ECFDF5] border border-[#A7F3D0]/60 rounded-xl p-4 flex flex-col justify-between h-[84px] relative self-start md:mt-2">
                <div className="flex justify-between items-center w-full">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800">
                    Total Hours (Calculated)
                  </span>
                  <Clock className="h-4 w-4 text-emerald-600" />
                </div>
                <div className="text-2xl font-extrabold text-emerald-950 leading-none">
                  {totalHoursCalculated.text}
                </div>
                <span className="text-[10px] text-emerald-700 font-semibold">
                  This is calculated automatically.
                </span>
              </div>
            </div>

            <div className="flex flex-col space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
                  Notes (Optional)
                </label>
                <span className="text-[10px] text-zinc-400 font-bold tracking-wider">
                  {notes.length}/250
                </span>
              </div>
              <textarea
                placeholder="Add any notes related to this timesheet..."
                rows={3}
                value={notes}
                onChange={(e) => {
                  if (e.target.value.length <= 250) {
                    setNotes(e.target.value);
                  }
                }}
                className="w-full bg-white border border-zinc-200 focus:border-[#16A34A] rounded-xl py-2.5 px-3.5 text-xs text-zinc-850 font-semibold placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-[#16A34A] transition-all shadow-2xs resize-none"
              />
              <span className="text-[10px] text-zinc-400 font-semibold">
                Maximum 250 characters.
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={handleClear}
              disabled={submitting}
              className="bg-white hover:bg-zinc-50 border border-zinc-200 text-zinc-700 rounded-xl px-5 py-2.5 text-xs font-bold uppercase tracking-wider shadow-2xs flex items-center gap-2 cursor-pointer transition-all duration-200 disabled:opacity-50"
            >
              <X className="h-4 w-4" />
              Clear Form
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="bg-[#16A34A] hover:bg-[#15803D] text-white rounded-xl px-6 py-2.5 text-xs font-bold uppercase tracking-wider shadow-sm flex items-center gap-2 cursor-pointer transition-all duration-200 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  Submit Timesheet
                  <Send className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
