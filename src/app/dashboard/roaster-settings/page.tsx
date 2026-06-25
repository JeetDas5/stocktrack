"use client";

import { toast } from "sonner";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Save,
  Plus,
  Trash2,
  Edit2,
  AlertCircle,
  X,
} from "lucide-react";

import { useAuth } from "@/providers/auth-provider";
import { useBusinessStore } from "@/stores/business-store";
import {
  getRosterSettings,
  saveRosterSettings,
} from "@/lib/repositories/roster-settings.repository";

export default function RosterSettingsPage() {
  const router = useRouter();
  const { profile, loading: authLoading } = useAuth();
  const { activeBusinessId } = useBusinessStore();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [rosterPeriod, setRosterPeriod] = useState("Weekly");
  const [deadlineDay, setDeadlineDay] = useState("Sunday");
  const [deadlineTime, setDeadlineTime] = useState("06:00 PM");
  const [defaultPriority, setDefaultPriority] = useState(5);
  const [allowAdminOverride, setAllowAdminOverride] = useState(true);
  const [notifyStaffApproved, setNotifyStaffApproved] = useState(true);

  const [positions, setPositions] = useState<string[]>([]);
  const [newPosition, setNewPosition] = useState("");

  const [shiftTypes, setShiftTypes] = useState<
    { name: string; hours: number; color: string }[]
  >([]);
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [editingShiftIndex, setEditingShiftIndex] = useState<number | null>(
    null,
  );
  const [shiftName, setShiftName] = useState("");
  const [shiftHours, setShiftHours] = useState(6.0);
  const [shiftColor, setShiftColor] = useState("#FFB020");

  const [requiredRoles, setRequiredRoles] = useState<
    { shift_type: string; roles: { role: string; min_count: number }[] }[]
  >([]);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [editingRoleIndex, setEditingRoleIndex] = useState<number | null>(null);
  const [reqShiftType, setReqShiftType] = useState("");
  const [reqRolesList, setReqRolesList] = useState<
    { role: string; min_count: number }[]
  >([]);
  const [selectedAddRole, setSelectedAddRole] = useState("");
  const [selectedAddCount, setSelectedAddCount] = useState(1);

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
        const data = await getRosterSettings(activeBusinessId);
        setRosterPeriod(data.roster_period);
        setDeadlineDay(data.availability_deadline_day);
        setDeadlineTime(data.availability_deadline_time);
        setDefaultPriority(data.default_priority);
        setAllowAdminOverride(data.allow_admin_override);
        setNotifyStaffApproved(data.notify_staff_approved);
        setPositions(data.positions || []);
        setShiftTypes(data.default_shift_types || []);
        setRequiredRoles(data.required_roles || []);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load roster settings.");
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, [activeBusinessId]);

  const handleSave = async () => {
    if (!activeBusinessId) return;
    try {
      setSaving(true);
      await saveRosterSettings(activeBusinessId, {
        roster_period: rosterPeriod,
        availability_deadline_day: deadlineDay,
        availability_deadline_time: deadlineTime,
        default_shift_types: shiftTypes,
        required_roles: requiredRoles,
        default_priority: defaultPriority,
        allow_admin_override: allowAdminOverride,
        notify_staff_approved: notifyStaffApproved,
        positions: positions,
      });
      toast.success("Roster settings saved successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  const handleAddPosition = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPos = newPosition.trim();
    if (!cleanPos) return;
    if (positions.some((p) => p.toLowerCase() === cleanPos.toLowerCase())) {
      toast.error("Position already exists.");
      return;
    }
    setPositions([...positions, cleanPos]);
    setNewPosition("");
  };

  const handleRemovePosition = (index: number) => {
    setPositions(positions.filter((_, i) => i !== index));
  };

  const openAddShiftModal = () => {
    setEditingShiftIndex(null);
    setShiftName("");
    setShiftHours(6.0);
    setShiftColor("#FFB020");
    setIsShiftModalOpen(true);
  };

  const openEditShiftModal = (index: number) => {
    setEditingShiftIndex(index);
    const s = shiftTypes[index];
    setShiftName(s.name);
    setShiftHours(s.hours);
    setShiftColor(s.color);
    setIsShiftModalOpen(true);
  };

  const handleSaveShift = () => {
    if (!shiftName.trim()) {
      toast.error("Shift type name is required.");
      return;
    }
    const newShift = {
      name: shiftName.trim(),
      hours: Number(shiftHours) || 0,
      color: shiftColor,
    };

    if (editingShiftIndex === null) {
      setShiftTypes([...shiftTypes, newShift]);
    } else {
      setShiftTypes(
        shiftTypes.map((s, idx) => (idx === editingShiftIndex ? newShift : s)),
      );
    }
    setIsShiftModalOpen(false);
  };

  const handleDeleteShift = (index: number) => {
    setShiftTypes(shiftTypes.filter((_, i) => i !== index));
  };

  const openAddRoleModal = () => {
    setEditingRoleIndex(null);
    setReqShiftType(shiftTypes[0]?.name || "");
    setReqRolesList([]);
    setSelectedAddRole(positions[0] || "");
    setSelectedAddCount(1);
    setIsRoleModalOpen(true);
  };

  const openEditRoleModal = (index: number) => {
    setEditingRoleIndex(index);
    const r = requiredRoles[index];
    setReqShiftType(r.shift_type);
    setReqRolesList([...r.roles]);
    setSelectedAddRole(positions[0] || "");
    setSelectedAddCount(1);
    setIsRoleModalOpen(true);
  };

  const handleAddRoleToList = () => {
    if (!selectedAddRole) {
      toast.error("Select a position role.");
      return;
    }
    if (reqRolesList.some((r) => r.role === selectedAddRole)) {
      toast.error("Role already added to this requirement. Edit or remove it.");
      return;
    }
    setReqRolesList([
      ...reqRolesList,
      { role: selectedAddRole, min_count: selectedAddCount },
    ]);
  };

  const handleRemoveRoleFromList = (roleName: string) => {
    setReqRolesList(reqRolesList.filter((r) => r.role !== roleName));
  };

  const handleSaveRoleRequirement = () => {
    if (!reqShiftType) {
      toast.error("Shift type is required.");
      return;
    }
    const newReq = {
      shift_type: reqShiftType,
      roles: reqRolesList,
    };

    if (editingRoleIndex === null) {
      if (requiredRoles.some((r) => r.shift_type === reqShiftType)) {
        toast.error(
          "Requirement for this shift already exists. Edit the existing one.",
        );
        return;
      }
      setRequiredRoles([...requiredRoles, newReq]);
    } else {
      setRequiredRoles(
        requiredRoles.map((r, idx) => (idx === editingRoleIndex ? newReq : r)),
      );
    }
    setIsRoleModalOpen(false);
  };

  const handleDeleteRoleRequirement = (index: number) => {
    setRequiredRoles(requiredRoles.filter((_, i) => i !== index));
  };

  if (authLoading || loading) {
    return (
      <div className="h-[75vh] flex flex-col items-center justify-center bg-white text-[#0F172A]">
        <Loader2 className="h-7 w-7 text-[#16A34A] animate-spin mb-3" />
        <span className="text-[#64748B] text-xs font-bold uppercase tracking-wider">
          Syncing roster settings...
        </span>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white min-h-[85vh] select-none max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-zinc-200 pb-5 mb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-[#0F172A] tracking-tight">
            Roster Settings
          </h1>
          <p className="text-zinc-500 text-xs font-bold mt-1">
            Configure how rosters are created, deadlines, required roles, and
            staff configurations.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-[#0F4C3A] hover:bg-[#0A3327] text-white rounded-xl px-5 py-3 text-xs font-bold uppercase tracking-wider shadow-sm flex items-center gap-2 cursor-pointer transition-all duration-200 disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Save Settings
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-zinc-200 rounded-3xl p-5 shadow-2xs">
            <div className="flex items-center gap-3 mb-1.5">
              <span className="bg-[#0F172A] text-white font-extrabold text-xs h-6 w-6 rounded-full flex items-center justify-center">
                1
              </span>
              <h3 className="text-sm font-extrabold text-[#0F172A] uppercase tracking-wide">
                Roster Period
              </h3>
            </div>
            <p className="text-zinc-400 text-[11px] font-semibold pl-9 mb-4">
              Choose how often rosters are created.
            </p>
            <div className="pl-9 max-w-md">
              <label className="text-[10px] font-extrabold text-zinc-500 uppercase block mb-1">
                Roster period
              </label>
              <select
                value={rosterPeriod}
                onChange={(e) => setRosterPeriod(e.target.value)}
                className="w-full bg-white border border-zinc-350 focus:border-[#16A34A] rounded-xl py-3 px-4 text-xs font-bold text-zinc-950 focus:outline-none focus:ring-1 focus:ring-[#16A34A] cursor-pointer"
              >
                <option value="Weekly">Weekly</option>
                <option value="Fortnightly">Fortnightly</option>
                <option value="Monthly">Monthly</option>
              </select>
            </div>
          </div>

          <div className="bg-white border border-zinc-200 rounded-3xl p-5 shadow-2xs">
            <div className="flex items-center gap-3 mb-1.5">
              <span className="bg-[#0F172A] text-white font-extrabold text-xs h-6 w-6 rounded-full flex items-center justify-center">
                2
              </span>
              <h3 className="text-sm font-extrabold text-[#0F172A] uppercase tracking-wide">
                Availability
              </h3>
            </div>
            <p className="text-zinc-400 text-[11px] font-semibold pl-9 mb-4">
              Staff must submit their availability before this time each roster
              period.
            </p>
            <div className="pl-9 grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md">
              <div>
                <label className="text-[10px] font-extrabold text-zinc-500 uppercase block mb-1">
                  Availability deadline
                </label>
                <select
                  value={deadlineDay}
                  onChange={(e) => setDeadlineDay(e.target.value)}
                  className="w-full bg-white border border-zinc-350 focus:border-[#16A34A] rounded-xl py-3 px-4 text-xs font-bold text-zinc-950 focus:outline-none focus:ring-1 focus:ring-[#16A34A] cursor-pointer"
                >
                  {[
                    "Monday",
                    "Tuesday",
                    "Wednesday",
                    "Thursday",
                    "Friday",
                    "Saturday",
                    "Sunday",
                  ].map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-extrabold text-zinc-500 uppercase block mb-1">
                  Deadline time
                </label>
                <input
                  type="text"
                  value={deadlineTime}
                  onChange={(e) => setDeadlineTime(e.target.value)}
                  placeholder="e.g. 06:00 PM"
                  className="w-full bg-white border border-zinc-350 focus:border-[#16A34A] rounded-xl py-3 px-4 text-xs font-bold text-zinc-950 focus:outline-none focus:ring-1 focus:ring-[#16A34A]"
                />
              </div>
            </div>
          </div>

          <div className="bg-white border border-zinc-200 rounded-3xl p-5 shadow-2xs">
            <div className="flex items-center justify-between gap-4 mb-1.5">
              <div className="flex items-center gap-3">
                <span className="bg-[#0F172A] text-white font-extrabold text-xs h-6 w-6 rounded-full flex items-center justify-center">
                  3
                </span>
                <h3 className="text-sm font-extrabold text-[#0F172A] uppercase tracking-wide">
                  Default Shift Types
                </h3>
              </div>
              <button
                onClick={openAddShiftModal}
                className="text-xs font-bold text-[#0F4C3A] hover:text-[#0A3327] border border-zinc-200 rounded-xl px-3.5 py-2 flex items-center gap-1.5 transition-all shadow-3xs cursor-pointer hover:bg-zinc-50"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Shift Type
              </button>
            </div>
            <p className="text-zinc-400 text-[11px] font-semibold pl-9 mb-4">
              These shift types will be used by default in the roster builder.
            </p>

            <div className="pl-9 overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-200 text-[9px] uppercase font-extrabold text-zinc-400 bg-zinc-50/50">
                    <th className="py-2.5 px-3">Shift Type</th>
                    <th className="py-2.5 px-3">Default Hours</th>
                    <th className="py-2.5 px-3">Colour</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-xs font-bold divide-y divide-zinc-100">
                  {shiftTypes.map((s, idx) => (
                    <tr key={idx} className="hover:bg-zinc-50/20">
                      <td className="py-3 px-3 text-zinc-950">{s.name}</td>
                      <td className="py-3 px-3 text-zinc-500">
                        {s.hours.toFixed(1)} hrs
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: s.color }}
                          />
                          <span className="text-[10px] text-zinc-400 uppercase font-mono">
                            {s.color}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right flex items-center justify-end gap-2 text-zinc-400">
                        <button
                          onClick={() => openEditShiftModal(idx)}
                          className="hover:text-zinc-700 cursor-pointer p-1 hover:bg-zinc-100 rounded-lg transition"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteShift(idx)}
                          className="hover:text-red-500 cursor-pointer p-1 hover:bg-zinc-100 rounded-lg transition"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {shiftTypes.length === 0 && (
                    <tr>
                      <td
                        colSpan={4}
                        className="text-center py-6 text-zinc-400 font-semibold italic text-xs"
                      >
                        No shift types configured.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white border border-zinc-200 rounded-3xl p-5 shadow-2xs">
            <div className="flex items-center justify-between gap-4 mb-1.5">
              <div className="flex items-center gap-3">
                <span className="bg-[#0F172A] text-white font-extrabold text-xs h-6 w-6 rounded-full flex items-center justify-center">
                  4
                </span>
                <h3 className="text-sm font-extrabold text-[#0F172A] uppercase tracking-wide">
                  Required Roles (Minimum per Shift)
                </h3>
              </div>
              <button
                onClick={openAddRoleModal}
                className="text-xs font-bold text-[#0F4C3A] hover:text-[#0A3327] border border-zinc-200 rounded-xl px-3.5 py-2 flex items-center gap-1.5 transition-all shadow-3xs cursor-pointer hover:bg-zinc-50"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Role Requirement
              </button>
            </div>
            <p className="text-zinc-400 text-[11px] font-semibold pl-9 mb-4">
              Set the minimum roles required for each shift. The roster builder
              will ensure these roles are filled.
            </p>

            <div className="pl-9 overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-200 text-[9px] uppercase font-extrabold text-zinc-400 bg-zinc-50/50">
                    <th className="py-2.5 px-3">Shift Type</th>
                    <th className="py-2.5 px-3">Required Roles (Minimum)</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-xs font-bold divide-y divide-zinc-100">
                  {requiredRoles.map((r, idx) => (
                    <tr key={idx} className="hover:bg-zinc-50/20">
                      <td className="py-3 px-3 text-zinc-950">
                        {r.shift_type}
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex flex-wrap gap-1.5">
                          {r.roles.map((rl, rIdx) => (
                            <span
                              key={rIdx}
                              className="bg-zinc-100 text-zinc-700 px-2 py-0.5 rounded-lg text-[10px]"
                            >
                              {rl.role} ({rl.min_count})
                            </span>
                          ))}
                          {r.roles.length === 0 && (
                            <span className="text-zinc-400 italic font-medium">
                              None
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right flex items-center justify-end gap-2 text-zinc-400">
                        <button
                          onClick={() => openEditRoleModal(idx)}
                          className="hover:text-zinc-700 cursor-pointer p-1 hover:bg-zinc-100 rounded-lg transition"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteRoleRequirement(idx)}
                          className="hover:text-red-500 cursor-pointer p-1 hover:bg-zinc-100 rounded-lg transition"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {requiredRoles.length === 0 && (
                    <tr>
                      <td
                        colSpan={3}
                        className="text-center py-6 text-zinc-400 font-semibold italic text-xs"
                      >
                        No role requirements configured.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white border border-zinc-200 rounded-3xl p-5 shadow-2xs">
            <div className="flex items-center gap-3 mb-1.5">
              <span className="bg-[#0F172A] text-white font-extrabold text-xs h-6 w-6 rounded-full flex items-center justify-center">
                5
              </span>
              <h3 className="text-sm font-extrabold text-[#0F172A] uppercase tracking-wide">
                Staff Priority
              </h3>
            </div>
            <p className="text-zinc-400 text-[11px] font-semibold pl-9 mb-4">
              Higher numbers get priority when assigning shifts.
            </p>
            <div className="pl-9 space-y-3">
              <div>
                <label className="text-[10px] font-extrabold text-zinc-500 uppercase block mb-1">
                  Default priority number
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={defaultPriority}
                  onChange={(e) => {
                    const val = Math.max(
                      1,
                      Math.min(10, Number(e.target.value) || 5),
                    );
                    setDefaultPriority(val);
                  }}
                  className="w-full bg-white border border-zinc-350 focus:border-[#16A34A] rounded-xl py-3 px-4 text-xs font-bold text-zinc-950 focus:outline-none focus:ring-1 focus:ring-[#16A34A]"
                />
              </div>
              <span className="text-[10px] font-bold text-zinc-400 block uppercase">
                Range: 1 (Highest) - 10 (Lowest)
              </span>
            </div>
          </div>

          <div className="bg-white border border-zinc-200 rounded-3xl p-5 shadow-2xs">
            <div className="flex items-center gap-3 mb-1.5">
              <span className="bg-[#0F172A] text-white font-extrabold text-xs h-6 w-6 rounded-full flex items-center justify-center">
                6
              </span>
              <h3 className="text-sm font-extrabold text-[#0F172A] uppercase tracking-wide">
                Admin Override
              </h3>
            </div>
            <p className="text-zinc-400 text-[11px] font-semibold pl-9 mb-4">
              Allow administrators to override availability or rules when
              building the roster.
            </p>
            <div className="pl-9">
              <label className="relative flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={allowAdminOverride}
                  onChange={(e) => setAllowAdminOverride(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-zinc-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#0F4C3A]" />
                <span className="text-xs font-bold text-zinc-800">
                  Allow admin override
                </span>
              </label>
              <p className="text-[10px] text-zinc-400 font-semibold mt-1">
                When enabled, admins can override rules if needed.
              </p>
            </div>
          </div>

          <div className="bg-white border border-zinc-200 rounded-3xl p-5 shadow-2xs">
            <div className="flex items-center gap-3 mb-1.5">
              <span className="bg-[#0F172A] text-white font-extrabold text-xs h-6 w-6 rounded-full flex items-center justify-center">
                7
              </span>
              <h3 className="text-sm font-extrabold text-[#0F172A] uppercase tracking-wide">
                Notifications
              </h3>
            </div>
            <p className="text-zinc-400 text-[11px] font-semibold pl-9 mb-4">
              Notify staff when the roster is approved and published.
            </p>
            <div className="pl-9">
              <label className="relative flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={notifyStaffApproved}
                  onChange={(e) => setNotifyStaffApproved(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-zinc-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#0F4C3A]" />
                <span className="text-xs font-bold text-zinc-800">
                  Notify staff when roster approved
                </span>
              </label>
              <p className="text-[10px] text-zinc-400 font-semibold mt-1">
                Staff will receive a notification when the roster is finalised.
              </p>
            </div>
          </div>

          <div className="bg-white border border-zinc-200 rounded-3xl p-5 shadow-2xs">
            <div className="flex items-center gap-3 mb-1.5">
              <span className="bg-[#0F172A] text-white font-extrabold text-xs h-6 w-6 rounded-full flex items-center justify-center">
                8
              </span>
              <h3 className="text-sm font-extrabold text-[#0F172A] uppercase tracking-wide">
                Staff Positions
              </h3>
            </div>
            <p className="text-zinc-400 text-[11px] font-semibold pl-9 mb-4">
              Create and manage the positions available for assignment.
            </p>
            <div className="pl-9 space-y-4">
              <form onSubmit={handleAddPosition} className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. Barista"
                  value={newPosition}
                  onChange={(e) => setNewPosition(e.target.value)}
                  className="flex-1 bg-white border border-zinc-300 focus:border-[#16A34A] rounded-xl py-2 px-3 text-xs font-semibold text-zinc-950 focus:outline-none focus:ring-1 focus:ring-[#16A34A]"
                />
                <button
                  type="submit"
                  className="bg-[#0F4C3A] hover:bg-[#0A3327] text-white rounded-xl px-3 py-2 text-xs font-bold uppercase tracking-wider shadow-2xs cursor-pointer flex items-center justify-center"
                >
                  Add
                </button>
              </form>

              <div className="flex flex-wrap gap-1.5">
                {positions.map((p, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-zinc-700 bg-zinc-100 border border-zinc-200 rounded-lg px-2.5 py-1"
                  >
                    {p}
                    <button
                      type="button"
                      onClick={() => handleRemovePosition(idx)}
                      className="text-zinc-400 hover:text-red-500 cursor-pointer"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                {positions.length === 0 && (
                  <span className="text-zinc-400 text-xs italic font-semibold">
                    No positions created yet.
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-5 flex items-start gap-3.5">
            <AlertCircle className="h-5 w-5 text-emerald-800 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-extrabold text-emerald-900 uppercase tracking-wide">
                Note
              </h4>
              <p className="text-[11px] text-emerald-700 font-semibold leading-relaxed mt-1">
                Changes will apply to the next roster period. Current published
                rosters will not be affected.
              </p>
            </div>
          </div>
        </div>
      </div>

      {isShiftModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-zinc-200 rounded-3xl p-6 w-full max-w-md shadow-2xl relative">
            <h3 className="text-lg font-extrabold text-[#0F172A] mb-4">
              {editingShiftIndex === null
                ? "Add Shift Type"
                : "Edit Shift Type"}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-extrabold text-zinc-500 uppercase block mb-1">
                  Shift Type Name
                </label>
                <input
                  type="text"
                  value={shiftName}
                  onChange={(e) => setShiftName(e.target.value)}
                  placeholder="e.g. Night Shift"
                  className="w-full bg-white border border-zinc-300 focus:border-[#16A34A] rounded-xl py-3 px-4 text-xs font-semibold text-zinc-950 focus:outline-none focus:ring-1 focus:ring-[#16A34A]"
                />
              </div>
              <div>
                <label className="text-[10px] font-extrabold text-zinc-500 uppercase block mb-1">
                  Default Hours
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={shiftHours}
                  onChange={(e) => setShiftHours(Number(e.target.value) || 0)}
                  className="w-full bg-white border border-zinc-300 focus:border-[#16A34A] rounded-xl py-3 px-4 text-xs font-semibold text-zinc-950 focus:outline-none focus:ring-1 focus:ring-[#16A34A]"
                />
              </div>
              <div>
                <label className="text-[10px] font-extrabold text-zinc-500 uppercase block mb-1">
                  Colour Hex
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={shiftColor}
                    onChange={(e) => setShiftColor(e.target.value)}
                    className="h-10 w-12 rounded-xl border border-zinc-350 cursor-pointer overflow-hidden bg-transparent p-0"
                  />
                  <input
                    type="text"
                    value={shiftColor}
                    onChange={(e) => setShiftColor(e.target.value)}
                    placeholder="#FFB020"
                    className="flex-1 bg-white border border-zinc-300 focus:border-[#16A34A] rounded-xl py-3 px-4 text-xs font-mono font-semibold text-zinc-950 focus:outline-none focus:ring-1 focus:ring-[#16A34A]"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setIsShiftModalOpen(false)}
                className="flex-1 bg-white hover:bg-zinc-50 border border-zinc-200 text-zinc-700 rounded-xl py-3 text-xs font-bold uppercase tracking-wider transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveShift}
                className="flex-1 bg-[#16A34A] hover:bg-[#15803D] text-white rounded-xl py-3 text-xs font-bold uppercase tracking-wider transition cursor-pointer"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {isRoleModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-zinc-200 rounded-3xl p-6 w-full max-w-lg shadow-2xl relative">
            <h3 className="text-lg font-extrabold text-[#0F172A] mb-4">
              {editingRoleIndex === null
                ? "Add Role Requirement"
                : "Edit Role Requirement"}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-extrabold text-zinc-500 uppercase block mb-1">
                  Shift Type
                </label>
                <select
                  value={reqShiftType}
                  onChange={(e) => setReqShiftType(e.target.value)}
                  disabled={editingRoleIndex !== null}
                  className="w-full bg-white border border-zinc-300 focus:border-[#16A34A] rounded-xl py-3 px-4 text-xs font-bold text-zinc-950 focus:outline-none focus:ring-1 focus:ring-[#16A34A] cursor-pointer"
                >
                  {shiftTypes.map((s) => (
                    <option key={s.name} value={s.name}>
                      {s.name}
                    </option>
                  ))}
                  {shiftTypes.length === 0 && (
                    <option value="">No shifts configured first</option>
                  )}
                </select>
              </div>

              <div className="border border-zinc-200 rounded-2xl p-4 space-y-3 bg-zinc-50/20">
                <span className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-wide block">
                  Add Minimum Role Requirement
                </span>
                <div className="flex gap-2">
                  <select
                    value={selectedAddRole}
                    onChange={(e) => setSelectedAddRole(e.target.value)}
                    className="flex-1 bg-white border border-zinc-300 focus:border-[#16A34A] rounded-xl py-2 px-3 text-xs font-bold text-zinc-950 focus:outline-none focus:ring-1"
                  >
                    <option value="">-- Choose Position --</option>
                    {positions.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="1"
                    value={selectedAddCount}
                    onChange={(e) =>
                      setSelectedAddCount(
                        Math.max(1, Number(e.target.value) || 1),
                      )
                    }
                    className="w-20 bg-white border border-zinc-300 focus:border-[#16A34A] rounded-xl py-2 px-3 text-xs font-semibold text-zinc-950 focus:outline-none focus:ring-1 text-center"
                  />
                  <button
                    type="button"
                    onClick={handleAddRoleToList}
                    className="bg-[#0F4C3A] hover:bg-[#0A3327] text-white rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-wider flex items-center justify-center cursor-pointer"
                  >
                    Add
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5 mt-2">
                  {reqRolesList.map((r, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 text-[11px] font-bold text-zinc-700 bg-white border border-zinc-200 rounded-lg px-2.5 py-1"
                    >
                      {r.role} ({r.min_count})
                      <button
                        type="button"
                        onClick={() => handleRemoveRoleFromList(r.role)}
                        className="text-zinc-400 hover:text-red-500 cursor-pointer"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                  {reqRolesList.length === 0 && (
                    <span className="text-zinc-450 italic text-[11px]">
                      No roles added to this shift's requirement.
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setIsRoleModalOpen(false)}
                className="flex-1 bg-white hover:bg-zinc-50 border border-zinc-200 text-zinc-700 rounded-xl py-3 text-xs font-bold uppercase tracking-wider transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveRoleRequirement}
                className="flex-1 bg-[#16A34A] hover:bg-[#15803D] text-white rounded-xl py-3 text-xs font-bold uppercase tracking-wider transition cursor-pointer"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
