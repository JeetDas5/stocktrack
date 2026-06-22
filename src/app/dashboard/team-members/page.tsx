/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { toast } from "sonner";
import { useEffect, useState, useCallback, useRef } from "react";

import { useStaffStore } from "@/stores/staff-store";
import { useBusinessStore } from "@/stores/business-store";
import { useLocationStore } from "@/stores/location-store";
import { getUserBusinesses } from "@/lib/repositories/business.repository";
import { getLocations } from "@/lib/repositories/location.repository";
import {
  createStaffInvitation,
  getPendingStaff,
  approvePendingStaff,
  rejectPendingStaff,
} from "@/lib/repositories/staff.repository";
import { getRosterSettings } from "@/lib/repositories/roster-settings.repository";
import { Business } from "@/types/business";
import { Location } from "@/types/inventory";
import { Staff, PendingStaffAssignment } from "@/types/staff";
import {
  Search,
  ChevronDown,
  Loader2,
  Download,
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
  Edit2,
  MoreVertical,
  UserX,
} from "lucide-react";
import { Dropdown } from "@/components/ui/dropdown";

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

  const [activeTab, setActiveTab] = useState<"directory" | "pending">(
    "directory",
  );

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

  const [pendingStaff, setPendingStaff] = useState<PendingStaffAssignment[]>(
    [],
  );
  const [loadingPending, setLoadingPending] = useState(false);

  const [isAddStaffOpen, setIsAddStaffOpen] = useState(false);

  const [businessLocations, setBusinessLocations] = useState<
    Record<string, Location[]>
  >({});

  const [generatingLink, setGeneratingLink] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [positions, setPositions] = useState<string[]>([]);

  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [pendingStaffToApprove, setPendingStaffToApprove] =
    useState<PendingStaffAssignment | null>(null);
  const [approvalRole, setApprovalRole] = useState("staff");
  const [approvalBusinesses, setApprovalBusinesses] = useState<string[]>([]);
  const [approvalLocations, setApprovalLocations] = useState<
    Record<string, string[]>
  >({});
  const [approvalPosition, setApprovalPosition] = useState("");
  const [approvalPriority, setApprovalPriority] = useState(5);
  const [approvalMaxHours, setApprovalMaxHours] = useState<number | "">("");
  const [submittingApproval, setSubmittingApproval] = useState(false);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [staffToEdit, setStaffToEdit] = useState<Staff | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editRole, setEditRole] = useState("staff");
  const [editStatus, setEditStatus] = useState<"Active" | "Inactive">("Active");
  const [editLocations, setEditLocations] = useState<string[]>([]);
  const [editPosition, setEditPosition] = useState("");
  const [editPriority, setEditPriority] = useState(5);
  const [editMaxHours, setEditMaxHours] = useState<number | "">("");
  const [submittingEdit, setSubmittingEdit] = useState(false);

  const loadData = useCallback(async () => {
    if (!activeBusinessId) return;
    try {
      setLoadingContext(true);
      await fetchStaffMembers(activeBusinessId);
      const bizList = await getUserBusinesses([]);
      setBusinesses(bizList);
      const currentBiz = bizList.find((b) => b.id === activeBusinessId) || null;
      setActiveBusiness(currentBiz);

      try {
        const settings = await getRosterSettings(activeBusinessId);
        setPositions(settings.positions || []);
      } catch (e) {
        console.error("Failed to load roster settings positions:", e);
        setPositions(["Chef", "Barista", "Kitchen Hand"]);
      }
    } catch (err) {
      if (err instanceof Error) {
        toast.error(err.message);
      } else {
        toast.error("Failed to load directory context.");
      }
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
    } catch (err) {
      if (err instanceof Error) {
        toast.error(err.message);
      } else {
        toast.error("Failed to load pending staff registrations.");
      }
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
      "Position",
      "Priority",
      "Max Hours/Week",
      "Assigned Business",
      "Assigned Locations",
      "Status",
    ];
    const rows = filteredStaff.map((s) => [
      s.name,
      s.phone,
      s.email,
      s.role,
      s.position || "",
      s.priority || 5,
      s.maxWorkingHours !== null && s.maxWorkingHours !== undefined
        ? s.maxWorkingHours
        : "Unlimited",
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
        s.role.toLowerCase().includes(query) ||
        (s.position && s.position.toLowerCase().includes(query));

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

      let valA = "";
      let valB = "";

      if (sortField === "assigned_business") {
        valA = activeBusiness?.name || "";
        valB = activeBusiness?.name || "";
      } else if (
        sortField === "assigned_locations" ||
        sortField === "locations"
      ) {
        valA = a.locations?.map((l) => l.name).join(", ") || "";
        valB = b.locations?.map((l) => l.name).join(", ") || "";
      } else {
        const fieldValA = a[sortField as keyof Staff];
        const fieldValB = b[sortField as keyof Staff];
        valA = typeof fieldValA === "string" ? fieldValA : "";
        valB = typeof fieldValB === "string" ? fieldValB : "";
      }

      return sortDirection === "asc"
        ? valA.localeCompare(valB)
        : valB.localeCompare(valA);
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

  const getAvatarBg = () => {
    return "bg-zinc-100 text-zinc-800 border-zinc-200/60";
  };

  const getRoleBadgeClass = (role: string) => {
    const r = role.toLowerCase();
    if (r === "manager") {
      return "bg-black text-white border-black";
    }
    if (r === "supervisor") {
      return "bg-zinc-800 text-white border-zinc-800";
    }
    return "bg-zinc-100 text-zinc-800 border-zinc-200";
  };

  const handleCreateInvitation = async () => {
    if (!activeBusinessId) return;
    try {
      setGeneratingLink(true);
      const invite = await createStaffInvitation({
        role: "staff",
        expiresInHours: 48,
        business_id: activeBusinessId,
        assignments: [{ business_id: activeBusinessId, location_ids: [] }],
      });

      const inviteLink = `${window.location.origin}/invite/${invite.id}`;
      setGeneratedLink(inviteLink);
      navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      toast.success("Invitation link generated and copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
      setIsAddStaffOpen(true);
    } catch (err) {
      if (err instanceof Error) {
        toast.error(err.message);
      } else {
        toast.error("Failed to generate invitation.");
      }
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
    const msg = `Click the link to join our team on NexBrix: ${generatedLink}`;
    window.open(
      `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`,
      "_blank",
    );
  };

  const handleShareEmail = () => {
    if (!generatedLink) return;
    const subject = encodeURIComponent("Invitation to join StockTrack staff");
    const body = encodeURIComponent(
      `Please register via this unique link to set up your staff account: ${generatedLink}`,
    );
    window.open(`mailto:?subject=${subject}&body=${body}`, "_blank");
  };

  const handleOpenApprovalModal = async (pending: PendingStaffAssignment) => {
    setPendingStaffToApprove(pending);
    setApprovalRole("staff");
    setApprovalBusinesses([activeBusinessId || ""]);
    setApprovalLocations({});

    setApprovalPosition(positions[0] || "");
    setApprovalPriority(5);
    setApprovalMaxHours("");

    setIsApprovalModalOpen(true);

    const bizId = activeBusinessId || "";
    if (bizId && !businessLocations[bizId]) {
      try {
        const locs = await getLocations(bizId);
        setBusinessLocations((prev) => ({ ...prev, [bizId]: locs }));
      } catch (err) {
        console.error("Failed to load active business locations:", err);
      }
    }
  };

  const handleToggleApprovalBusiness = async (bizId: string) => {
    if (approvalBusinesses.includes(bizId)) {
      setApprovalBusinesses(approvalBusinesses.filter((id) => id !== bizId));
      setApprovalLocations((prev) => {
        const next = { ...prev };
        delete next[bizId];
        return next;
      });
    } else {
      setApprovalBusinesses([...approvalBusinesses, bizId]);
      if (!businessLocations[bizId]) {
        try {
          const locs = await getLocations(bizId);
          setBusinessLocations((prev) => ({ ...prev, [bizId]: locs }));
        } catch (err) {
          if (err instanceof Error) {
            toast.error(
              err.message || "Failed to load locations for this business.",
            );
          }
        }
      }
    }
  };

  const handleToggleApprovalLocation = (bizId: string, locId: string) => {
    const currentLocs = approvalLocations[bizId] || [];
    if (currentLocs.includes(locId)) {
      setApprovalLocations((prev) => ({
        ...prev,
        [bizId]: currentLocs.filter((id) => id !== locId),
      }));
    } else {
      setApprovalLocations((prev) => ({
        ...prev,
        [bizId]: [...currentLocs, locId],
      }));
    }
  };

  const handleToggleApprovalAllLocations = (bizId: string) => {
    const allLocs = businessLocations[bizId] || [];
    const currentLocs = approvalLocations[bizId] || [];

    if (currentLocs.length === allLocs.length) {
      setApprovalLocations((prev) => ({
        ...prev,
        [bizId]: [],
      }));
    } else {
      setApprovalLocations((prev) => ({
        ...prev,
        [bizId]: allLocs.map((l) => l.id),
      }));
    }
  };

  const handleSubmitApproval = async () => {
    if (!activeBusinessId || !pendingStaffToApprove) return;
    if (approvalBusinesses.length === 0) {
      toast.error("Please select at least one business.");
      return;
    }

    try {
      setSubmittingApproval(true);
      const assignments = approvalBusinesses.map((bizId) => ({
        business_id: bizId,
        location_ids: approvalLocations[bizId] || [],
      }));

      const res = await approvePendingStaff(
        activeBusinessId,
        pendingStaffToApprove.id,
        {
          role: approvalRole,
          assignments,
          priority: approvalPriority,
          position: approvalPosition || null,
          max_working_hours:
            approvalMaxHours === "" ? null : Number(approvalMaxHours),
        },
      );

      toast.success(
        res.message || "Staff access approved and configured successfully.",
      );
      setIsApprovalModalOpen(false);
      setPendingStaffToApprove(null);
      await loadPending();
      await fetchStaffMembers(activeBusinessId);
    } catch (err) {
      if (err instanceof Error) {
        toast.error(err.message);
      } else {
        toast.error("Failed to approve staff.");
      }
    } finally {
      setSubmittingApproval(false);
    }
  };

  const handleReject = async (assignmentId: string) => {
    if (!activeBusinessId) return;
    try {
      const res = await rejectPendingStaff(activeBusinessId, assignmentId);
      toast.success(res.message || "Staff request rejected.");
      await loadPending();
    } catch (err) {
      if (err instanceof Error) {
        toast.error(err.message);
      } else {
        toast.error("Failed to reject staff.");
      }
    }
  };

  const handleOpenEditModal = async (staff: Staff) => {
    setStaffToEdit(staff);
    setEditName(staff.name);
    setEditEmail(staff.email);
    setEditPhone(staff.phone);
    setEditRole(staff.role);
    setEditStatus(staff.status);
    setEditLocations(staff.locations?.map((l) => l.id) || []);
    setEditPosition(staff.position || "");
    setEditPriority(staff.priority || 5);
    setEditMaxHours(
      staff.maxWorkingHours !== null && staff.maxWorkingHours !== undefined
        ? staff.maxWorkingHours
        : "",
    );
    setIsEditModalOpen(true);

    const bizId = activeBusinessId || "";
    if (bizId && !businessLocations[bizId]) {
      try {
        const locs = await getLocations(bizId);
        setBusinessLocations((prev) => ({ ...prev, [bizId]: locs }));
      } catch (err) {
        console.error("Failed to load active business locations:", err);
      }
    }
  };

  const handleToggleEditLocation = (locId: string) => {
    if (editLocations.includes(locId)) {
      setEditLocations(editLocations.filter((id) => id !== locId));
    } else {
      setEditLocations([...editLocations, locId]);
    }
  };

  const handleSubmitEdit = async () => {
    if (!activeBusinessId || !staffToEdit) return;
    if (!editName.trim() || !editEmail.trim()) {
      toast.error("Name and Email are required.");
      return;
    }

    try {
      setSubmittingEdit(true);

      const { updateStaff } =
        await import("@/lib/repositories/staff.repository");

      await updateStaff(activeBusinessId, staffToEdit.id, {
        name: editName.trim(),
        phone: editPhone.trim(),
        email: editEmail.trim(),
        role: editRole,
        status: editStatus,
        locationIds: editLocations,
        priority: editPriority,
        position: editPosition || null,
        maxWorkingHours: editMaxHours === "" ? null : Number(editMaxHours),
      });

      toast.success("Staff profile updated successfully.");
      setIsEditModalOpen(false);
      setStaffToEdit(null);
      await fetchStaffMembers(activeBusinessId);
    } catch (err) {
      if (err instanceof Error) {
        toast.error(err.message);
      } else {
        toast.error("Failed to update staff.");
      }
    } finally {
      setSubmittingEdit(false);
    }
  };

  const handleToggleStatus = async (staff: Staff) => {
    if (!activeBusinessId) return;
    try {
      const newStatus = staff.status === "Active" ? "Inactive" : "Active";
      const { updateStaff } =
        await import("@/lib/repositories/staff.repository");

      await updateStaff(activeBusinessId, staff.id, {
        name: staff.name,
        phone: staff.phone,
        email: staff.email,
        role: staff.role,
        status: newStatus,
        locationIds: staff.locations?.map((l) => l.id) || [],
        priority: staff.priority || 5,
        position: staff.position || null,
        maxWorkingHours: staff.maxWorkingHours || null,
      });

      toast.success(`Staff status updated to ${newStatus}.`);
      await fetchStaffMembers(activeBusinessId);
    } catch (err) {
      if (err instanceof Error) {
        toast.error(err.message);
      } else {
        toast.error("Failed to update status.");
      }
    }
  };

  const handleResetModal = () => {
    setIsAddStaffOpen(false);
    setGeneratedLink(null);
  };

  if (staffLoading || loadingContext) {
    return (
      <div className="h-[75vh] flex flex-col items-center justify-center bg-white text-[#0F172A]">
        <Loader2 className="h-7 w-7 text-black animate-spin mb-3" />
        <span className="text-[#64748B] text-xs font-bold uppercase tracking-wider">
          Syncing staff records...
        </span>
      </div>
    );
  }

  return (
    <div className="px-4 py-3 bg-white min-h-[80vh] scroll-y-auto">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b py-3 px-3 md:py-3 md:px-4 border border-[#E2E8F0] rounded-2xl shadow-sm">
        <div>
          <h1 className="text-xl md:text-2xl font-bold md:font-extrabold tracking-tight">
            Team Members
          </h1>
          <p className="text-[#64748B] text-xs font-bold mt-1.5">
            View and manage all staff members, invitations, and access
            permissions.
          </p>
        </div>

        <div className="flex items-center gap-3 self-end lg:self-auto">
          {activeTab === "directory" && (
            <button
              onClick={handleExport}
              className="bg-white hover:bg-zinc-50 border border-black text-black rounded-full px-5 py-2.5 text-xs font-bold uppercase tracking-wider shadow-sm flex items-center gap-2 cursor-pointer transition-all duration-200"
            >
              <Download className="h-4 w-4" />
              Export
            </button>
          )}

          <button
            onClick={handleCreateInvitation}
            disabled={generatingLink}
            className="bg-black hover:bg-neutral-800 text-white rounded-full px-5 py-2.5 text-xs font-bold uppercase tracking-wider shadow-sm flex items-center gap-2 cursor-pointer transition-all duration-200 disabled:opacity-50"
          >
            {generatingLink ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-white" />
                Creating...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 stroke-[3px]" />
                Create Invitation
              </>
            )}
          </button>
        </div>
      </div>

      <div className="flex border-b border-zinc-200 mt-4 mb-2">
        <button
          onClick={() => setActiveTab("directory")}
          className={`pb-3 text-xs font-bold uppercase tracking-wider px-4 border-b-2 cursor-pointer transition-all duration-150 flex items-center gap-2 ${
            activeTab === "directory"
              ? "border-black text-black font-extrabold"
              : "border-transparent text-zinc-400 hover:text-zinc-600"
          }`}
        >
          Active Staff
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-bold transition-all duration-150 ${
              activeTab === "directory"
                ? "bg-black text-white"
                : "bg-zinc-100 text-zinc-500"
            }`}
          >
            {staffMembers.length > 0 ? staffMembers.length : ""}
          </span>
        </button>
        <button
          onClick={() => setActiveTab("pending")}
          className={`pb-3 text-xs font-bold uppercase tracking-wider px-4 border-b-2 cursor-pointer transition-all duration-150 flex items-center gap-2 ${
            activeTab === "pending"
              ? "border-black text-black font-extrabold"
              : "border-transparent text-zinc-400 hover:text-zinc-600"
          }`}
        >
          Pending Approvals
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-bold transition-all duration-150 ${
              activeTab === "pending"
                ? "bg-black text-white"
                : "bg-zinc-100 text-zinc-500"
            }`}
          >
            {pendingStaff.length > 0 ? pendingStaff.length : ""}
          </span>
        </button>
      </div>

      {activeTab === "directory" ? (
        <>
          <div className="mt-6 flex flex-wrap justify-between gap-3 items-center">
            <div className="relative flex-1 w-full max-w-[50svw] md:max-w-[30svw]">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                <Search className="h-4 w-4" />
              </span>
              <input
                type="text"
                placeholder="Search by name, phone, email, role or position..."
                className="w-full bg-white border border-zinc-200 focus:border-black rounded-xl py-2.5 pl-10 pr-4 text-xs text-zinc-950 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-black transition-all shadow-xs"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>

            <Dropdown
              value={roleFilter}
              onChange={(val) => {
                setRoleFilter(val);
                setCurrentPage(1);
              }}
              options={
                [
                  { value: "all", label: "All Roles" },
                  { value: "manager", label: "Manager" },
                  { value: "supervisor", label: "Supervisor" },
                  { value: "staff", label: "Staff" },
                ] as const
              }
              className="min-w-[130px]"
              triggerClassName="rounded-xl py-2.5 px-3 font-bold text-zinc-950 focus:ring-black focus:border-black"
            />

            {(searchQuery || roleFilter !== "all") && (
              <button
                onClick={handleClearFilters}
                className="border border-zinc-200 text-zinc-700 bg-white hover:bg-zinc-50 rounded-xl px-4 py-2.5 text-xs font-bold transition duration-200 cursor-pointer"
              >
                Clear
              </button>
            )}
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
                    <tr className="border-b border-zinc-200 text-[10px] uppercase font-extrabold tracking-wider text-[#64748B] bg-zinc-50/50 text-center">
                      <th
                        onClick={() => handleSort("name")}
                        className="py-4 px-6 font-extrabold cursor-pointer hover:bg-zinc-100 transition duration-150 select-none"
                      >
                        Staff Name
                      </th>
                      <th className="py-4 px-6 font-extrabold select-none">
                        Position
                      </th>
                      <th className="py-4 px-6 font-extrabold select-none text-center">
                        Weekly Hours
                      </th>
                      <th
                        onClick={() => handleSort("role")}
                        className="py-4 px-6 font-extrabold cursor-pointer hover:bg-zinc-100 transition duration-150 select-none"
                      >
                        Role
                      </th>
                      <th className="py-4 px-6 font-extrabold select-none">
                        Business
                      </th>
                      <th
                        onClick={() => handleSort("assigned_locations")}
                        className="py-4 px-4 text-center font-extrabold cursor-pointer hover:bg-zinc-100 transition duration-150 select-none"
                      >
                        Locations
                      </th>
                      <th
                        onClick={() => handleSort("status")}
                        className="py-4 px-4 mx-auto text-center font-extrabold cursor-pointer hover:bg-zinc-100 transition duration-150 select-none"
                      >
                        Status
                      </th>
                      <th className="p-4 font-extrabold text-right select-none">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 text-xs text-[#0F172A]">
                    {paginatedStaff.map((s) => (
                      <tr
                        key={s.id}
                        onClick={() => handleOpenEditModal(s)}
                        className="hover:bg-zinc-50/40 transition-colors cursor-pointer"
                      >
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div
                              className={`h-9 w-9 rounded-full flex items-center justify-center font-extrabold text-xs border shadow-3xs shrink-0 ${getAvatarBg()}`}
                            >
                              {getInitials(s.name)}
                            </div>
                            <span className="font-extrabold text-[#0F172A]">
                              {s.name}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-zinc-950 font-bold">
                          {s.position || (
                            <span className="text-zinc-400 font-medium italic">
                              None
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-6 text-center text-[#64748B] font-bold">
                          {s.maxWorkingHours !== null &&
                          s.maxWorkingHours !== undefined
                            ? `${s.maxWorkingHours}`
                            : "Unlimited"}
                        </td>
                        <td className="py-4 px-6">
                          <span
                            className={`px-2.5 py-1 rounded-md font-bold text-[10px] border tracking-wide leading-none ${getRoleBadgeClass(s.role)}`}
                          >
                            {s.role}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-zinc-950 font-bold">
                          {activeBusiness?.name || (
                            <span className="text-zinc-400 font-medium italic">
                              None
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-6 text-zinc-700">
                          {s.locations && s.locations.length > 0 ? (
                            <div className="w-40 mx-auto flex flex-col items-start gap-1">
                              {s.locations.map((loc) => (
                                <span
                                  key={loc.id}
                                  className="inline-flex items-center gap-1 text-[12px] text-zinc-700 border border-zinc-200/50 rounded-md px-2 py-0.5"
                                >
                                  {loc.name}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center">
                              <span className="text-zinc-400 font-medium italic">
                                No location assignments
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="py-4 px-6">
                          {s.status === "Active" ? (
                            <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] text-[#0C830C] w-fit leading-none shadow-3xs">
                              ACTIVE
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] text-[#9B1C1C] w-fit leading-none shadow-3xs">
                              INACTIVE
                            </span>
                          )}
                        </td>
                        <td
                          className="py-4 px-6 text-right"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ActionsMenu
                            staff={s}
                            onEdit={() => handleOpenEditModal(s)}
                            onToggleStatus={() => handleToggleStatus(s)}
                          />
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
                  to{" "}
                  {Math.min(currentPage * itemsPerPage, filteredStaff.length)}{" "}
                  of {filteredStaff.length} staff members
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
                    <span className="h-8 w-8 bg-black text-white flex items-center justify-center rounded-lg font-bold">
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
              <Loader2 className="h-6 w-6 text-black animate-spin mb-2" />
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
                All staff access requests are processed. There are no users
                waiting for access.
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
                      <tr
                        key={p.id}
                        className="hover:bg-zinc-50/40 transition-colors"
                      >
                        <td className="py-4 px-6 font-extrabold">
                          {p.user_name || "New Staff"}
                        </td>
                        <td className="py-4 px-6 text-[#64748B] font-medium">
                          {p.user_email}
                        </td>
                        <td className="py-4 px-6 text-[#64748B] font-medium">
                          {p.user_phone || "N/A"}
                        </td>
                        <td className="py-4 px-6">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getRoleBadgeClass(p.role)}`}
                          >
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
                            className="bg-white hover:bg-zinc-50 text-zinc-600 rounded-lg p-2 text-xs font-bold border border-zinc-200 cursor-pointer flex items-center gap-1 transition"
                          >
                            <ShieldX className="h-4 w-4" />
                            Reject
                          </button>
                          <button
                            onClick={() => handleOpenApprovalModal(p)}
                            className="bg-black hover:bg-neutral-800 text-white rounded-lg p-2 px-3.5 text-xs font-bold cursor-pointer flex items-center gap-1 transition"
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
                <h3 className="text-xl font-extrabold text-[#0F172A]">
                  Staff Invitation Link
                </h3>
                <p className="text-[#64748B] text-xs font-bold mt-1">
                  Your unique team invitation link is ready.
                </p>
              </div>
              <button
                onClick={handleResetModal}
                className="p-1 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-6 py-2 animate-scale-in">
              <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-5 space-y-4">
                <span className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider block">
                  Your unique invitation link is ready:
                </span>

                <div className="flex items-center gap-2 bg-white border border-zinc-300 rounded-xl py-2 px-3">
                  <input
                    type="text"
                    readOnly
                    value={generatedLink || ""}
                    className="bg-transparent text-xs text-zinc-950 font-semibold flex-1 outline-none select-all"
                  />
                  <button
                    onClick={handleCopyLink}
                    className="p-1.5 hover:bg-zinc-50 rounded-lg text-zinc-500 hover:text-black transition cursor-pointer"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-black" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                </div>

                <p className="text-[11px] text-[#64748B] font-semibold leading-relaxed">
                  Share this unique link via WhatsApp or Email. The link is
                  valid for{" "}
                  <span className="font-bold text-black">48 hours</span>. Once
                  the user registers, you will receive their profile details in
                  the <span className="font-bold">Pending Approvals</span> tab
                  to assign their role, business(es), and location(s).
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleShareWhatsApp}
                  className="bg-white hover:bg-zinc-50 border border-black text-black rounded-xl py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition"
                >
                  <Send className="h-4 w-4" />
                  Share on WhatsApp
                </button>

                <button
                  onClick={handleShareEmail}
                  className="bg-zinc-100 hover:bg-zinc-200 text-zinc-950 rounded-xl py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition"
                >
                  <Mail className="h-4 w-4" />
                  Share via Email
                </button>
              </div>

              <button
                onClick={handleResetModal}
                className="w-full bg-black hover:bg-neutral-800 text-white rounded-xl py-3 text-xs font-bold uppercase tracking-wider transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {isApprovalModalOpen && pendingStaffToApprove && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 animate-fade-in p-4">
          <div className="bg-white border border-zinc-200 rounded-3xl p-6 w-full max-w-xl shadow-2xl relative animate-scale-in max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start border-b border-zinc-200 pb-4 mb-4">
              <div>
                <h3 className="text-xl font-extrabold text-[#0F172A]">
                  Configure & Approve Staff
                </h3>
                <p className="text-[#64748B] text-xs font-bold mt-1">
                  Assign role, businesses, locations, position, priority, and
                  working hours.
                </p>
              </div>
              <button
                onClick={() => {
                  setIsApprovalModalOpen(false);
                  setPendingStaffToApprove(null);
                }}
                className="p-1 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5 py-2">
              <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-4 space-y-2">
                <span className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider block">
                  Registration Details:
                </span>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-zinc-500 font-bold block">NAME</span>
                    <span className="text-zinc-900 font-extrabold mt-0.5 block">
                      {pendingStaffToApprove.user_name || "New Staff"}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-500 font-bold block">EMAIL</span>
                    <span className="text-zinc-900 font-extrabold mt-0.5 block truncate">
                      {pendingStaffToApprove.user_email}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-500 font-bold block">PHONE</span>
                    <span className="text-zinc-900 font-extrabold mt-0.5 block">
                      {pendingStaffToApprove.user_phone || "N/A"}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-500 font-bold block">
                      SUBMITTED ON
                    </span>
                    <span className="text-zinc-900 font-extrabold mt-0.5 block">
                      {new Date(
                        pendingStaffToApprove.created_at,
                      ).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold text-[#0F172A] uppercase tracking-wider block">
                  Access Role (Compulsory)
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setApprovalRole("staff")}
                    className={`p-4 border rounded-2xl flex flex-col items-start text-left cursor-pointer transition ${
                      approvalRole === "staff"
                        ? "border-black bg-zinc-50 text-[#0F172A]"
                        : "border-zinc-200 bg-white hover:bg-zinc-50/50 text-zinc-500"
                    }`}
                  >
                    <span className="text-sm font-extrabold block">Staff</span>
                    <span className="text-[11px] text-zinc-400 font-semibold mt-1">
                      General permissions for entering timesheets and sales
                      records.
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setApprovalRole("manager")}
                    className={`p-4 border rounded-2xl flex flex-col items-start text-left cursor-pointer transition ${
                      approvalRole === "manager"
                        ? "border-black bg-zinc-50 text-[#0F172A]"
                        : "border-zinc-200 bg-white hover:bg-zinc-50/50 text-zinc-500"
                    }`}
                  >
                    <span className="text-sm font-extrabold block">
                      Manager
                    </span>
                    <span className="text-[11px] text-zinc-400 font-semibold mt-1">
                      Advanced access for reviewing data and creating reports.
                    </span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="text-[10px] font-extrabold text-zinc-500 uppercase block mb-1">
                    Position
                  </label>
                  <select
                    value={approvalPosition}
                    onChange={(e) => setApprovalPosition(e.target.value)}
                    className="w-full bg-white border border-zinc-200 focus:border-black rounded-xl py-2 px-3 text-xs font-bold text-zinc-950 focus:outline-none focus:ring-1 focus:ring-black cursor-pointer"
                  >
                    <option value="">-- Choose --</option>
                    {positions.map((pos) => (
                      <option key={pos} value={pos}>
                        {pos}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-span-1">
                  <label className="text-[10px] font-extrabold text-zinc-500 uppercase block mb-1">
                    Priority (1-10)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={approvalPriority}
                    onChange={(e) => {
                      const val = Math.max(
                        1,
                        Math.min(10, Number(e.target.value) || 5),
                      );
                      setApprovalPriority(val);
                    }}
                    className="w-full bg-white border border-zinc-200 focus:border-black rounded-xl py-2 px-3 text-xs font-semibold text-zinc-950 focus:outline-none focus:ring-1 focus:ring-black"
                  />
                </div>
                <div className="col-span-1">
                  <label className="text-[10px] font-extrabold text-zinc-500 uppercase block mb-1">
                    Max Hours/Wk
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 40"
                    value={approvalMaxHours}
                    onChange={(e) => {
                      const val =
                        e.target.value === ""
                          ? ""
                          : Math.max(0, Number(e.target.value));
                      setApprovalMaxHours(val);
                    }}
                    className="w-full bg-white border border-zinc-200 focus:border-black rounded-xl py-2 px-3 text-xs font-semibold text-zinc-950 focus:outline-none focus:ring-1 focus:ring-black"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-extrabold text-[#0F172A] uppercase tracking-wider block">
                  Assign Businesses & Locations (Compulsory)
                </label>

                <div className="border border-zinc-200 rounded-2xl p-4 max-h-[25vh] overflow-y-auto space-y-3 bg-zinc-50/30">
                  {businesses.length === 0 ? (
                    <span className="text-xs text-zinc-400 font-semibold italic">
                      No businesses available.
                    </span>
                  ) : (
                    businesses.map((b) => {
                      const isBizChecked = approvalBusinesses.includes(b.id);
                      const allLocs = businessLocations[b.id] || [];
                      const currentCheckedLocs = approvalLocations[b.id] || [];
                      const hasLocations = allLocs.length > 0;
                      const allLocsChecked =
                        hasLocations &&
                        currentCheckedLocs.length === allLocs.length;

                      return (
                        <div
                          key={b.id}
                          className="border border-zinc-200/80 rounded-xl bg-white p-3 space-y-2.5"
                        >
                          <label className="flex items-center gap-2.5 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={isBizChecked}
                              onChange={() =>
                                handleToggleApprovalBusiness(b.id)
                              }
                              className="h-4 w-4 rounded border-zinc-300 text-black focus:ring-black accent-black cursor-pointer"
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
                                      onChange={() =>
                                        handleToggleApprovalAllLocations(b.id)
                                      }
                                      className="h-3.5 w-3.5 rounded border-zinc-300 text-black focus:ring-black accent-black cursor-pointer"
                                    />
                                    <span>
                                      Select All Locations ({allLocs.length})
                                    </span>
                                  </label>

                                  <div className="grid grid-cols-2 gap-2 mt-1.5">
                                    {allLocs.map((loc) => (
                                      <label
                                        key={loc.id}
                                        className="flex items-center gap-2 cursor-pointer select-none text-[11px] font-semibold text-zinc-700"
                                      >
                                        <input
                                          type="checkbox"
                                          checked={currentCheckedLocs.includes(
                                            loc.id,
                                          )}
                                          onChange={() =>
                                            handleToggleApprovalLocation(
                                              b.id,
                                              loc.id,
                                            )
                                          }
                                          className="h-3.5 w-3.5 rounded border-zinc-300 text-black focus:ring-black accent-black cursor-pointer"
                                        />
                                        <span className="truncate">
                                          {loc.name}
                                        </span>
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

              <div className="grid grid-cols-2 gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setIsApprovalModalOpen(false);
                    setPendingStaffToApprove(null);
                  }}
                  className="bg-white hover:bg-zinc-50 border border-zinc-200 text-zinc-700 rounded-xl py-3 text-xs font-bold uppercase tracking-wider transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmitApproval}
                  disabled={
                    submittingApproval ||
                    approvalBusinesses.length === 0 ||
                    !approvalRole
                  }
                  className="bg-black hover:bg-neutral-800 text-white rounded-xl py-3 text-xs font-bold uppercase tracking-wider shadow-md transition duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {submittingApproval ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-white" />
                      Approving...
                    </>
                  ) : (
                    "Approve & Assign"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isEditModalOpen && staffToEdit && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 animate-fade-in p-4">
          <div className="bg-white border border-zinc-200 rounded-3xl p-6 w-full max-w-xl shadow-2xl relative animate-scale-in max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start border-b border-zinc-200 pb-4 mb-4">
              <div>
                <h3 className="text-xl font-extrabold text-[#0F172A]">
                  Edit Staff Configuration
                </h3>
                <p className="text-[#64748B] text-xs font-bold mt-1">
                  Modify user roles, positions, priority levels, and hours.
                </p>
              </div>
              <button
                onClick={() => {
                  setIsEditModalOpen(false);
                  setStaffToEdit(null);
                }}
                className="p-1 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-extrabold text-zinc-500 uppercase block mb-1">
                    Staff Name
                  </label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-white border border-zinc-200 focus:border-black rounded-xl py-2 px-3 text-xs font-semibold text-zinc-950 focus:outline-none focus:ring-1 focus:ring-black"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-extrabold text-zinc-500 uppercase block mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full bg-white border border-zinc-200 focus:border-black rounded-xl py-2 px-3 text-xs font-semibold text-zinc-950 focus:outline-none focus:ring-1 focus:ring-black"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-extrabold text-zinc-500 uppercase block mb-1">
                    Phone
                  </label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full bg-white border border-zinc-200 focus:border-black rounded-xl py-2 px-3 text-xs font-semibold text-zinc-950 focus:outline-none focus:ring-1 focus:ring-black"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-extrabold text-zinc-500 uppercase block mb-1">
                    Status
                  </label>
                  <select
                    value={editStatus}
                    onChange={(e) =>
                      setEditStatus(e.target.value as "Active" | "Inactive")
                    }
                    className="w-full bg-white border border-zinc-200 focus:border-black rounded-xl py-2 px-3 text-xs font-bold text-zinc-950 focus:outline-none focus:ring-1 focus:ring-black cursor-pointer"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-extrabold text-zinc-500 uppercase block mb-1">
                    Access Role
                  </label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value)}
                    className="w-full bg-white border border-zinc-200 focus:border-black rounded-xl py-2.5 px-3 text-xs font-bold text-zinc-950 focus:outline-none focus:ring-1 focus:ring-black cursor-pointer"
                  >
                    <option value="staff">Staff</option>
                    <option value="manager">Manager</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-extrabold text-zinc-500 uppercase block mb-1">
                    Roster Position
                  </label>
                  <select
                    value={editPosition}
                    onChange={(e) => setEditPosition(e.target.value)}
                    className="w-full bg-white border border-zinc-200 focus:border-black rounded-xl py-2.5 px-3 text-xs font-bold text-zinc-950 focus:outline-none focus:ring-1 focus:ring-black cursor-pointer"
                  >
                    <option value="">-- No Position --</option>
                    {positions.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-extrabold text-zinc-500 uppercase block mb-1">
                    Staff Priority (1-10)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={editPriority}
                    onChange={(e) => {
                      const val = Math.max(
                        1,
                        Math.min(10, Number(e.target.value) || 5),
                      );
                      setEditPriority(val);
                    }}
                    className="w-full bg-white border border-zinc-200 focus:border-black rounded-xl py-2 px-3 text-xs font-semibold text-zinc-950 focus:outline-none focus:ring-1 focus:ring-black"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-extrabold text-zinc-500 uppercase block mb-1">
                    Max Working Hours / Week
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 40 (leave empty for unlimited)"
                    value={editMaxHours}
                    onChange={(e) => {
                      const val =
                        e.target.value === ""
                          ? ""
                          : Math.max(0, Number(e.target.value));
                      setEditMaxHours(val);
                    }}
                    className="w-full bg-white border border-zinc-200 focus:border-black rounded-xl py-2 px-3 text-xs font-semibold text-zinc-950 focus:outline-none focus:ring-1 focus:ring-black"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-extrabold text-[#0F172A] uppercase tracking-wider block mb-1.5">
                  Assign Locations
                </label>
                <div className="border border-zinc-200 rounded-2xl p-4 max-h-[20vh] overflow-y-auto grid grid-cols-2 gap-2 bg-zinc-50/30">
                  {locations.map((loc) => (
                    <label
                      key={loc.id}
                      className="flex items-center gap-2 cursor-pointer select-none text-[11px] font-semibold text-zinc-700"
                    >
                      <input
                        type="checkbox"
                        checked={editLocations.includes(loc.id)}
                        onChange={() => handleToggleEditLocation(loc.id)}
                        className="h-3.5 w-3.5 rounded border-zinc-300 text-black focus:ring-black accent-black cursor-pointer"
                      />
                      <span className="truncate">{loc.name}</span>
                    </label>
                  ))}
                  {locations.length === 0 && (
                    <span className="text-zinc-400 italic text-xs col-span-2">
                      No locations available.
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setStaffToEdit(null);
                  }}
                  className="bg-white hover:bg-zinc-50 border border-zinc-200 text-zinc-700 rounded-xl py-3 text-xs font-bold uppercase tracking-wider transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmitEdit}
                  disabled={submittingEdit}
                  className="bg-black hover:bg-neutral-800 text-white rounded-xl py-3 text-xs font-bold uppercase tracking-wider shadow-md transition duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {submittingEdit ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-white" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface ActionsMenuProps {
  staff: Staff;
  onEdit: () => void;
  onToggleStatus: () => void;
}

function ActionsMenu({ staff, onEdit, onToggleStatus }: ActionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative inline-block text-left"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="p-1.5 hover:bg-zinc-100 rounded-lg text-zinc-500 hover:text-black transition cursor-pointer"
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      {isOpen && (
        <div className="absolute right-0 mt-1 w-36 bg-white border border-zinc-200 rounded-xl shadow-lg z-30 py-1 origin-top-right">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
              setIsOpen(false);
            }}
            className="flex items-center gap-2 px-3 py-2 text-xs text-zinc-700 hover:bg-zinc-50 hover:text-[#101010] w-full text-left cursor-pointer"
          >
            <Edit2 className="h-3.5 w-3.5 text-zinc-400" />
            Edit
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleStatus();
              setIsOpen(false);
            }}
            className="flex items-center gap-2 px-3 py-2 text-xs text-zinc-700 hover:bg-zinc-50 hover:text-[#101010] w-full text-left cursor-pointer"
          >
            {staff.status === "Active" ? (
              <>
                <UserX className="h-3.5 w-3.5 text-zinc-400" />
                Deactivate
              </>
            ) : (
              <>
                <UserCheck className="h-3.5 w-3.5 text-zinc-400" />
                Activate
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
