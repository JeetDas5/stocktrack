import api from "../services/api";
import { Reconciliation, ReconciliationItem } from "@/types/reconciliation";

const mapReconciliationItem = (item: any): ReconciliationItem => ({
  id: item.id,
  itemId: item.item_id,
  itemName: item.item_name,
  itemSku: item.item_sku || "",
  categoryName: item.category_name || "Uncategorized",
  baseUnit: item.base_unit || "pcs",
  expectedQty: item.expected_qty || 0,
  actualQty: item.actual_qty || 0,
  varianceQty: item.variance_qty || 0,
  variancePercent: item.variance_percent || 0,
  varianceValue: item.variance_value || 0,
  status: item.status || "Matched",
});

const mapReconciliation = (rec: any): Reconciliation => ({
  id: rec.id,
  businessId: rec.business_id,
  locationId: rec.location_id || "",
  locationName: rec.location_name || "",
  reconciliationDate: rec.reconciliation_date,
  compareWith: rec.compare_with || "System (Expected)",
  status: rec.status || "Completed",
  totalItems: rec.total_items || 0,
  matchedItems: rec.matched_items || 0,
  varianceItems: rec.variance_items || 0,
  totalVarianceUsd: rec.total_variance_usd || 0,
  totalValueExpected: rec.total_value_expected || 0,
  totalValueActual: rec.total_value_actual || 0,
  positiveVarianceUsd: rec.positive_variance_usd || 0,
  negativeVarianceUsd: rec.negative_variance_usd || 0,
  createdAt: rec.created_at,
  items: (rec.items || []).map(mapReconciliationItem),
});

export const getReconciliations = async (businessId: string): Promise<Reconciliation[]> => {
  const response = await api.get(`/api/businesses/${businessId}/reconciliations`);
  return response.data.map(mapReconciliation);
};

export const getReconciliationDetail = async (
  businessId: string,
  id: string,
): Promise<Reconciliation> => {
  const response = await api.get(`/api/businesses/${businessId}/reconciliations/${id}`);
  return mapReconciliation(response.data);
};

export const runReconciliation = async (
  businessId: string,
  data: { locationId?: string; reconciliationDate: string; compareWith: string },
): Promise<Reconciliation> => {
  const response = await api.post(`/api/businesses/${businessId}/reconciliations`, {
    location_id: data.locationId || null,
    reconciliation_date: data.reconciliationDate,
    compare_with: data.compareWith,
  });
  return mapReconciliation(response.data);
};

export const getReconciliationPreview = async (
  businessId: string,
  params: { locationId?: string; date: string; compareWith: string },
): Promise<Reconciliation> => {
  const response = await api.get(`/api/businesses/${businessId}/reconciliations/preview`, {
    params: {
      location_id: params.locationId || null,
      date: params.date,
      compare_with: params.compareWith,
    },
  });
  return mapReconciliation(response.data);
};

export const deleteReconciliation = async (
  businessId: string,
  id: string,
): Promise<{ message: string }> => {
  const response = await api.delete(`/api/businesses/${businessId}/reconciliations/${id}`);
  return response.data;
};
