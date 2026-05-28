import api from "../services/api";
import { StockItem } from "@/types/inventory";

const mapStockItem = (item: any): StockItem => ({
  id: item.id,
  name: item.name,
  sku: item.sku || "",
  imageUrl: item.image_url || "",
  description: item.description || "",
  baseUnit: item.base_unit || "pcs",
  reorderLevelBaseQty: item.reorder_level_base_qty || 0,
  maxStockBaseQty: item.max_stock_base_qty || 0,
  costPerBaseUnit: item.cost_per_base_unit || 0,
  isActive: item.is_active !== false,
  categoryId: item.category_id || "",
  categoryName: item.category_name || "",
  supplierId: item.supplier_id || "",
  supplierName: item.supplier_name || "",
  businessId: item.business_id,
  createdAt: item.created_at,
  locationsCount: item.locations_count || 0,
  locationRules: (item.location_rules || []).map((r: any) => ({
    id: r.id,
    stockItemId: r.stock_item_id,
    locationId: r.location_id,
    locationName: r.location_name,
    storageCapacity: r.storage_capacity || 0,
    storageCapacityUnit: r.storage_capacity_unit || "",
    reorderLevel: r.reorder_level || 0,
    reorderLevelUnit: r.reorder_level_unit || "",
  })),
});

export const createStockItem = async (
  businessId: string,
  data: Omit<StockItem, "id" | "createdAt">,
) => {
  const response = await api.post(`/api/businesses/${businessId}/stock-items`, {
    name: data.name,
    sku: data.sku || "",
    image_url: data.imageUrl || "",
    description: data.description || "",
    base_unit: data.baseUnit || "pcs",
    reorder_level_base_qty: data.reorderLevelBaseQty || 0,
    max_stock_base_qty: data.maxStockBaseQty || 0,
    cost_per_base_unit: data.costPerBaseUnit || null,
    is_active: data.isActive !== false,
    category_id: data.categoryId || null,
    supplier_id: data.supplierId || null,
    location_rules: (data.locationRules || []).map((r) => ({
      location_id: r.locationId,
      storage_capacity: r.storageCapacity,
      storage_capacity_unit: r.storageCapacityUnit || null,
      reorder_level: r.reorderLevel,
      reorder_level_unit: r.reorderLevelUnit || null,
    })),
  });
  return mapStockItem(response.data);
};

export const getStockItems = async (businessId: string) => {
  const response = await api.get(`/api/businesses/${businessId}/stock-items`);
  return response.data.map(mapStockItem);
};

export const updateStockItem = async (
  businessId: string,
  itemId: string,
  data: Omit<StockItem, "id" | "createdAt">,
) => {
  const response = await api.put(`/api/businesses/${businessId}/stock-items/${itemId}`, {
    name: data.name,
    sku: data.sku || "",
    image_url: data.imageUrl || "",
    description: data.description || "",
    base_unit: data.baseUnit || "pcs",
    reorder_level_base_qty: data.reorderLevelBaseQty || 0,
    max_stock_base_qty: data.maxStockBaseQty || 0,
    cost_per_base_unit: data.costPerBaseUnit || null,
    is_active: data.isActive !== false,
    category_id: data.categoryId || null,
    supplier_id: data.supplierId || null,
    location_rules: (data.locationRules || []).map((r) => ({
      location_id: r.locationId,
      storage_capacity: r.storageCapacity,
      storage_capacity_unit: r.storageCapacityUnit || null,
      reorder_level: r.reorderLevel,
      reorder_level_unit: r.reorderLevelUnit || null,
    })),
  });
  return mapStockItem(response.data);
};

export const deleteStockItem = async (businessId: string, itemId: string) => {
  const response = await api.delete(`/api/businesses/${businessId}/stock-items/${itemId}`);
  return response.data;
};

export const getDashboardMetrics = async (businessId: string) => {
  const response = await api.get(`/api/businesses/${businessId}/dashboard-metrics`);
  return response.data;
};
