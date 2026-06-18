"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/providers/auth-provider";
import { useBusinessStore } from "@/stores/business-store";
import { useLocationStore } from "@/stores/location-store";
import { getUserBusinesses } from "@/lib/repositories/business.repository";
import {
  getUserAssignments,
  updateUserAssignment,
  deleteUserAssignment,
  getRolesPermissions,
} from "@/lib/repositories/user.repository";
import {
  Search,
  ChevronDown,
  X,
  Loader2,
  Trash2,
  Edit2,
  ChevronLeft,
  ChevronRight,
  Users as UsersIcon,
  Check,
  Download,
  Filter,
  Activity,
  Shield,
  MapPin,
  Building2,
} from "lucide-react";
import { toast } from "sonner";
import AlertDialog from "@/components/ui/alert-dialog";
import { Business } from "@/types/business";

interface UserAssignmentOut {
  id: string;
  user_id: string;
  user_email: string;
  user_name?: string;
  business_id: string;
  location_id?: string;
  location_name?: string;
  role: string;
  permissions: string[];
  is_active: boolean;
  created_at: string;
}

const AVAILABLE_PERMISSIONS = [
  { value: "business.read", label: "View Business" },
  { value: "locations.read", label: "View Locations" },
  { value: "locations.write", label: "Manage Locations" },
  { value: "stock_items.read", label: "View Stock Items" },
  { value: "stock_items.write", label: "Manage Stock Items" },
  { value: "stock_counts.read", label: "View Stock Counts" },
  { value: "stock_counts.write", label: "Manage Stock Counts" },
  { value: "recipes.read", label: "View Recipes" },
  { value: "recipes.write", label: "Manage Recipes" },
  { value: "consumption.read", label: "View Recipe Consumption" },
  { value: "consumption.write", label: "Manage Recipe Consumption" },
  { value: "purchase_orders.read", label: "View Purchase Orders" },
  { value: "purchase_orders.write", label: "Manage Purchase Orders" },
  { value: "deliveries.read", label: "View Deliveries" },
  { value: "deliveries.write", label: "Manage Deliveries" },
  { value: "sales.read", label: "View Sales" },
  { value: "sales.write", label: "Manage Sales" },
  { value: "reconciliation.read", label: "View Reconciliation" },
  { value: "reconciliation.write", label: "Manage Reconciliation" },
  { value: "attendance.read", label: "View Attendance" },
  { value: "attendance.read_own", label: "View Own Attendance" },
  { value: "attendance.write", label: "Manage Attendance" },
  { value: "rosters.read", label: "View Rosters" },
  { value: "rosters.read_own", label: "View Own Roster" },
  { value: "rosters.write", label: "Manage Rosters" },
  { value: "dashboard.read", label: "View Dashboard" },
  { value: "data.export", label: "Export Data" },
  { value: "reports.read", label: "View Reports" },
  { value: "audit_logs.read", label: "View Audit Logs" },
  { value: "settings.write", label: "Manage Settings" },
  { value: "support.write", label: "Manage Support" },
];

export default function UsersPage() {
  const { activeBusinessId } = useBusinessStore();
  const { locations } = useLocationStore();
  const { profile } = useAuth();

  const [assignments, setAssignments] = useState<UserAssignmentOut[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [activeBusiness, setActiveBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [sidebarRoleFilter, setSidebarRoleFilter] = useState("all");
  const [sidebarStatusFilter, setSidebarStatusFilter] = useState("all");

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [showDrawer, setShowDrawer] = useState(false);
  const [editAssignment, setEditAssignment] =
    useState<UserAssignmentOut | null>(null);
  const [formRole, setFormRole] = useState("staff");
  const [formLocationId, setFormLocationId] = useState("");
  const [formPermissions, setFormPermissions] = useState<string[]>([]);
  const [formActive, setFormActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [rolesPermissions, setRolesPermissions] = useState<
    Record<string, string[]>
  >({});

  const loadData = async () => {
    if (!activeBusinessId) return;
    try {
      setLoading(true);
      const list = await getUserAssignments(activeBusinessId);
      setAssignments(list);

      const bizList = await getUserBusinesses();
      setBusinesses(bizList);
      const currentBiz = bizList.find((b) => b.id === activeBusinessId) || null;
      setActiveBusiness(currentBiz);

      try {
        const permsMap = await getRolesPermissions();
        setRolesPermissions(permsMap);
      } catch (err) {
        console.error("Failed to load roles-permissions defaults", err);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to load users list.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeBusinessId]);

  const handleApplyFilters = () => {
    setRoleFilter(sidebarRoleFilter);
    setStatusFilter(sidebarStatusFilter);
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setSidebarRoleFilter("all");
    setSidebarStatusFilter("all");
    setRoleFilter("all");
    setStatusFilter("all");
    setSearchQuery("");
    setCurrentPage(1);
  };

  const handleExport = () => {
    const headers = [
      "User",
      "Email",
      "Role",
      "Location Access",
      "Status",
      "Joined",
    ];
    const rows = filteredAssignments.map((ass) => [
      ass.user_name || "N/A",
      ass.user_email,
      ass.role,
      ass.location_name || "All Locations",
      ass.is_active ? "Active" : "Inactive",
      new Date(ass.created_at).toLocaleDateString(),
    ]);
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [
        headers.join(","),
        ...rows.map((e) => e.map((val) => `"${val}"`).join(",")),
      ].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "users_list.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredAssignments = assignments.filter((ass) => {
    const nameMatch = (ass.user_name || "")
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const emailMatch = ass.user_email
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesSearch = nameMatch || emailMatch;

    const matchesRole =
      roleFilter === "all" ||
      ass.role.toLowerCase() === roleFilter.toLowerCase();
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" ? ass.is_active : !ass.is_active);

    return matchesSearch && matchesRole && matchesStatus;
  });

  const paginatedAssignments = (() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredAssignments.slice(start, start + itemsPerPage);
  })();

  const totalPages = Math.ceil(filteredAssignments.length / itemsPerPage) || 1;

  const metrics = (() => {
    const total = assignments.length;
    const active = assignments.filter((a) => a.is_active).length;
    const inactive = total - active;
    const admins = assignments.filter(
      (a) => a.role === "admin" || a.role === "super_admin",
    ).length;

    const activePct = total > 0 ? ((active / total) * 100).toFixed(1) : "0.0";
    const inactivePct =
      total > 0 ? ((inactive / total) * 100).toFixed(1) : "0.0";
    const adminsPct = total > 0 ? ((admins / total) * 100).toFixed(1) : "0.0";

    return {
      total,
      active,
      inactive,
      admins,
      activePct,
      inactivePct,
      adminsPct,
    };
  })();

  const rolesBreakdown = (() => {
    const counts: Record<string, number> = {
      admin: 0,
      manager: 0,
      staff: 0,
    };

    assignments.forEach((a) => {
      const r = a.role.toLowerCase();
      if (r === "admin" || r === "super_admin") {
        counts.admin += 1;
      } else if (r === "manager") {
        counts.manager += 1;
      } else {
        counts.staff += 1;
      }
    });

    const total = assignments.length || 1;
    return {
      admin: {
        count: counts.admin,
        pct: ((counts.admin / total) * 100).toFixed(1),
      },
      manager: {
        count: counts.manager,
        pct: ((counts.manager / total) * 100).toFixed(1),
      },
      staff: {
        count: counts.staff,
        pct: ((counts.staff / total) * 100).toFixed(1),
      },
    };
  })();

  const recentActivities = (() => {
    const sorted = [...assignments].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
    return sorted.slice(0, 3).map((ass) => {
      const timeStr = new Date(ass.created_at).toLocaleDateString("en-US", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
      return {
        id: ass.id,
        user: ass.user_name || ass.user_email,
        text: `Assigned as ${ass.role} to ${ass.location_name || "All Locations"}`,
        time: timeStr,
      };
    });
  })();

  const handleOpenEdit = (ass: UserAssignmentOut) => {
    setEditAssignment(ass);
    setFormRole(ass.role);
    setFormLocationId(ass.location_id || "");
    setFormPermissions(ass.permissions);
    setFormActive(ass.is_active);
    setShowDrawer(true);
    setActiveMenuId(null);
  };

  const handleSaveAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBusinessId || !editAssignment) return;

    try {
      setSaving(true);
      const payload = {
        role: formRole,
        location_id: formLocationId || null,
        permissions: formPermissions,
        is_active: formActive,
      };

      await updateUserAssignment(activeBusinessId, editAssignment.id, payload);
      toast.success("User assignment updated successfully!");
      setShowDrawer(false);
      loadData();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to update assignment.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = (id: string) => {
    setDeleteTargetId(id);
    setActiveMenuId(null);
  };

  const handleConfirmDelete = async () => {
    if (!activeBusinessId || !deleteTargetId) return;
    try {
      await deleteUserAssignment(activeBusinessId, deleteTargetId);
      toast.success("User assignment deleted successfully!");
      loadData();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to delete user assignment.");
    } finally {
      setDeleteTargetId(null);
    }
  };

  const handleTogglePermission = (permValue: string) => {
    setFormPermissions((prev) =>
      prev.includes(permValue)
        ? prev.filter((p) => p !== permValue)
        : [...prev, permValue],
    );
  };

  const getRoleBadgeClass = (role: string) => {
    const r = role.toLowerCase();
    if (r === "admin" || r === "super_admin") {
      return "bg-purple-50 text-purple-600 border-purple-100";
    }
    if (r === "manager") {
      return "bg-blue-50 text-blue-600 border-blue-100";
    }
    return "bg-zinc-50 text-zinc-600 border-zinc-100";
  };

  const getInitials = (name?: string, email?: string) => {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .substring(0, 2);
    }
    if (email) {
      return email.substring(0, 2).toUpperCase();
    }
    return "US";
  };

  if (loading && assignments.length === 0) {
    return (
      <div className="h-[75vh] flex flex-col items-center justify-center bg-white text-[#0F172A]">
        <Loader2 className="h-7 w-7 text-[#16A34A] animate-spin mb-3" />
        <span className="text-[#64748B] text-xs font-bold uppercase tracking-wider">
          Syncing users workspace...
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 bg-white min-h-[80vh] relative select-none">
      <div className="flex-1 min-w-0 space-y-6 pr-0 lg:pr-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-zinc-200 pb-5">
          <div>
            <h1 className="text-3xl font-extrabold text-[#0F172A] tracking-tight">
              Users
            </h1>
            <p className="text-[#64748B] text-xs font-bold mt-1.5">
              Manage system users, roles and permissions.
            </p>
          </div>

          <button
            onClick={handleExport}
            className="bg-white hover:bg-zinc-50 border border-zinc-200 text-zinc-700 rounded-xl px-4 py-2.5 text-xs font-bold uppercase tracking-wider shadow-2xs flex items-center gap-2 cursor-pointer transition-all duration-200"
          >
            <Download className="h-4 w-4" />
            Export
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#F8FAFC] border border-zinc-100 rounded-2xl p-5 shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-50 text-[#16A34A] flex items-center justify-center border border-emerald-100">
                <UsersIcon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-[#64748B] tracking-wider">
                  Total Users
                </p>
                <p className="text-2xl font-extrabold text-[#0F172A] mt-0.5">
                  {metrics.total}
                </p>
              </div>
            </div>
            <p className="text-[10px] text-[#64748B] font-bold mt-3">
              All registered users
            </p>
          </div>

          <div className="bg-[#F8FAFC] border border-zinc-100 rounded-2xl p-5 shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center border border-blue-100">
                <Check className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-[#64748B] tracking-wider">
                  Active Users
                </p>
                <p className="text-2xl font-extrabold text-[#0F172A] mt-0.5">
                  {metrics.active}
                </p>
              </div>
            </div>
            <p className="text-[10px] text-[#16A34A] font-extrabold mt-3">
              {metrics.activePct}% of total
            </p>
          </div>

          <div className="bg-[#F8FAFC] border border-zinc-100 rounded-2xl p-5 shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center border border-amber-100">
                <X className="h-4.5 w-4.5" />
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-[#64748B] tracking-wider">
                  Inactive Users
                </p>
                <p className="text-2xl font-extrabold text-[#0F172A] mt-0.5">
                  {metrics.inactive}
                </p>
              </div>
            </div>
            <p className="text-[10px] text-amber-600 font-extrabold mt-3">
              {metrics.inactivePct}% of total
            </p>
          </div>

          <div className="bg-[#F8FAFC] border border-zinc-100 rounded-2xl p-5 shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-purple-50 text-purple-500 flex items-center justify-center border border-purple-100">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-[#64748B] tracking-wider">
                  Admins
                </p>
                <p className="text-2xl font-extrabold text-[#0F172A] mt-0.5">
                  {metrics.admins}
                </p>
              </div>
            </div>
            <p className="text-[10px] text-purple-600 font-extrabold mt-3">
              {metrics.adminsPct}% of total
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white">
          <div className="relative w-full sm:max-w-md">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
              <Search className="h-4 w-4" />
            </span>
            <input
              type="text"
              placeholder="Search users..."
              className="w-full bg-white border border-zinc-200 focus:border-[#16A34A] rounded-xl py-2.5 pl-10 pr-4 text-xs text-zinc-950 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-[#16A34A] transition-all shadow-xs"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0 bg-white border border-zinc-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-zinc-700 shadow-xs">
            <Building2 className="h-4 w-4 text-zinc-400" />
            <span>{activeBusiness?.name || "Active Venue"}</span>
          </div>
        </div>

        {filteredAssignments.length === 0 ? (
          <div className="bg-white border border-zinc-200 rounded-2xl py-20 px-6 text-center flex flex-col items-center justify-center shadow-sm">
            <UsersIcon className="h-10 w-10 text-zinc-300 mb-3" />
            <h3 className="text-base font-bold text-[#0F172A]">
              No users found
            </h3>
            <p className="text-[#64748B] text-xs mt-1 font-semibold max-w-xs leading-relaxed">
              No registered user profiles match your active filters or search
              terms.
            </p>
          </div>
        ) : (
          <div className="bg-white border border-zinc-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-200 text-[10px] uppercase font-extrabold tracking-wider text-[#64748B] bg-zinc-50/50">
                    <th className="py-4 px-6 font-extrabold">User</th>
                    <th className="py-4 px-6 font-extrabold">Role</th>
                    <th className="py-4 px-6 font-extrabold">Business</th>
                    <th className="py-4 px-6 font-extrabold">
                      Location Access
                    </th>
                    <th className="py-4 px-6 font-extrabold">Status</th>
                    <th className="py-4 px-6 font-extrabold">Joined</th>
                    <th className="py-4 px-6 font-extrabold text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 text-xs text-[#0F172A]">
                  {paginatedAssignments.map((ass) => (
                    <tr
                      key={ass.id}
                      className="hover:bg-zinc-50/40 transition-colors"
                    >
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-emerald-50 text-[#16A34A] flex items-center justify-center font-extrabold text-xs border border-emerald-100 shadow-3xs">
                            {getInitials(ass.user_name, ass.user_email)}
                          </div>
                          <div>
                            <p className="font-extrabold text-[#0F172A]">
                              {ass.user_name || "N/A"}
                            </p>
                            <p className="text-[10px] text-[#64748B] font-bold mt-0.5">
                              {ass.user_email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span
                          className={`px-2.5 py-1 rounded-md font-bold text-[10px] uppercase tracking-wider border ${getRoleBadgeClass(ass.role)}`}
                        >
                          {ass.role}
                        </span>
                      </td>
                      <td className="py-4 px-6 font-bold text-[#64748B]">
                        {activeBusiness?.name || "McDonalds"}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-1.5 font-bold text-zinc-700">
                          <MapPin className="h-3.5 w-3.5 text-zinc-400" />
                          <span>{ass.location_name || "All Locations"}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span
                          className={`text-[10px] uppercase font-extrabold px-3 py-1 rounded-full flex items-center gap-1.5 border shadow-3xs leading-none w-fit ${
                            ass.is_active
                              ? "bg-[#DCFCE7] text-[#16A34A] border-[#16A34A]/10"
                              : "bg-zinc-100 text-[#64748B] border-zinc-200"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full shrink-0 ${ass.is_active ? "bg-[#16A34A]" : "bg-[#64748B]"}`}
                          />
                          {ass.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-[#64748B] font-bold">
                        {new Date(ass.created_at).toLocaleDateString("en-US", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="py-4 px-6 text-right relative">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenEdit(ass)}
                            className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-500 hover:text-[#16A34A] transition-colors cursor-pointer inline-flex items-center justify-center"
                            title="Edit Permissions"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(ass.id)}
                            className="p-1.5 rounded-lg hover:bg-rose-50 text-zinc-500 hover:text-[#EF4444] transition-colors cursor-pointer inline-flex items-center justify-center"
                            title="Remove User"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="bg-zinc-50/50 border-t border-zinc-200 py-4 px-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-[#64748B] font-semibold">
              <span>
                Showing{" "}
                {filteredAssignments.length > 0
                  ? (currentPage - 1) * itemsPerPage + 1
                  : 0}{" "}
                to{" "}
                {Math.min(
                  currentPage * itemsPerPage,
                  filteredAssignments.length,
                )}{" "}
                of {filteredAssignments.length} users
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="p-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-400 disabled:opacity-40 transition-colors"
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="h-8 w-8 bg-[#16A34A] text-white flex items-center justify-center rounded-lg font-bold">
                  {currentPage}
                </span>
                <button
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  className="p-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-400 disabled:opacity-40 transition-colors"
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <aside className="w-full lg:w-80 shrink-0 space-y-6">
        <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-2xs space-y-5">
          <div className="flex justify-between items-center pb-2 border-b border-zinc-100">
            <div className="flex items-center gap-2 text-sm font-extrabold text-[#0F172A]">
              <Filter className="h-4.5 w-4.5 text-zinc-400" />
              <span>Filters</span>
            </div>
            <button
              onClick={handleClearFilters}
              className="text-[10px] uppercase font-bold tracking-wider text-[#16A34A] hover:text-[#15803D]"
            >
              Clear All
            </button>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-extrabold tracking-wider text-[#64748B] block">
                Role
              </label>
              <div className="relative">
                <select
                  value={sidebarRoleFilter}
                  onChange={(e) => setSidebarRoleFilter(e.target.value)}
                  className="w-full bg-white border border-zinc-200 focus:border-[#16A34A] rounded-xl py-2 px-3 text-xs text-zinc-950 focus:outline-none focus:ring-1 focus:ring-[#16A34A] appearance-none cursor-pointer font-bold"
                >
                  <option value="all">All Roles</option>
                  <option value="super_admin">Super Admin</option>
                  <option value="admin">Admin</option>
                  <option value="manager">Manager</option>
                  <option value="staff">Staff</option>
                </select>
                <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-extrabold tracking-wider text-[#64748B] block">
                Status
              </label>
              <div className="relative">
                <select
                  value={sidebarStatusFilter}
                  onChange={(e) => setSidebarStatusFilter(e.target.value)}
                  className="w-full bg-white border border-zinc-200 focus:border-[#16A34A] rounded-xl py-2 px-3 text-xs text-zinc-950 focus:outline-none focus:ring-1 focus:ring-[#16A34A] appearance-none cursor-pointer font-bold"
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active Only</option>
                  <option value="inactive">Inactive Only</option>
                </select>
                <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
              </div>
            </div>

            <button
              onClick={handleApplyFilters}
              className="w-full bg-[#16A34A] hover:bg-[#15803D] text-white py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer text-center block"
            >
              Apply Filters
            </button>
          </div>
        </div>

        <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-2xs space-y-5">
          <h3 className="text-sm font-extrabold text-[#0F172A] pb-2 border-b border-zinc-100">
            Roles Summary
          </h3>
          <div className="flex flex-col items-center gap-6 py-2">
            <div className="relative h-28 w-28 flex items-center justify-center">
              <svg
                className="h-full w-full transform -rotate-90"
                viewBox="0 0 36 36"
              >
                <circle
                  cx="18"
                  cy="18"
                  r="15.915"
                  fill="none"
                  stroke="#F1F5F9"
                  strokeWidth="3.2"
                />
                <circle
                  cx="18"
                  cy="18"
                  r="15.915"
                  fill="none"
                  stroke="#8B5CF6"
                  strokeWidth="3.2"
                  strokeDasharray={`${rolesBreakdown.admin.pct} ${100 - parseFloat(rolesBreakdown.admin.pct)}`}
                  strokeDashoffset="0"
                />
                <circle
                  cx="18"
                  cy="18"
                  r="15.915"
                  fill="none"
                  stroke="#3B82F6"
                  strokeWidth="3.2"
                  strokeDasharray={`${rolesBreakdown.manager.pct} ${100 - parseFloat(rolesBreakdown.manager.pct)}`}
                  strokeDashoffset={`-${rolesBreakdown.admin.pct}`}
                />
                <circle
                  cx="18"
                  cy="18"
                  r="15.915"
                  fill="none"
                  stroke="#64748B"
                  strokeWidth="3.2"
                  strokeDasharray={`${rolesBreakdown.staff.pct} ${100 - parseFloat(rolesBreakdown.staff.pct)}`}
                  strokeDashoffset={`-${parseFloat(rolesBreakdown.admin.pct) + parseFloat(rolesBreakdown.manager.pct)}`}
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-xs font-bold text-[#64748B] uppercase">
                  Roles
                </span>
                <span className="text-base font-black text-[#0F172A]">
                  {assignments.length}
                </span>
              </div>
            </div>

            <div className="w-full space-y-3">
              <div className="flex items-center justify-between text-xs font-bold">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-purple-500" />
                  <span className="text-zinc-600">Admins</span>
                </div>
                <span className="text-[#0F172A]">
                  {rolesBreakdown.admin.count} ({rolesBreakdown.admin.pct}%)
                </span>
              </div>

              <div className="flex items-center justify-between text-xs font-bold">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                  <span className="text-zinc-600">Managers</span>
                </div>
                <span className="text-[#0F172A]">
                  {rolesBreakdown.manager.count} ({rolesBreakdown.manager.pct}%)
                </span>
              </div>

              <div className="flex items-center justify-between text-xs font-bold">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-zinc-500" />
                  <span className="text-zinc-600">Staff</span>
                </div>
                <span className="text-[#0F172A]">
                  {rolesBreakdown.staff.count} ({rolesBreakdown.staff.pct}%)
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-2xs space-y-5">
          <div className="flex items-center gap-2 pb-2 border-b border-zinc-100">
            <Activity className="h-4.5 w-4.5 text-zinc-400" />
            <h3 className="text-sm font-extrabold text-[#0F172A]">
              Recent Activity
            </h3>
          </div>
          <div className="space-y-4">
            {recentActivities.length === 0 ? (
              <p className="text-xs text-[#64748B] font-bold text-center py-2">
                No recent setup activity.
              </p>
            ) : (
              recentActivities.map((act) => (
                <div key={act.id} className="space-y-1">
                  <p className="text-xs font-extrabold text-[#0F172A] truncate">
                    {act.user}
                  </p>
                  <p className="text-[10px] text-zinc-500 font-bold leading-relaxed">
                    {act.text}
                  </p>
                  <p className="text-[9px] text-[#64748B] font-extrabold mt-0.5">
                    {act.time}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </aside>

      {showDrawer && editAssignment && (
        <>
          <div
            className="fixed inset-0 bg-black/20 z-90"
            onClick={() => setShowDrawer(false)}
          />
          <div className="fixed top-0 right-0 h-full w-96 bg-white border-l border-zinc-200 shadow-2xl flex flex-col justify-between z-100 animate-slide-in">
            <div className="p-6 overflow-y-auto space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-extrabold text-[#0F172A]">
                    Edit User Permissions
                  </h3>
                  <p className="text-[#64748B] text-xs font-semibold mt-1">
                    Configure role, locations and permissions
                  </p>
                </div>
                <button
                  onClick={() => setShowDrawer(false)}
                  className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSaveAssignment} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#0F172A] uppercase tracking-wider block">
                    User Email
                  </label>
                  <input
                    type="text"
                    disabled
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-2.5 px-3.5 text-xs text-zinc-400 font-bold cursor-not-allowed"
                    value={editAssignment.user_email}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#0F172A] uppercase tracking-wider block">
                    Role *
                  </label>
                  <div className="relative">
                    <select
                      value={formRole}
                      onChange={(e) => setFormRole(e.target.value)}
                      className="w-full bg-white border border-zinc-300 focus:border-[#16A34A] rounded-xl py-2.5 px-3.5 text-xs text-zinc-950 focus:outline-none focus:ring-1 focus:ring-[#16A34A] appearance-none cursor-pointer font-bold"
                    >
                      <option value="super_admin">
                        Super Admin (Full Access)
                      </option>
                      <option value="admin">Admin (Full Access)</option>
                      <option value="manager">Manager</option>
                      <option value="staff">Staff</option>
                    </select>
                    <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#0F172A] uppercase tracking-wider block">
                    Location Access *
                  </label>
                  <div className="relative">
                    <select
                      value={formLocationId}
                      onChange={(e) => setFormLocationId(e.target.value)}
                      className="w-full bg-white border border-zinc-300 focus:border-[#16A34A] rounded-xl py-2.5 px-3.5 text-xs text-zinc-950 focus:outline-none focus:ring-1 focus:ring-[#16A34A] appearance-none cursor-pointer font-bold"
                    >
                      <option value="">All Locations (Business-wide)</option>
                      {locations.map((loc) => (
                        <option key={loc.id} value={loc.id}>
                          {loc.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="formActive"
                    className="h-4 w-4 text-[#16A34A] focus:ring-[#16A34A] border-zinc-300 rounded cursor-pointer"
                    checked={formActive}
                    onChange={(e) => setFormActive(e.target.checked)}
                  />
                  <label
                    htmlFor="formActive"
                    className="text-xs font-bold text-[#0F172A] cursor-pointer"
                  >
                    User is active
                  </label>
                </div>

                <div className="space-y-3 pt-3 border-t border-zinc-200">
                  <label className="text-xs font-bold text-[#0F172A] uppercase tracking-wider block">
                    Permissions Scope
                  </label>
                  <div className="max-h-60 overflow-y-auto space-y-2.5 pr-2">
                    {AVAILABLE_PERMISSIONS.map((perm) => {
                      const defaultPerms = rolesPermissions[formRole] || [];
                      const isDefaultGranted =
                        defaultPerms.includes("*") ||
                        defaultPerms.includes(perm.value);
                      const isChecked =
                        isDefaultGranted ||
                        formPermissions.includes(perm.value);
                      return (
                        <div
                          key={perm.value}
                          className="flex items-start gap-2.5"
                        >
                          <input
                            type="checkbox"
                            id={`perm-${perm.value}`}
                            className="h-4 w-4 mt-0.5 text-[#16A34A] focus:ring-[#16A34A] border-zinc-300 rounded cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                            checked={isChecked}
                            disabled={isDefaultGranted}
                            onChange={() => handleTogglePermission(perm.value)}
                          />
                          <label
                            htmlFor={`perm-${perm.value}`}
                            className={`text-xs font-semibold cursor-pointer select-none ${
                              isDefaultGranted
                                ? "text-zinc-400 font-medium"
                                : "text-zinc-700"
                            }`}
                          >
                            {perm.label}
                            {isDefaultGranted && (
                              <span className="text-[10px] text-[#16A34A] font-bold ml-1.5 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-100/60 inline-flex items-center">
                                (Role Default)
                              </span>
                            )}
                          </label>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </form>
            </div>

            <div className="p-6 border-t border-zinc-200 bg-zinc-50 flex justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setShowDrawer(false)}
                className="bg-white hover:bg-zinc-100 border border-zinc-200 text-zinc-700 rounded-xl px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="submit"
                onClick={handleSaveAssignment}
                disabled={saving}
                className="bg-[#16A34A] hover:bg-[#15803D] text-white rounded-xl px-4 py-2.5 text-xs font-bold uppercase tracking-wider shadow-sm flex items-center gap-2 cursor-pointer transition-colors disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </button>
            </div>
          </div>
        </>
      )}

      <AlertDialog
        open={deleteTargetId !== null}
        variant="danger"
        title="Remove User Assignment"
        description="Are you sure you want to remove this user assignment? They will lose access immediately."
        confirmLabel="Remove"
        cancelLabel="Cancel"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTargetId(null)}
      />
    </div>
  );
}
