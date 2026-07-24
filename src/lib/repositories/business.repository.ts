import api from "../services/api";
import { Business } from "@/types/business";

interface BusinessApiResponse {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
  created_by_id: string;
  owner_name?: string;
  locations_count?: number;
  items_count?: number;
  terms_url?: string;
  terms_name?: string;
}

export const createBusinessAndLink = async (
  userId: string,
  name: string,
  options?: { termsUrl?: string; termsName?: string }
): Promise<Business> => {
  const response = await api.post<BusinessApiResponse>("/api/businesses", {
    name,
    terms_url: options?.termsUrl,
    terms_name: options?.termsName,
  });
  const data = response.data;
  return {
    id: data.id,
    name: data.name,
    isActive: data.is_active,
    createdAt: data.created_at,
    createdBy: data.created_by_id,
    ownerName: data.owner_name,
    locationsCount: data.locations_count ?? 0,
    itemsCount: data.items_count ?? 0,
    termsUrl: data.terms_url,
    termsName: data.terms_name,
  };
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
    ownerName: b.owner_name,
    locationsCount: b.locations_count ?? 0,
    itemsCount: b.items_count ?? 0,
    termsUrl: b.terms_url,
    termsName: b.terms_name,
  }));
};

export const updateBusiness = async (
  id: string,
  payload: {
    name?: string;
    isActive?: boolean;
    termsUrl?: string | null;
    termsName?: string | null;
  }
): Promise<Business> => {
  const response = await api.put<BusinessApiResponse>(`/api/businesses/${id}`, {
    name: payload.name,
    is_active: payload.isActive,
    terms_url: payload.termsUrl,
    terms_name: payload.termsName,
  });
  const b = response.data;
  return {
    id: b.id,
    name: b.name,
    isActive: b.is_active,
    createdAt: b.created_at,
    createdBy: b.created_by_id,
    ownerName: b.owner_name,
    locationsCount: b.locations_count ?? 0,
    itemsCount: b.items_count ?? 0,
    termsUrl: b.terms_url,
    termsName: b.terms_name,
  };
};
