import { create } from "zustand";
import { Sale } from "@/types/inventory";
import {
  createSale,
  getSales,
  updateSale,
} from "@/lib/repositories/sale.repository";

interface SaleState {
  sales: Sale[];
  loading: boolean;
  error: string | null;
  fetchSales: (businessId: string) => Promise<void>;
  addSale: (
    businessId: string,
    data: {
      saleDate: string;
      locationId?: string;
      customerName?: string;
      paymentMethod?: string;
      reference?: string;
      remarks?: string;
      status: string;
      taxRate?: number;
      items: {
        recipeId: string;
        quantity: number;
        unitPrice: number;
        discountPercentage: number;
      }[];
    },
  ) => Promise<Sale>;
  updateSaleStatus: (
    businessId: string,
    saleId: string,
    status: string,
  ) => Promise<void>;
}

export const useSaleStore = create<SaleState>((set) => ({
  sales: [],
  loading: false,
  error: null,
  fetchSales: async (businessId) => {
    set({ loading: true, error: null });
    try {
      const data = await getSales(businessId);
      set({ sales: data, loading: false });
    } catch (err: unknown) {
      set({
        error: (err as Error).message || "Failed to load sales",
        loading: false,
      });
    }
  },
  addSale: async (businessId, data) => {
    set({ loading: true, error: null });
    try {
      const newSale = await createSale(businessId, data);
      const updated = await getSales(businessId);
      set({ sales: updated, loading: false });
      return newSale;
    } catch (err: unknown) {
      set({
        error: (err as Error).message || "Failed to add sale",
        loading: false,
      });
      throw err;
    }
  },
  updateSaleStatus: async (businessId, saleId, status) => {
    set({ loading: true, error: null });
    try {
      await updateSale(businessId, saleId, { status });
      const updated = await getSales(businessId);
      set({ sales: updated, loading: false });
    } catch (err: unknown) {
      set({
        error: (err as Error).message || "Failed to update sale status",
        loading: false,
      });
      throw err;
    }
  },
}));
