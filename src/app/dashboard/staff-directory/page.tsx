"use client";

import { useEffect, useState } from "react";
import { useBusinessStore } from "@/store/business-store";
import { useLocationStore } from "@/store/location-store";
import { useStaffStore } from "@/store/staff-store";
import { getUserBusinesses } from "@/lib/repositories/business.repository";
import { Business } from "@/types/business";
import { Staff } from "@/types/staff";
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
} from "lucide-react";
import { toast } from "sonner";

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

  useEffect(() => {
    if (!activeBusinessId) return;
    const businessId = activeBusinessId;

    async function loadData() {
      try {
        setLoadingContext(true);
        await fetchStaffMembers(businessId);
        const bizList = await getUserBusinesses([]);
        setBusinesses(bizList);
        const currentBiz = bizList.find((b) => b.id === businessId) || null;
        setActiveBusiness(currentBiz);
      } catch (err: any) {
        toast.error(err.message || "Failed to load directory context.");
      } finally {
        setLoadingContext(false);
      }
    }

    loadData();
  }, [activeBusinessId, fetchStaffMembers]);

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
            View and manage all staff members.
          </p>
        </div>

        <div className="flex items-center gap-3 self-end lg:self-auto">
          <button
            onClick={() => toast.info("Feature is coming soon")}
            className="bg-[#16A34A] hover:bg-[#15803D] text-white rounded-xl px-5 py-2.5 text-xs font-bold uppercase tracking-wider shadow-sm flex items-center gap-2 cursor-pointer transition-all duration-200"
          >
            <Plus className="h-4 w-4 stroke-[3px]" />
            Add Staff
          </button>

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
        </div>
      </div>

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
    </div>
  );
}
