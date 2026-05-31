import api from "../services/api";
import { StockItem } from "@/types/inventory";

const mapStockItem = (item: any): StockItem => ({
  id: item.id,
  name: item.name,
  sku: item.sku || "",
  imageUrl: item.image_url || "",
  description: item.description || "",
  baseUnit: item.base_unit || "pcs",
  costPerBaseUnit: item.cost_per_base_unit || 0,
  currentStock: item.current_stock || 0,
  deliveryPackaging: item.delivery_packaging || "",
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
    currentStock: r.current_stock || 0,
  })),

  countingOptions: (item.counting_options || []).map((co: any) => ({
    id: co.id,
    itemId: co.item_id,
    businessId: co.business_id,
    levelName: co.level_name,
    displayName: co.display_name || "",
    conversionToBaseQty: co.conversion_to_base_qty || 1,
    baseUnit: co.base_unit || "pcs",
    sortOrder: co.sort_order || 0,
    showOnMobile: co.show_on_mobile !== false,
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
    cost_per_base_unit: data.costPerBaseUnit || null,
    current_stock: data.currentStock || 0,
    delivery_packaging: data.deliveryPackaging || null,
    is_active: data.isActive !== false,
    category_id: data.categoryId || null,
    supplier_id: data.supplierId || null,
    location_rules: (data.locationRules || []).map((r) => ({
      location_id: r.locationId,
      storage_capacity: r.storageCapacity,
      storage_capacity_unit: r.storageCapacityUnit || null,
      reorder_level: r.reorderLevel,
      reorder_level_unit: r.reorderLevelUnit || null,
      current_stock: r.currentStock || 0,
    })),
    counting_options: (data.countingOptions || []).map((co) => ({
      level_name: co.levelName,
      display_name: co.displayName,
      conversion_to_base_qty: co.conversionToBaseQty,
      base_unit: co.baseUnit || "pcs",
      sort_order: co.sortOrder || 0,
      show_on_mobile: co.showOnMobile !== false,
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
    cost_per_base_unit: data.costPerBaseUnit || null,
    current_stock: data.currentStock || 0,
    delivery_packaging: data.deliveryPackaging || null,
    is_active: data.isActive !== false,
    category_id: data.categoryId || null,
    supplier_id: data.supplierId || null,
    location_rules: (data.locationRules || []).map((r) => ({
      location_id: r.locationId,
      storage_capacity: r.storageCapacity,
      storage_capacity_unit: r.storageCapacityUnit || null,
      reorder_level: r.reorderLevel,
      reorder_level_unit: r.reorderLevelUnit || null,
      current_stock: r.currentStock || 0,
    })),
    counting_options: (data.countingOptions || []).map((co) => ({
      level_name: co.levelName,
      display_name: co.displayName,
      conversion_to_base_qty: co.conversionToBaseQty,
      base_unit: co.baseUnit || "pcs",
      sort_order: co.sortOrder || 0,
      show_on_mobile: co.showOnMobile !== false,
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
