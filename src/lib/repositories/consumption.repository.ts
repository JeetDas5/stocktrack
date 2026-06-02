import api from "../services/api";

export interface ConsumptionSummary {
  total_consumption: number;
  total_value: number;
  items_consumed_count: number;
  vs_yesterday_pct: number;
  vs_yesterday_units: number;
}

export interface ConsumptionTimelinePoint {
  label: string;
  consumed: number;
  value: number;
}

export interface ConsumptionItem {
  id: string;
  name: string;
  sku: string;
  category: string;
  category_icon?: string;
  base_unit: string;
  consumed_qty: number;
  value: number;
  opening_stock: number;
  deliveries: number;
  closing_stock: number;
  pct_of_total: number;
  image_url?: string;
}

export interface ConsumptionAnalysisResponse {
  summary: ConsumptionSummary;
  timeline: ConsumptionTimelinePoint[];
  items: ConsumptionItem[];
}

export interface ConsumptionParams {
  period?: "daily" | "weekly" | "monthly" | "custom";
  start_date?: string;
  end_date?: string;
  location_id?: string;
  category_id?: string;
  stock_item_id?: string;
  group_by?: "none" | "category";
  show?: "all" | "top_consumed";
}

export const getConsumptionAnalysis = async (
  businessId: string,
  params: ConsumptionParams = {}
): Promise<ConsumptionAnalysisResponse> => {
  const cleanParams = Object.fromEntries(
    Object.entries(params).filter(([_, v]) => v !== undefined && v !== "")
  );
  const response = await api.get(`/api/businesses/${businessId}/consumption`, {
    params: cleanParams,
  });
  return response.data;
};
