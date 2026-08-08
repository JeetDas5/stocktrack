import { create } from "zustand";
import { TimesheetReport, TimesheetReportFilters } from "@/types/timesheet-report";
import { getTimesheetReports } from "@/lib/repositories/timesheet-report.repository";

interface TimesheetReportState {
  reports: TimesheetReport[];
  loading: boolean;
  error: string | null;
  filters: TimesheetReportFilters;
  setFilters: (filters: Partial<TimesheetReportFilters>) => void;
  fetchReports: (businessId: string) => Promise<void>;
  clearFilters: (defaultBusinessId: string) => void;
  updateReportPaidStatus: (timesheetId: string, isPaid: boolean) => void;
}

const getInitialFilters = (defaultBusinessId: string): TimesheetReportFilters => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const startDay = "01";
  const endDay = String(now.getDate()).padStart(2, "0");

  return {
    startDate: `${year}-${month}-${startDay}`,
    endDate: `${year}-${month}-${endDay}`,
    businessId: defaultBusinessId || "all",
    locationId: "all",
    staffId: "all",
    status: "all",
  };
};

export const useTimesheetReportStore = create<TimesheetReportState>((set, get) => ({
  reports: [],
  loading: false,
  error: null,
  filters: getInitialFilters("all"),

  setFilters: (newFilters) => {
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
    }));
  },

  fetchReports: async (businessId) => {
    set({ loading: true, error: null });
    try {
      const activeFilters = get().filters;
      const data = await getTimesheetReports(businessId, activeFilters);
      set({ reports: data, loading: false });
    } catch (err: unknown) {
      set({
        error: (err as Error).message || "Failed to fetch timesheet reports",
        loading: false,
      });
    }
  },

  clearFilters: (defaultBusinessId) => {
    set({
      filters: getInitialFilters(defaultBusinessId),
    });
  },

  updateReportPaidStatus: (timesheetId, isPaid) => {
    set((state) => ({
      reports: state.reports.map((r) =>
        r.id === timesheetId ? { ...r, isPaid } : r
      ),
    }));
  },
}));
