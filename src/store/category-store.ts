import { create } from "zustand";
import { Category } from "@/types/inventory";
import {
  createCategory,
  getCategories,
  updateCategory,
  deleteCategory,
} from "@/lib/repositories/category.repository";

interface CategoryState {
  categories: Category[];
  loading: boolean;
  error: string | null;
  fetchCategories: (businessId: string) => Promise<void>;
  addCategory: (
    businessId: string,
    data: Omit<Category, "id" | "createdAt" | "isActive">,
  ) => Promise<void>;
  updateCategory: (
    businessId: string,
    categoryId: string,
    data: Partial<Omit<Category, "id" | "createdAt" | "isActive">>,
  ) => Promise<void>;
  deleteCategory: (businessId: string, categoryId: string) => Promise<void>;
}

export const useCategoryStore = create<CategoryState>((set) => ({
  categories: [],
  loading: false,
  error: null,
  fetchCategories: async (businessId) => {
    set({ loading: true, error: null });
    try {
      const data = await getCategories(businessId);
      set({ categories: data, loading: false });
    } catch (err: unknown) {
      set({
        error: (err as Error).message || "Failed to load categories",
        loading: false,
      });
    }
  },
  addCategory: async (businessId, data) => {
    set({ loading: true, error: null });
    try {
      await createCategory(businessId, data);
      const updated = await getCategories(businessId);
      set({ categories: updated, loading: false });
    } catch (err: unknown) {
      set({
        error: (err as Error).message || "Failed to add category",
        loading: false,
      });
      throw err;
    }
  },
  updateCategory: async (businessId, categoryId, data) => {
    set({ loading: true, error: null });
    try {
      await updateCategory(businessId, categoryId, data);
      const updated = await getCategories(businessId);
      set({ categories: updated, loading: false });
    } catch (err: unknown) {
      set({
        error: (err as Error).message || "Failed to update category",
        loading: false,
      });
      throw err;
    }
  },
  deleteCategory: async (businessId, categoryId) => {
    set({ loading: true, error: null });
    try {
      await deleteCategory(businessId, categoryId);
      const updated = await getCategories(businessId);
      set({ categories: updated, loading: false });
    } catch (err: unknown) {
      set({
        error: (err as Error).message || "Failed to delete category",
        loading: false,
      });
      throw err;
    }
  },
}));
