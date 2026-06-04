"use client";

import { Business } from "@/types/business";
import { useEffect, useState } from "react";
import { useAuth } from "@/providers/auth-provider";
import { useBusinessStore } from "@/store/business-store";
import { useLocationStore } from "@/store/location-store";
import { Location, LocationType } from "@/types/inventory";
import { getUserBusinesses } from "@/lib/repositories/business.repository";
import {
  MapPin,
  Building2,
  Plus,
  Search,
  ChevronDown,
  X,
  Loader2,
  Home,
  Store,
  Flame,
  Snowflake,
  Layers,
  Trash2,
  Edit2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import AlertDialog from "@/components/alert-dialog";

export default function LocationsPage() {
  const { activeBusinessId } = useBusinessStore();
  const { profile } = useAuth();
  const {
    locations,
    loading: locationsLoading,
    fetchLocations,
    addLocation,
    updateLocation,
    deleteLocation,
  } = useLocationStore();

  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [activeBusiness, setActiveBusiness] = useState<Business | null>(null);
  const [loadingContext, setLoadingContext] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const [showDrawer, setShowDrawer] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formType, setFormType] = useState<LocationType>("store");
  const [formAddress, setFormAddress] = useState("");
  const [formActive, setFormActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  useEffect(() => {
    if (!activeBusinessId) return;
    const businessId = activeBusinessId;

    async function loadContext() {
      try {
        setLoadingContext(true);
        await fetchLocations(businessId);

        const list = await getUserBusinesses([]);
        setBusinesses(list);
        const activeDoc = list.find((b) => b.id === businessId) || null;
        setActiveBusiness(activeDoc);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingContext(false);
      }
    }

    loadContext();
  }, [activeBusinessId, profile, fetchLocations]);

  const openAddDrawer = () => {
    setEditId(null);
    setFormName("");
    setFormDescription("");
    setFormType("store");
    setFormAddress("");
    setFormActive(true);
    setShowDrawer(true);
  };

  const openEditDrawer = (loc: Location) => {
    setEditId(loc.id);
    setFormName(loc.name);
    setFormDescription(loc.description || "");
    setFormType(loc.type);
    setFormAddress(loc.address || "");
    setFormActive(loc.isActive !== false);
    setShowDrawer(true);
    setActiveMenuId(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = formName.trim();
    const trimmedAddress = formAddress.trim();

    if (!activeBusinessId || !trimmedName || !trimmedAddress) {
      toast.error("Please fill in all required fields.");
      return;
    }

    if (trimmedName.length > 100) {
      toast.error("Location name must be 100 characters or less.");
      return;
    }

    if (!/[a-zA-Z0-9]/.test(trimmedName)) {
      toast.error("Location name cannot contain only special characters.");
      return;
    }

    if (trimmedAddress.length < 3) {
      toast.error("Address must be at least 3 characters long.");
      return;
    }

    if (!/[a-zA-Z0-9]/.test(trimmedAddress)) {
      toast.error("Address cannot contain only special characters.");
      return;
    }

    try {
      setSaving(true);

      const locationData = {
        businessId: activeBusinessId,
        name: trimmedName,
        description: formDescription.trim(),
        type: formType,
        address: trimmedAddress,
        isActive: formActive,
      };

      if (editId) {
        await updateLocation(activeBusinessId, editId, locationData);
        toast.success("Location updated successfully!");
      } else {
        await addLocation(activeBusinessId, locationData);
        toast.success("Location created successfully!");
      }

      setShowDrawer(false);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to save location. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (locId: string) => {
    setActiveMenuId(null);
    setDeleteTarget(locId);
  };

  const handleConfirmDelete = async () => {
    if (!activeBusinessId || !deleteTarget) return;
    try {
      await deleteLocation(activeBusinessId, deleteTarget);
      toast.success("Location deleted successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete location.");
    } finally {
      setDeleteTarget(null);
    }
  };

  const getLocIcon = (type: LocationType) => {
    switch (type) {
      case "warehouse":
        return <Home className="h-5 w-5" />;
      case "store":
        return <Store className="h-5 w-5" />;
      case "kitchen":
        return <Flame className="h-5 w-5" />;
      case "cold_storage":
        return <Snowflake className="h-5 w-5" />;
      default:
        return <Layers className="h-5 w-5" />;
    }
  };

  const getLocTypeLabel = (type: LocationType) => {
    switch (type) {
      case "warehouse":
        return "Warehouse";
      case "store":
        return "Store";
      case "kitchen":
        return "Kitchen";
      case "cold_storage":
        return "Cold Storage";
      default:
        return "Other";
    }
  };

  const filteredLocations = locations.filter(
    (loc) =>
      loc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      loc.address?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  if (locationsLoading || loadingContext) {
    return (
      <div className="h-[75vh] flex flex-col items-center justify-center bg-white text-[#0F172A]">
        <Loader2 className="h-7 w-7 text-[#16A34A] animate-spin mb-3" />
        <span className="text-[#64748B] text-xs font-bold uppercase tracking-wider">
          Loading locations catalog...
        </span>
      </div>
    );
  }

  return (
    <div className="flex bg-white min-h-[80vh] relative select-none">
      <div className="flex-1 space-y-6 pr-0 lg:pr-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-zinc-200 pb-5">
          <div>
            <h1 className="text-3xl font-extrabold text-[#0F172A] tracking-tight">
              Locations
            </h1>
            <p className="text-[#64748B] text-xs font-bold mt-1.5">
              Manage all your locations. Add, edit, or remove locations.
            </p>
          </div>

          <button
            onClick={openAddDrawer}
            className="bg-[#16A34A] hover:bg-[#15803D] text-white rounded-xl px-5 py-2.5 text-xs font-bold uppercase tracking-wider shadow-sm flex items-center gap-2 cursor-pointer transition-all duration-200"
          >
            <Plus className="h-4 w-4 stroke-[3px]" />
            Add Location
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
          <div className="relative w-full sm:max-w-md">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
              <Search className="h-4 w-4" />
            </span>
            <input
              type="text"
              placeholder="Search locations..."
              className="w-full bg-white border border-zinc-200 focus:border-[#16A34A] rounded-xl py-2.5 pl-10 pr-4 text-xs text-zinc-950 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-[#16A34A] transition-all shadow-xs"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0 bg-white border border-zinc-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-zinc-700 shadow-xs cursor-pointer hover:bg-zinc-50">
            <Building2 className="h-4 w-4 text-zinc-400" />
            <span>{activeBusiness?.name || "Venue"}</span>
          </div>
        </div>

        {filteredLocations.length === 0 ? (
          <div className="bg-white border border-zinc-200 rounded-2xl py-20 px-6 text-center flex flex-col items-center justify-center shadow-sm">
            <MapPin className="h-10 w-10 text-zinc-300 mb-3" />
            <h3 className="text-base font-bold text-[#0F172A]">
              No locations found
            </h3>
            <p className="text-[#64748B] text-xs mt-1 font-semibold max-w-xs leading-relaxed">
              No registered location profiles match your criteria. Click + Add
              Location to begin.
            </p>
          </div>
        ) : (
          <div className="bg-white border border-zinc-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-200 text-[10px] uppercase font-extrabold tracking-wider text-[#64748B] bg-zinc-50/50">
                    <th className="py-4 px-6 font-extrabold">Location Name</th>
                    <th className="py-4 px-6 font-extrabold">Business</th>
                    <th className="py-4 px-6 font-extrabold">Location Type</th>
                    <th className="py-4 px-6 font-extrabold">Address</th>
                    <th className="py-4 px-6 font-extrabold">Status</th>
                    <th className="py-4 px-6 font-extrabold text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 text-xs text-[#0F172A]">
                  {filteredLocations.map((loc) => (
                    <tr
                      key={loc.id}
                      className="hover:bg-zinc-50/40 transition-colors"
                    >
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3.5">
                          <div className="h-10 w-10 rounded-full bg-[#DCFCE7] text-[#16A34A] flex items-center justify-center shrink-0 border border-[#16A34A]/10 shadow-sm">
                            {getLocIcon(loc.type)}
                          </div>
                          <div>
                            <p className="font-extrabold text-[#0F172A]">
                              {loc.name.length > 30
                                ? loc.name.substring(0, 30) + "..."
                                : loc.name}
                            </p>
                            <p className="text-[10px] text-[#64748B] font-bold mt-0.5">
                              {loc.description
                                ? loc.description.length > 50
                                  ? loc.description.substring(0, 50) + "..."
                                  : loc.description
                                : "No description provided"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6 font-bold text-[#64748B]">
                        {activeBusiness?.name || "Active"}
                      </td>
                      <td className="py-4 px-6">
                        <span className="bg-zinc-100 text-[#0F172A] px-2.5 py-1 rounded-md font-bold text-[10px] uppercase tracking-wider">
                          {getLocTypeLabel(loc.type)}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-[#64748B] font-bold max-w-xs truncate">
                        {loc.address}
                      </td>
                      <td className="py-4 px-6">
                        <span
                          className={`text-[10px] uppercase font-extrabold px-3 py-1 rounded-full flex items-center gap-1.5 border shadow-2xs leading-none w-fit ${
                            loc.isActive !== false
                              ? "bg-[#DCFCE7] text-[#16A34A] border-[#16A34A]/10"
                              : "bg-zinc-100 text-[#64748B] border-zinc-200"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                              loc.isActive !== false
                                ? "bg-[#16A34A]"
                                : "bg-[#64748B]"
                            }`}
                          />
                          {loc.isActive !== false ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditDrawer(loc)}
                            className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-500 hover:text-[#16A34A] transition-colors cursor-pointer inline-flex items-center justify-center"
                            title="Edit Details"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(loc.id)}
                            className="p-1.5 rounded-lg hover:bg-rose-50 text-zinc-500 hover:text-[#EF4444] transition-colors cursor-pointer inline-flex items-center justify-center"
                            title="Delete Location"
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
                Showing 1 to {filteredLocations.length} of {locations.length}{" "}
                locations
              </span>
              <div className="flex items-center gap-2">
                <button
                  className="p-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-400 disabled:opacity-40"
                  disabled
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="h-8 w-8 bg-[#16A34A] text-white flex items-center justify-center rounded-lg font-bold">
                  1
                </span>
                <button
                  className="p-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-400 disabled:opacity-40"
                  disabled
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {showDrawer && (
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
                    {editId ? "Edit Location" : "Add Location"}
                  </h3>
                  <p className="text-[#64748B] text-xs font-semibold mt-1">
                    Enter the basic details for the location profile.
                  </p>
                </div>
                <button
                  onClick={() => setShowDrawer(false)}
                  className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#0F172A] uppercase tracking-wider block">
                    Business *
                  </label>
                  <div className="relative">
                    <select
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-2.5 px-3.5 text-xs text-[#0F172A] font-bold appearance-none cursor-not-allowed"
                      disabled
                      value={activeBusinessId || ""}
                    >
                      <option value={activeBusinessId || ""}>
                        {activeBusiness?.name || "Select business"}
                      </option>
                    </select>
                    <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#0F172A] uppercase tracking-wider block">
                    Location Name *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={100}
                    placeholder="Enter location name"
                    className="w-full bg-white border border-zinc-300 focus:border-[#16A34A] rounded-xl py-2.5 px-3.5 text-xs text-zinc-950 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-[#16A34A] transition-all"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#0F172A] uppercase tracking-wider block">
                    Description
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Retail outlet, main storage"
                    className="w-full bg-white border border-zinc-300 focus:border-[#16A34A] rounded-xl py-2.5 px-3.5 text-xs text-zinc-950 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-[#16A34A] transition-all"
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#0F172A] uppercase tracking-wider block">
                    Location Type *
                  </label>
                  <div className="relative">
                    <select
                      className="w-full bg-white border border-zinc-300 focus:border-[#16A34A] rounded-xl py-2.5 px-3.5 text-xs text-zinc-950 focus:outline-none focus:ring-1 focus:ring-[#16A34A] appearance-none cursor-pointer font-bold"
                      value={formType}
                      onChange={(e) =>
                        setFormType(e.target.value as LocationType)
                      }
                    >
                      <option value="store">Store</option>
                      <option value="warehouse">Warehouse</option>
                      <option value="kitchen">Kitchen</option>
                      <option value="cold_storage">Cold Storage</option>
                    </select>
                    <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-[#0F172A] uppercase tracking-wider block">
                      Address *
                    </label>
                    <span className="text-[10px] font-bold text-[#64748B]">
                      {formAddress.length} / 250
                    </span>
                  </div>
                  <textarea
                    required
                    maxLength={250}
                    placeholder="Enter full address"
                    rows={4}
                    className="w-full bg-white border border-zinc-300 focus:border-[#16A34A] rounded-xl py-2.5 px-3.5 text-xs text-zinc-950 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-[#16A34A] transition-all resize-none"
                    value={formAddress}
                    onChange={(e) => setFormAddress(e.target.value)}
                  />
                </div>

                {editId && (
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
                      Location is active and visible
                    </label>
                  </div>
                )}
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
                onClick={handleSave}
                disabled={saving || !formName.trim() || !formAddress.trim()}
                className="bg-[#16A34A] hover:bg-[#15803D] text-white rounded-xl px-4 py-2.5 text-xs font-bold uppercase tracking-wider shadow-sm flex items-center gap-2 cursor-pointer transition-colors disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Location"
                )}
              </button>
            </div>
          </div>
        </>
      )}

      <AlertDialog
        open={deleteTarget !== null}
        variant="danger"
        title="Delete Location"
        description="Are you sure you want to delete this location? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
