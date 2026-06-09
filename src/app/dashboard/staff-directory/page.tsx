/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { toast } from "sonner";
import { useEffect, useState, useCallback } from "react";

import { useStaffStore } from "@/store/staff-store";
import { useBusinessStore } from "@/store/business-store";
import { useLocationStore } from "@/store/location-store";
import { getUserBusinesses } from "@/lib/repositories/business.repository";
import { getLocations } from "@/lib/repositories/location.repository";
import {
  createStaffInvitation,
  getPendingStaff,
  approvePendingStaff,
  rejectPendingStaff,
} from "@/lib/repositories/staff.repository";
import { Business } from "@/types/business";
import { Location } from "@/types/inventory";
import { Staff, PendingStaffAssignment } from "@/types/staff";
import {
  Search,
  ChevronDown,
  Loader2,
  Download,
  Filter,
  ChevronLeft,
  ChevronRight,
  Building2,
  MapPin,
  Plus,
  Copy,
  Check,
  Send,
  Mail,
  X,
  ShieldCheck,
  ShieldX,
  UserCheck,
} from "lucide-react";

export default function StaffDirectoryPage() {
  const { activeBusinessId } = useBusinessStore();
  const { locations } = useLocationStore();
  const {
    staffMembers,
    loading: staffLoading,
    fetchStaffMembers,
  } = useStaffStore();

  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [activeBusiness, setActiveBusiness] = useState<Business | null>(null);
  const [loadingContext, setLoadingContext] = useState(true);

  const [activeTab, setActiveTab] = useState<"directory" | "pending">("directory");

  const [searchQuery, setSearchQuery] = useState("");
  const [businessFilter, setBusinessFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [sortField, setSortField] = useState<
    keyof Staff | "assigned_business" | "assigned_locations" | null
  >(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [pendingStaff, setPendingStaff] = useState<PendingStaffAssignment[]>([]);
  const [loadingPending, setLoadingPending] = useState(false);

  const [isAddStaffOpen, setIsAddStaffOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState("staff");
  const [selectedBusinesses, setSelectedBusinesses] = useState<string[]>([]);
  const [selectedLocations, setSelectedLocations] = useState<Record<string, string[]>>({});
  const [businessLocations, setBusinessLocations] = useState<Record<string, Location[]>>({});
  const [expiresInHours, setExpiresInHours] = useState(48);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const loadData = useCallback(async () => {
    if (!activeBusinessId) return;
    try {
      setLoadingContext(true);
      await fetchStaffMembers(activeBusinessId);
      const bizList = await getUserBusinesses([]);
      setBusinesses(bizList);
      const currentBiz = bizList.find((b) => b.id === activeBusinessId) || null;
      setActiveBusiness(currentBiz);
    } catch (err: any) {
      toast.error(err.message || "Failed to load directory context.");
    } finally {
      setLoadingContext(false);
    }
  }, [activeBusinessId, fetchStaffMembers]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const loadPending = useCallback(async () => {
    if (!activeBusinessId) return;
    try {
      setLoadingPending(true);
      const data = await getPendingStaff(activeBusinessId);
      setPendingStaff(data);
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to load pending staff registrations.");
    } finally {
      setLoadingPending(false);
    }
  }, [activeBusinessId]);

  useEffect(() => {
    if (activeTab === "pending") {
      loadPending();
    }
  }, [activeTab, loadPending]);

  const handleClearFilters = () => {
    setSearchQuery("");
    setBusinessFilter("all");
    setLocationFilter("all");
    setRoleFilter("all");
    setStatusFilter("all");
    setCurrentPage(1);
  };

  const handleExport = () => {
    const headers = [
      "Staff Name",
      "Phone",
      "Email",
      "Role",
      "Assigned Business",
      "Assigned Locations",
      "Status",
    ];
    const rows = filteredStaff.map((s) => [
      s.name,
      s.phone,
      s.email,
      s.role,
      activeBusiness?.name || "",
      s.locations?.map((l) => l.name).join("; ") || "",
      s.status,
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
    link.setAttribute("download", "staff_directory.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSort = (
    field: keyof Staff | "assigned_business" | "assigned_locations",
  ) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const filteredStaff = staffMembers
    .filter((s) => {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        s.name.toLowerCase().includes(query) ||
        s.phone.toLowerCase().includes(query) ||
        s.email.toLowerCase().includes(query) ||
        s.role.toLowerCase().includes(query);

      const matchesBusiness =
        businessFilter === "all" || s.businessId === businessFilter;

      const matchesLocation =
        locationFilter === "all" ||
        (s.locations && s.locations.some((l) => l.id === locationFilter));

      const matchesRole =
        roleFilter === "all" ||
        s.role.toLowerCase() === roleFilter.toLowerCase();

      const matchesStatus =
        statusFilter === "all" ||
        s.status.toLowerCase() === statusFilter.toLowerCase();

      return (
        matchesSearch &&
        matchesBusiness &&
        matchesLocation &&
        matchesRole &&
        matchesStatus
      );
    })
    .sort((a, b) => {
      if (!sortField) return 0;

      let valA: any = "";
      let valB: any = "";

      if (sortField === "assigned_business") {
        valA = activeBusiness?.name || "";
        valB = activeBusiness?.name || "";
      } else if (sortField === "assigned_locations") {
        valA = a.locations?.map((l) => l.name).join(", ") || "";
        valB = b.locations?.map((l) => l.name).join(", ") || "";
      } else {
        valA = a[sortField as keyof Staff] || "";
        valB = b[sortField as keyof Staff] || "";
      }

      if (typeof valA === "string") {
        return sortDirection === "asc"
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      } else {
        return sortDirection === "asc"
          ? valA > valB
            ? 1
            : -1
          : valB > valA
            ? 1
            : -1;
      }
    });

  const paginatedStaff = (() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredStaff.slice(start, start + itemsPerPage);
  })();

  const totalPages = Math.ceil(filteredStaff.length / itemsPerPage) || 1;

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  const getAvatarBg = (name: string) => {
    const charCode = name.charCodeAt(0) || 0;
    const colors = [
      "bg-purple-100 text-purple-700 border-purple-200",
      "bg-amber-100 text-amber-700 border-amber-200",
      "bg-rose-100 text-rose-700 border-rose-200",
      "bg-blue-100 text-blue-700 border-blue-200",
      "bg-emerald-100 text-emerald-700 border-emerald-200",
      "bg-indigo-100 text-indigo-700 border-indigo-200",
      "bg-orange-100 text-orange-700 border-orange-200",
    ];
    return colors[charCode % colors.length];
  };

  const getRoleBadgeClass = (role: string) => {
    const r = role.toLowerCase();
    if (r === "manager") {
      return "bg-blue-50 text-blue-600 border-blue-100";
    }
    if (r === "supervisor") {
      return "bg-purple-50 text-purple-600 border-purple-100";
    }
    return "bg-zinc-50 text-zinc-600 border-zinc-100";
  };

  const handleToggleBusiness = async (bizId: string) => {
    if (selectedBusinesses.includes(bizId)) {
      setSelectedBusinesses(selectedBusinesses.filter((id) => id !== bizId));
      setSelectedLocations((prev) => {
        const next = { ...prev };
        delete next[bizId];
        return next;
      });
    } else {
      setSelectedBusinesses([...selectedBusinesses, bizId]);
      if (!businessLocations[bizId]) {
        try {
          const locs = await getLocations(bizId);
          setBusinessLocations((prev) => ({ ...prev, [bizId]: locs }));
        } catch (err) {
          if(err instanceof Error)toast.error(err.message ||"Failed to load locations for this business.");
        }
      }
    }
  };

  const handleToggleLocation = (bizId: string, locId: string) => {
    const currentLocs = selectedLocations[bizId] || [];
    if (currentLocs.includes(locId)) {
      setSelectedLocations((prev) => ({
        ...prev,
        [bizId]: currentLocs.filter((id) => id !== locId),
      }));
    } else {
      setSelectedLocations((prev) => ({
        ...prev,
        [bizId]: [...currentLocs, locId],
      }));
    }
  };

  const handleToggleAllLocations = (bizId: string) => {
    const allLocs = businessLocations[bizId] || [];
    const currentLocs = selectedLocations[bizId] || [];
    
    if (currentLocs.length === allLocs.length) {
   
      setSelectedLocations((prev) => ({
        ...prev,
        [bizId]: [],
      }));
    } else {
      setSelectedLocations((prev) => ({
        ...prev,
        [bizId]: allLocs.map((l) => l.id),
      }));
    }
  };

  const handleGenerateInvitation = async () => {
    if (selectedBusinesses.length === 0) {
      toast.error("Please select at least one business.");
      return;
    }

    try {
      setGeneratingLink(true);
      const assignments = selectedBusinesses.map((bizId) => ({
        business_id: bizId,
        location_ids: selectedLocations[bizId] || [],
      }));

      const invite = await createStaffInvitation({
        role: selectedRole,
        expiresInHours,
        assignments,
      });

      const inviteLink = `${window.location.origin}/invite/${invite.id}`;
      setGeneratedLink(inviteLink);
      toast.success("Invitation link generated!");
    } catch (err: any) {
      toast.error(err.message || "Failed to generate invitation.");
    } finally {
      setGeneratingLink(false);
    }
  };

  const handleCopyLink = () => {
    if (!generatedLink) return;
    navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareWhatsApp = () => {
    if (!generatedLink) return;
    const msg = `Click the link to join our team on StockTrack: ${generatedLink}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const handleShareEmail = () => {
    if (!generatedLink) return;
    const subject = encodeURIComponent("Invitation to join StockTrack staff");
    const body = encodeURIComponent(`Please register via this unique link to set up your staff account: ${generatedLink}`);
    window.open(`mailto:?subject=${subject}&body=${body}`, "_blank");
  };

  const handleApprove = async (assignmentId: string) => {
    if (!activeBusinessId) return;
    try {
      const res = await approvePendingStaff(activeBusinessId, assignmentId);
      toast.success(res.message || "Staff access activated successfully.");
      await loadPending();
      await fetchStaffMembers(activeBusinessId);
    } catch (err: any) {
      toast.error(err.message || "Failed to approve staff.");
    }
  };

  const handleReject = async (assignmentId: string) => {
    if (!activeBusinessId) return;
    try {
      const res = await rejectPendingStaff(activeBusinessId, assignmentId);
      toast.success(res.message || "Staff request rejected.");
      await loadPending();
    } catch (err: any) {
      toast.error(err.message || "Failed to reject staff.");
    }
  };

  const handleResetModal = () => {
    setIsAddStaffOpen(false);
    setGeneratedLink(null);
    setSelectedBusinesses([]);
    setSelectedLocations({});
    setSelectedRole("staff");
    setExpiresInHours(48);
  };

  if (staffLoading || loadingContext) {
    return (
      <div className="h-[75vh] flex flex-col items-center justify-center bg-white text-[#0F172A]">
        <Loader2 className="h-7 w-7 text-[#16A34A] animate-spin mb-3" />
        <span className="text-[#64748B] text-xs font-bold uppercase tracking-wider">
          Syncing staff records...
        </span>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white min-h-[80vh] relative select-none">
      
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-zinc-200 pb-5">
        <div>
          <h1 className="text-3xl font-extrabold text-[#0F172A] tracking-tight">
            Staff Directory
          </h1>
          <p className="text-[#64748B] text-xs font-bold mt-1.5">
            View and manage all staff members, invitations, and access permissions.
          </p>
        </div>

        <div className="flex items-center gap-3 self-end lg:self-auto">
          <button
            onClick={() => setIsAddStaffOpen(true)}
            className="bg-[#16A34A] hover:bg-[#15803D] text-white rounded-xl px-5 py-2.5 text-xs font-bold uppercase tracking-wider shadow-sm flex items-center gap-2 cursor-pointer transition-all duration-200"
          >
            <Plus className="h-4 w-4 stroke-[3px]" />
            Add Staff
          </button>

          {activeTab === "directory" && (
            <>
              <button
                onClick={handleExport}
                className="bg-white hover:bg-zinc-50 border border-zinc-200 text-zinc-700 rounded-xl px-4 py-2.5 text-xs font-bold uppercase tracking-wider shadow-2xs flex items-center gap-2 cursor-pointer transition-all duration-200"
              >
                <Download className="h-4 w-4" />
                Export
                <ChevronDown className="h-3.5 w-3.5 text-zinc-400" />
              </button>

              <button className="bg-white hover:bg-zinc-50 border border-zinc-200 text-zinc-700 rounded-xl px-4 py-2.5 text-xs font-bold uppercase tracking-wider shadow-2xs flex items-center gap-2 cursor-pointer transition-all duration-200">
                <Filter className="h-4 w-4" />
                Filters
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex border-b border-zinc-200 mt-6 mb-4">
        <button
          onClick={() => setActiveTab("directory")}
          className={`pb-3 text-xs font-bold uppercase tracking-wider px-4 border-b-2 cursor-pointer transition-all duration-150 ${
            activeTab === "directory"
              ? "border-[#16A34A] text-[#16A34A]"
              : "border-transparent text-zinc-500 hover:text-zinc-700"
          }`}
        >
          Active Staff
        </button>
        <button
          onClick={() => setActiveTab("pending")}
          className={`pb-3 text-xs font-bold uppercase tracking-wider px-4 border-b-2 cursor-pointer transition-all duration-150 flex items-center gap-1.5 ${
            activeTab === "pending"
              ? "border-[#16A34A] text-[#16A34A]"
              : "border-transparent text-zinc-500 hover:text-zinc-700"
          }`}
        >
          Pending Approvals
          {pendingStaff.length > 0 && (
            <span className="bg-red-500 text-white text-[10px] h-4 w-4 rounded-full flex items-center justify-center font-bold">
              {pendingStaff.length}
            </span>
          )}
        </button>
      </div>

      {activeTab === "directory" ? (
        <>
          <div className="mt-6 flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[280px]">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                <Search className="h-4 w-4" />
              </span>
              <input
                type="text"
                placeholder="Search by name, phone, email or role..."
                className="w-full bg-white border border-zinc-200 focus:border-[#16A34A] rounded-xl py-2.5 pl-10 pr-4 text-xs text-zinc-950 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-[#16A34A] transition-all shadow-xs"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>

            <div className="relative min-w-[150px]">
              <select
                value={businessFilter}
                onChange={(e) => {
                  setBusinessFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full bg-white border border-zinc-200 focus:border-[#16A34A] rounded-xl py-2.5 px-3 text-xs text-zinc-950 focus:outline-none focus:ring-1 focus:ring-[#16A34A] appearance-none cursor-pointer font-bold pr-8"
              >
                <option value="all">All Businesses</option>
                {businesses.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
            </div>

            <div className="relative min-w-[150px]">
              <select
                value={locationFilter}
                onChange={(e) => {
                  setLocationFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full bg-white border border-zinc-200 focus:border-[#16A34A] rounded-xl py-2.5 px-3 text-xs text-zinc-950 focus:outline-none focus:ring-1 focus:ring-[#16A34A] appearance-none cursor-pointer font-bold pr-8"
              >
                <option value="all">All Locations</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
            </div>

            <div className="relative min-w-[130px]">
              <select
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full bg-white border border-zinc-200 focus:border-[#16A34A] rounded-xl py-2.5 px-3 text-xs text-zinc-950 focus:outline-none focus:ring-1 focus:ring-[#16A34A] appearance-none cursor-pointer font-bold pr-8"
              >
                <option value="all">All Roles</option>
                <option value="manager">Manager</option>
                <option value="supervisor">Supervisor</option>
                <option value="staff">Staff</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
            </div>

            <div className="relative min-w-[130px]">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full bg-white border border-zinc-200 focus:border-[#16A34A] rounded-xl py-2.5 px-3 text-xs text-zinc-950 focus:outline-none focus:ring-1 focus:ring-[#16A34A] appearance-none cursor-pointer font-bold pr-8"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
            </div>

            <button
              onClick={handleClearFilters}
              className="border border-zinc-200 text-zinc-700 bg-white hover:bg-zinc-50 rounded-xl px-4 py-2.5 text-xs font-bold transition duration-200 cursor-pointer"
            >
              Clear
            </button>
          </div>

          {filteredStaff.length === 0 ? (
            <div className="mt-6 bg-white border border-zinc-200 rounded-2xl py-20 px-6 text-center flex flex-col items-center justify-center shadow-sm">
              <Building2 className="h-10 w-10 text-zinc-300 mb-3" />
              <h3 className="text-base font-bold text-[#0F172A]">
                No staff records found
              </h3>
              <p className="text-[#64748B] text-xs mt-1 font-semibold max-w-xs leading-relaxed">
                No registered staff members match your criteria.
              </p>
            </div>
          ) : (
            <div className="mt-6 bg-white border border-zinc-200 rounded-2xl shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-200 text-[10px] uppercase font-extrabold tracking-wider text-[#64748B] bg-zinc-50/50">
                      <th
                        onClick={() => handleSort("name")}
                        className="py-4 px-6 font-extrabold cursor-pointer hover:bg-zinc-100 transition duration-150 select-none"
                      >
                        Staff Name
                      </th>
                      <th
                        onClick={() => handleSort("phone")}
                        className="py-4 px-6 font-extrabold cursor-pointer hover:bg-zinc-100 transition duration-150 select-none"
                      >
                        Phone
                      </th>
                      <th
                        onClick={() => handleSort("email")}
                        className="py-4 px-6 font-extrabold cursor-pointer hover:bg-zinc-100 transition duration-150 select-none"
                      >
                        Email
                      </th>
                      <th
                        onClick={() => handleSort("role")}
                        className="py-4 px-6 font-extrabold cursor-pointer hover:bg-zinc-100 transition duration-150 select-none"
                      >
                        Role
                      </th>
                      <th
                        onClick={() => handleSort("assigned_business")}
                        className="py-4 px-6 font-extrabold cursor-pointer hover:bg-zinc-100 transition duration-150 select-none"
                      >
                        Assigned Business
                      </th>
                      <th
                        onClick={() => handleSort("assigned_locations")}
                        className="py-4 px-6 font-extrabold cursor-pointer hover:bg-zinc-100 transition duration-150 select-none"
                      >
                        Assigned Locations
                      </th>
                      <th
                        onClick={() => handleSort("status")}
                        className="py-4 px-6 font-extrabold cursor-pointer hover:bg-zinc-100 transition duration-150 select-none"
                      >
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 text-xs text-[#0F172A]">
                    {paginatedStaff.map((s) => (
                      <tr
                        key={s.id}
                        className="hover:bg-zinc-50/40 transition-colors"
                      >
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div
                              className={`h-9 w-9 rounded-full flex items-center justify-center font-extrabold text-xs border shadow-3xs shrink-0 ${getAvatarBg(s.name)}`}
                            >
                              {getInitials(s.name)}
                            </div>
                            <span className="font-extrabold text-[#0F172A]">
                              {s.name}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-[#64748B] font-medium">
                          {s.phone}
                        </td>
                        <td className="py-4 px-6 text-[#64748B] font-medium">
                          {s.email}
                        </td>
                        <td className="py-4 px-6">
                          <span
                            className={`px-2.5 py-1 rounded-md font-bold text-[10px] border tracking-wide leading-none ${getRoleBadgeClass(s.role)}`}
                          >
                            {s.role}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-[#64748B] font-bold">
                          {activeBusiness?.name || "Business"}
                        </td>
                        <td className="py-4 px-6 text-zinc-700">
                          <div className="flex flex-wrap gap-1 items-center">
                            {s.locations && s.locations.length > 0 ? (
                              s.locations.map((loc) => (
                                <span
                                  key={loc.id}
                                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-zinc-700 bg-zinc-100 border border-zinc-200/50 rounded-md px-2 py-0.5"
                                >
                                  <MapPin className="h-3 w-3 text-zinc-400" />
                                  {loc.name}
                                </span>
                              ))
                            ) : (
                              <span className="text-zinc-400 font-medium italic">
                                No location assignments
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <span
                            className={`text-[10px] uppercase font-extrabold px-3 py-1 rounded-full flex items-center gap-1.5 border shadow-3xs leading-none w-fit ${
                              s.status === "Active"
                                ? "bg-[#DCFCE7] text-[#16A34A] border-[#16A34A]/10"
                                : "bg-red-50 text-red-600 border-red-100"
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full shrink-0 ${s.status === "Active" ? "bg-[#16A34A]" : "bg-red-500"}`}
                            />
                            {s.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="bg-zinc-50/50 border-t border-zinc-200 py-4 px-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-[#64748B] font-semibold">
                <span>
                  Showing{" "}
                  {filteredStaff.length > 0
                    ? (currentPage - 1) * itemsPerPage + 1
                    : 0}{" "}
                  to {Math.min(currentPage * itemsPerPage, filteredStaff.length)} of{" "}
                  {filteredStaff.length} staff members
                </span>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-semibold">Show</span>
                    <div className="relative">
                      <select
                        value={itemsPerPage}
                        onChange={(e) => {
                          setItemsPerPage(Number(e.target.value));
                          setCurrentPage(1);
                        }}
                        className="bg-white border border-zinc-200 rounded-lg pl-2 pr-6 py-1 text-[11px] font-bold text-zinc-700 focus:outline-none focus:ring-1 focus:ring-[#16A34A] cursor-pointer appearance-none"
                      >
                        <option value={10}>10 / page</option>
                        <option value={20}>20 / page</option>
                        <option value={50}>50 / page</option>
                      </select>
                      <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400 pointer-events-none" />
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
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
            </div>
          )}
        </>
      ) : (
      
        <div className="mt-6">
          {loadingPending ? (
            <div className="py-20 flex flex-col items-center justify-center bg-white border border-zinc-200 rounded-2xl">
              <Loader2 className="h-6 w-6 text-[#16A34A] animate-spin mb-2" />
              <span className="text-xs text-zinc-500 font-bold uppercase tracking-wider">
                Loading approval queue...
              </span>
            </div>
          ) : pendingStaff.length === 0 ? (
            <div className="bg-white border border-zinc-200 rounded-2xl py-20 px-6 text-center flex flex-col items-center justify-center shadow-xs">
              <UserCheck className="h-10 w-10 text-zinc-300 mb-3" />
              <h3 className="text-base font-bold text-[#0F172A]">
                No pending approvals
              </h3>
              <p className="text-[#64748B] text-xs mt-1 font-semibold max-w-xs leading-relaxed">
                All staff access requests are processed. There are no users waiting for access.
              </p>
            </div>
          ) : (
            <div className="bg-white border border-zinc-200 rounded-2xl shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-200 text-[10px] uppercase font-extrabold tracking-wider text-[#64748B] bg-zinc-50/50">
                      <th className="py-4 px-6">Name</th>
                      <th className="py-4 px-6">Email</th>
                      <th className="py-4 px-6">Phone</th>
                      <th className="py-4 px-6">Requested Role</th>
                      <th className="py-4 px-6">Requested Locations</th>
                      <th className="py-4 px-6">Request Date</th>
                      <th className="py-4 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 text-xs text-[#0F172A]">
                    {pendingStaff.map((p) => (
                      <tr key={p.id} className="hover:bg-zinc-50/40 transition-colors">
                        <td className="py-4 px-6 font-extrabold">{p.user_name || "New Staff"}</td>
                        <td className="py-4 px-6 text-[#64748B] font-medium">{p.user_email}</td>
                        <td className="py-4 px-6 text-[#64748B] font-medium">{p.user_phone || "N/A"}</td>
                        <td className="py-4 px-6">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getRoleBadgeClass(p.role)}`}>
                            {p.role}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-zinc-700 font-semibold">
                          <div className="flex flex-wrap gap-1">
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-zinc-700 bg-zinc-100 border border-zinc-200/50 rounded-md px-2 py-0.5">
                              <MapPin className="h-3 w-3 text-zinc-400" />
                              {p.location_name}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-[#64748B] font-medium">
                          {new Date(p.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-4 px-6 text-right flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleReject(p.id)}
                            className="bg-red-50 hover:bg-red-100 text-red-600 rounded-lg p-2 text-xs font-bold border border-red-200/50 cursor-pointer flex items-center gap-1 transition"
                          >
                            <ShieldX className="h-4 w-4" />
                            Reject
                          </button>
                          <button
                            onClick={() => handleApprove(p.id)}
                            className="bg-[#DCFCE7] hover:bg-[#C6F6D5] text-[#16A34A] rounded-lg p-2 text-xs font-bold border border-[#16A34A]/10 cursor-pointer flex items-center gap-1 transition"
                          >
                            <ShieldCheck className="h-4 w-4" />
                            Approve
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {isAddStaffOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 animate-fade-in p-4">
          <div className="bg-white border border-zinc-200 rounded-3xl p-6 w-full max-w-xl shadow-2xl relative animate-scale-in max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-start border-b border-zinc-200 pb-4 mb-4">
              <div>
                <h3 className="text-xl font-extrabold text-[#0F172A]">Invite Staff Member</h3>
                <p className="text-[#64748B] text-xs font-bold mt-1">
                  Create a unique invitation link with preconfigured roles and permissions.
                </p>
              </div>
              <button
                onClick={handleResetModal}
                className="p-1 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {generatedLink ? (
              <div className="space-y-6 py-2 animate-scale-in">
                <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-5 space-y-4">
                  <span className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider block">
                    Your unique invitation link is ready:
                  </span>
                  
                  <div className="flex items-center gap-2 bg-white border border-zinc-300 rounded-xl py-2 px-3">
                    <input
                      type="text"
                      readOnly
                      value={generatedLink}
                      className="bg-transparent text-xs text-zinc-950 font-semibold flex-1 outline-none select-all"
                    />
                    <button
                      onClick={handleCopyLink}
                      className="p-1.5 hover:bg-zinc-50 rounded-lg text-zinc-500 hover:text-[#16A34A] transition cursor-pointer"
                    >
                      {copied ? <Check className="h-4 w-4 text-[#16A34A]" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>
                  
                  <p className="text-[11px] text-[#64748B] font-semibold leading-relaxed">
                    Share this unique link via WhatsApp, SMS, or Email. The link expires in {expiresInHours} hours. Once staff registers, you can approve their access in the <span className="font-bold">Pending Approvals</span> tab.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={handleShareWhatsApp}
                    className="bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/60 text-emerald-700 rounded-xl py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition"
                  >
                    <Send className="h-4 w-4" />
                    Share on WhatsApp
                  </button>

                  <button
                    onClick={handleShareEmail}
                    className="bg-blue-50 hover:bg-blue-100 border border-blue-200/60 text-blue-700 rounded-xl py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition"
                  >
                    <Mail className="h-4 w-4" />
                    Share via Email
                  </button>
                </div>

                <button
                  onClick={handleResetModal}
                  className="w-full bg-[#0F172A] hover:bg-[#1E293B] text-white rounded-xl py-3 text-xs font-bold uppercase tracking-wider transition cursor-pointer"
                >
                  Done & Close
                </button>
              </div>
            ) : (
              <div className="space-y-5 py-2">
        
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold text-[#0F172A] uppercase tracking-wider block">
                    Access Role
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedRole("staff")}
                      className={`p-4 border rounded-2xl flex flex-col items-start text-left cursor-pointer transition ${
                        selectedRole === "staff"
                          ? "border-[#16A34A] bg-[#DCFCE7]/20 text-[#0F172A]"
                          : "border-zinc-200 bg-white hover:bg-zinc-50/50 text-zinc-500"
                      }`}
                    >
                      <span className="text-sm font-extrabold block">Staff</span>
                      <span className="text-[11px] text-zinc-400 font-semibold mt-1">
                        General staff permissions for entering timesheets and sales records.
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedRole("manager")}
                      className={`p-4 border rounded-2xl flex flex-col items-start text-left cursor-pointer transition ${
                        selectedRole === "manager"
                          ? "border-[#16A34A] bg-[#DCFCE7]/20 text-[#0F172A]"
                          : "border-zinc-200 bg-white hover:bg-zinc-50/50 text-zinc-500"
                      }`}
                    >
                      <span className="text-sm font-extrabold block">Manager</span>
                      <span className="text-[11px] text-zinc-400 font-semibold mt-1">
                        Advanced supervisor access for reviewing data and creating reports.
                      </span>
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-extrabold text-[#0F172A] uppercase tracking-wider block">
                    Select Businesses & Locations
                  </label>
                  
                  <div className="border border-zinc-200 rounded-2xl p-4 max-h-[30vh] overflow-y-auto space-y-3 bg-zinc-50/30">
                    {businesses.length === 0 ? (
                      <span className="text-xs text-zinc-400 font-semibold italic">No businesses available.</span>
                    ) : (
                      businesses.map((b) => {
                        const isBizChecked = selectedBusinesses.includes(b.id);
                        const allLocs = businessLocations[b.id] || [];
                        const currentCheckedLocs = selectedLocations[b.id] || [];
                        const hasLocations = allLocs.length > 0;
                        const allLocsChecked = hasLocations && currentCheckedLocs.length === allLocs.length;

                        return (
                          <div key={b.id} className="border border-zinc-200/80 rounded-xl bg-white p-3 space-y-2.5">
                         
                            <label className="flex items-center gap-2.5 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={isBizChecked}
                                onChange={() => handleToggleBusiness(b.id)}
                                className="h-4 w-4 rounded border-zinc-300 text-[#16A34A] focus:ring-[#16A34A] cursor-pointer"
                              />
                              <span className="text-xs font-extrabold text-zinc-950 flex items-center gap-1.5">
                                <Building2 className="h-3.5 w-3.5 text-zinc-400" />
                                {b.name}
                              </span>
                            </label>

                            {isBizChecked && (
                              <div className="pl-6 border-l-2 border-zinc-100 space-y-2 py-0.5">
                                {hasLocations ? (
                                  <>
                                    <label className="flex items-center gap-2 cursor-pointer select-none text-[11px] font-bold text-zinc-500">
                                      <input
                                        type="checkbox"
                                        checked={allLocsChecked}
                                        onChange={() => handleToggleAllLocations(b.id)}
                                        className="h-3.5 w-3.5 rounded border-zinc-300 text-[#16A34A] focus:ring-[#16A34A] cursor-pointer"
                                      />
                                      <span>Select All Locations ({allLocs.length})</span>
                                    </label>

                                   
                                    <div className="grid grid-cols-2 gap-2 mt-1.5">
                                      {allLocs.map((loc) => (
                                        <label key={loc.id} className="flex items-center gap-2 cursor-pointer select-none text-[11px] font-semibold text-zinc-700">
                                          <input
                                            type="checkbox"
                                            checked={currentCheckedLocs.includes(loc.id)}
                                            onChange={() => handleToggleLocation(b.id, loc.id)}
                                            className="h-3.5 w-3.5 rounded border-zinc-300 text-[#16A34A] focus:ring-[#16A34A] cursor-pointer"
                                          />
                                          <span className="truncate">{loc.name}</span>
                                        </label>
                                      ))}
                                    </div>
                                  </>
                                ) : (
                                  <span className="text-[10px] text-zinc-400 font-semibold italic">
                                    Loading locations...
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold text-[#0F172A] uppercase tracking-wider block">
                    Link Expiration Limit
                  </label>
                  <div className="relative">
                    <select
                      value={expiresInHours}
                      onChange={(e) => setExpiresInHours(Number(e.target.value))}
                      className="w-full bg-white border border-zinc-200 focus:border-[#16A34A] rounded-xl py-3 px-3.5 text-xs text-zinc-950 font-bold focus:outline-none focus:ring-1 focus:ring-[#16A34A] appearance-none cursor-pointer pr-10"
                    >
                      <option value={24}>24 Hours</option>
                      <option value={48}>48 Hours (Default)</option>
                      <option value={72}>3 Days</option>
                      <option value={168}>7 Days</option>
                      <option value={336}>14 Days</option>
                      <option value={720}>30 Days (Maximum)</option>
                    </select>
                    <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleGenerateInvitation}
                  disabled={generatingLink || selectedBusinesses.length === 0}
                  className="mt-6 w-full bg-[#16A34A] hover:bg-[#15803D] active:bg-[#14532D] text-white rounded-xl py-3.5 text-xs font-bold uppercase tracking-wider shadow-md transition duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {generatingLink ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Generating Invitation...
                    </>
                  ) : (
                    "Generate Invitation Link"
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
