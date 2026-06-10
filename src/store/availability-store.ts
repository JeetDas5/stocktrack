import { create } from "zustand";
import { AvailabilitySubmission } from "@/types/availability";
import {
  getAvailability,
  submitAvailability,
} from "@/lib/repositories/availability.repository";

interface AvailabilityState {
  submission: AvailabilitySubmission | null;
  loading: boolean;
  error: string | null;
  fetchAvailability: (businessId: string, startDate: string) => Promise<void>;
  saveAvailability: (
    businessId: string,
    data: AvailabilitySubmission,
  ) => Promise<void>;
  clearError: () => void;
}

export const useAvailabilityStore = create<AvailabilityState>((set) => ({
  submission: null,
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
  clearError: () => set({ error: null }),
}));
