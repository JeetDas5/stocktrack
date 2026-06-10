import { create } from "zustand";
import { AvailabilitySubmission, AvailabilityOverviewItem } from "@/types/availability";
import {
  getAvailability,
  submitAvailability,
  getAvailabilityOverview,
} from "@/lib/repositories/availability.repository";

interface AvailabilityState {
  submission: AvailabilitySubmission | null;
  overview: AvailabilityOverviewItem[];
  loading: boolean;
  error: string | null;
  fetchAvailability: (businessId: string, startDate: string) => Promise<void>;
  saveAvailability: (
    businessId: string,
    data: AvailabilitySubmission
  ) => Promise<void>;
  fetchOverview: (
    businessId: string,
    startDate: string,
    endDate: string,
    locationId?: string,
    shift?: string
  ) => Promise<void>;
  clearError: () => void;
}

export const useAvailabilityStore = create<AvailabilityState>((set) => ({
  submission: null,
  overview: [],
  loading: false,
  error: null,
  fetchAvailability: async (businessId, startDate) => {
    set({ loading: true, error: null });
    try {
      const data = await getAvailability(businessId, startDate);
      set({ submission: data, loading: false });
    } catch (err: unknown) {
      set({
        error: (err as Error).message || "Failed to fetch availability",
        loading: false,
      });
    }
  },
  saveAvailability: async (businessId, data) => {
    set({ loading: true, error: null });
    try {
      const saved = await submitAvailability(businessId, data);
      set({ submission: saved, loading: false });
    } catch (err: unknown) {
      set({
        error: (err as Error).message || "Failed to submit availability",
        loading: false,
      });
      throw err;
    }
  },
  fetchOverview: async (businessId, startDate, endDate, locationId, shift) => {
    set({ loading: true, error: null });
    try {
      const data = await getAvailabilityOverview(
        businessId,
        startDate,
        endDate,
        locationId,
        shift
      );
      set({ overview: data, loading: false });
    } catch (err: unknown) {
      set({
        error: (err as Error).message || "Failed to fetch overview",
        loading: false,
      });
    }
  },
  clearError: () => set({ error: null }),
}));
