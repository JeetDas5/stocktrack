import { create } from "zustand";
import { Location } from "@/types/inventory";
import {
  createLocation,
  getLocations,
  updateLocation,
  deleteLocation,
} from "@/lib/repositories/location.repository";

interface LocationState {
  locations: Location[];
  loading: boolean;
  error: string | null;
  activeLocationId: string | null;
  setActiveLocation: (id: string | null) => void;
  fetchLocations: (businessId: string) => Promise<void>;
  addLocation: (
    businessId: string,
    data: Omit<Location, "id" | "createdAt">,
  ) => Promise<void>;
  updateLocation: (
    businessId: string,
    locationId: string,
    data: Partial<Omit<Location, "id" | "createdAt">>,
  ) => Promise<void>;
  deleteLocation: (businessId: string, locationId: string) => Promise<void>;
  clearError: () => void;
}

export const useLocationStore = create<LocationState>((set) => ({
  locations: [],
  loading: false,
  error: null,
  activeLocationId: null,
  setActiveLocation: (id) => {
    set({ activeLocationId: id });
    if (typeof window !== "undefined") {
      if (id) {
        localStorage.setItem("stocktrack_active_location_id", id);
      } else {
        localStorage.removeItem("stocktrack_active_location_id");
      }
    }
  },
  fetchLocations: async (businessId) => {
    set({ loading: true, error: null });
    try {
      const data = await getLocations(businessId);
      set({ locations: data, loading: false });
    } catch (err: unknown) {
      set({
        error: (err as Error).message || "Failed to load locations",
        loading: false,
      });
    }
  },
  addLocation: async (businessId, data) => {
    set({ loading: true, error: null });
    try {
      await createLocation(businessId, data);
      const updated = await getLocations(businessId);
      set({ locations: updated, loading: false });
    } catch (err: unknown) {
      set({
        error: (err as Error).message || "Failed to add location",
        loading: false,
      });
      throw err;
    }
  },
  updateLocation: async (businessId, locationId, data) => {
    set({ loading: true, error: null });
    try {
      await updateLocation(businessId, locationId, data);
      const updated = await getLocations(businessId);
      set({ locations: updated, loading: false });
    } catch (err: unknown) {
      set({
        error: (err as Error).message || "Failed to update location",
        loading: false,
      });
      throw err;
    }
  },
  deleteLocation: async (businessId, locationId) => {
    set({ loading: true, error: null });
    try {
      await deleteLocation(businessId, locationId);
      const updated = await getLocations(businessId);
      set({ locations: updated, loading: false });
    } catch (err: unknown) {
      set({
        error: (err as Error).message || "Failed to delete location",
        loading: false,
      });
      throw err;
    }
  },
  clearError: () => set({ error: null }),
}));
