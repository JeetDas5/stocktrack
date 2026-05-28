import api from "../services/api";
import { Category } from "@/types/inventory";

export const createCategory = async (
  businessId: string,
  data: Omit<Category, "id" | "createdAt" | "isActive">,
) => {
  const response = await api.post(`/api/businesses/${businessId}/categories`, {
    category_name: data.name,
    description: data.description,
    icon: data.icon,
    status: data.status,
  });
  const c = response.data;
  return {
    id: c.id,
    name: c.category_name,
    description: c.description,
    icon: c.icon,
    status: c.status,
    isActive: c.status === "active",
    createdAt: c.created_at,
    businessId: c.business_id,
    itemsCount: c.items_count,
  } as Category;
};

export const getCategories = async (businessId: string) => {
  const response = await api.get(`/api/businesses/${businessId}/categories`);
  const data = response.data;
  return data.map((c: any) => ({
    id: c.id,
    name: c.category_name,
    description: c.description,
    icon: c.icon,
    status: c.status,
    isActive: c.status === "active",
    createdAt: c.created_at,
    businessId: c.business_id,
    itemsCount: c.items_count,
  })) as Category[];
};

export const updateCategory = async (
  businessId: string,
  categoryId: string,
  data: Partial<Omit<Category, "id" | "createdAt" | "isActive">>,
) => {
  const response = await api.put(`/api/businesses/${businessId}/categories/${categoryId}`, {
    category_name: data.name,
    description: data.description,
    icon: data.icon,
    status: data.status,
  });
  const c = response.data;
  return {
    id: c.id,
    name: c.category_name,
    description: c.description,
    icon: c.icon,
    status: c.status,
    isActive: c.status === "active",
    createdAt: c.created_at,
    businessId: c.business_id,
    itemsCount: c.items_count,
  } as Category;
};

export const deleteCategory = async (businessId: string, categoryId: string) => {
  const response = await api.delete(`/api/businesses/${businessId}/categories/${categoryId}`);
  return response.data;
};
