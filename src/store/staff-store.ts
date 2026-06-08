import { create } from "zustand";
import { Staff, StaffCreateInput } from "@/types/staff";
import {
  getStaffMembers,
  createStaff,
  updateStaff,
  deleteStaff,
} from "@/lib/repositories/staff.repository";

interface StaffState {
  staffMembers: Staff[];
  loading: boolean;
  error: string | null;
  fetchStaffMembers: (businessId: string) => Promise<void>;
  addStaff: (businessId: string, data: StaffCreateInput) => Promise<void>;
  updateStaff: (
    businessId: string,
    staffId: string,
    data: StaffCreateInput
  ) => Promise<void>;
  deleteStaff: (businessId: string, staffId: string) => Promise<void>;
  clearError: () => void;
}

export const useStaffStore = create<StaffState>((set) => ({
  staffMembers: [],
  loading: false,
  error: null,
  fetchStaffMembers: async (businessId) => {
    set({ loading: true, error: null });
    try {
      const data = await getStaffMembers(businessId);
      set({ staffMembers: data, loading: false });
    } catch (err: unknown) {
      set({
        error: (err as Error).message || "Failed to load staff members",
        loading: false,
      });
    }
  },
  addStaff: async (businessId, data) => {
    set({ loading: true, error: null });
    try {
      await createStaff(businessId, data);
      const updated = await getStaffMembers(businessId);
      set({ staffMembers: updated, loading: false });
    } catch (err: unknown) {
      set({
        error: (err as Error).message || "Failed to add staff member",
        loading: false,
      });
      throw err;
    }
  },
  updateStaff: async (businessId, staffId, data) => {
    set({ loading: true, error: null });
    try {
      await updateStaff(businessId, staffId, data);
      const updated = await getStaffMembers(businessId);
      set({ staffMembers: updated, loading: false });
    } catch (err: unknown) {
      set({
        error: (err as Error).message || "Failed to update staff member",
        loading: false,
      });
      throw err;
    }
  },
  deleteStaff: async (businessId, staffId) => {
    set({ loading: true, error: null });
    try {
      await deleteStaff(businessId, staffId);
      const updated = await getStaffMembers(businessId);
      set({ staffMembers: updated, loading: false });
    } catch (err: unknown) {
      set({
        error: (err as Error).message || "Failed to delete staff member",
        loading: false,
      });
      throw err;
    }
  },
  clearError: () => set({ error: null }),
}));
