import { create } from "zustand";

interface BusinessStore {
  activeBusinessId: string | null;
  setActiveBusiness: (id: string) => void;
}

const getInitialBusinessId = (): string | null => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("stocktrack_active_business_id");
};

export const useBusinessStore = create<BusinessStore>((set) => ({
  activeBusinessId: getInitialBusinessId(),

  setActiveBusiness: (id) =>
    set({
      activeBusinessId: id,
    }),
}));