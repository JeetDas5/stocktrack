import api from "../services/api";
import { Business } from "@/types/business";

interface BusinessApiResponse {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
  created_by_id: string;
  locations_count?: number;
  items_count?: number;
}

export const createBusinessAndLink = async (
  userId: string,
  name: string,
): Promise<Pick<Business, "id" | "name">> => {
  const response = await api.post<BusinessApiResponse>("/api/businesses", { name });
  const data = response.data;
  return { id: data.id, name: data.name };
};

export const getUserBusinesses = async (
  _args?: any
): Promise<Business[]> => {
  const response = await api.get<BusinessApiResponse[]>("/api/businesses");
  return response.data.map((b) => ({
    id: b.id,
    name: b.name,
    isActive: b.is_active,
    createdAt: b.created_at,
    createdBy: b.created_by_id,
    locationsCount: b.locations_count ?? 0,
    itemsCount: b.items_count ?? 0,
  }));
};

