import api from "../services/api";
import { Location } from "@/types/inventory";

export const createLocation = async (
  businessId: string,
  data: Omit<Location, "id" | "createdAt">,
) => {
  const response = await api.post(`/api/businesses/${businessId}/locations`, {
    name: data.name,
    description: data.description || "",
    type: data.type || "store",
    address: data.address || "",
    is_warehouse: data.isWarehouse || false,
    is_global: data.isGlobal || false,
    is_active: data.isActive !== false,
  });
  return response.data;
};

export const getLocations = async (businessId: string) => {
  const response = await api.get(`/api/businesses/${businessId}/locations`);
  const data = response.data;
  return data.map((l: any) => ({
    id: l.id,
    name: l.name,
    description: l.description || "",
    type: l.type || "store",
    address: l.address || "",
    isWarehouse: l.is_warehouse || l.type === "warehouse",
    isGlobal: l.is_global || false,
    isActive: l.is_active !== false,
    createdAt: l.created_at,
    businessId: l.business_id,
  })) as Location[];
};

export const updateLocation = async (
  businessId: string,
  locationId: string,
  data: Partial<Omit<Location, "id" | "createdAt">>,
) => {
  const response = await api.put(
    `/api/businesses/${businessId}/locations/${locationId}`,
    {
      name: data.name,
      description: data.description || "",
      type: data.type || "store",
      address: data.address || "",
      is_warehouse: data.isWarehouse || false,
      is_global: data.isGlobal || false,
      is_active: data.isActive !== false,
    }
  );
  return response.data;
};


export const deleteLocation = async (
  businessId: string,
  locationId: string,
) => {
  const response = await api.delete(
    `/api/businesses/${businessId}/locations/${locationId}`
  );
  return response.data;
};

