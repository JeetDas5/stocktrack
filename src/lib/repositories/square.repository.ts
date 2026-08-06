import api from "../services/api";

export interface SquareStatusResponse {
  connected: boolean;
  merchant_id?: string;
  environment?: string;
  expires_at?: string;
  updated_at?: string;
}

export interface CatalogItemVariation {
  id: string;
  type: string;
  item_variation_data?: {
    name: string;
    pricing_type?: string;
    price_money?: {
      amount: number;
      currency: string;
    };
  };
}

export interface CatalogObject {
  id: string;
  type: string; // "ITEM", "CATEGORY", "TAX", "DISCOUNT", "IMAGE", etc.
  updated_at?: string;
  is_deleted?: boolean;
  present_at_all_locations?: boolean;
  item_data?: {
    name: string;
    description?: string;
    category_id?: string;
    variations?: CatalogItemVariation[];
  };
  category_data?: {
    name: string;
  };
  tax_data?: {
    name: string;
    calculation_phase?: string;
    inclusion_type?: string;
    percentage?: string;
    applies_to_custom_amounts?: boolean;
    enabled?: boolean;
  };
  discount_data?: {
    name: string;
    discount_type?: string;
    percentage?: string;
    amount_money?: {
      amount: number;
      currency: string;
    };
  };
  [key: string]: unknown;
}

export interface CatalogListResponse {
  objects?: CatalogObject[];
  errors?: Array<{
    category: string;
    code: string;
    detail: string;
  }>;
}

export const getSquareAuthorizeUrl = async (businessId: string): Promise<string> => {
  const response = await api.get(`/api/square/authorize-url`, {
    params: { business_id: businessId },
  });
  return response.data.authorize_url;
};

export const handleSquareCallback = async (
  businessId: string,
  code: string
): Promise<{ status: string; message: string; merchant_id?: string }> => {
  const response = await api.post(`/api/square/callback`, {
    business_id: businessId,
    code: code,
  });
  return response.data;
};

export const getSquareStatus = async (businessId: string): Promise<SquareStatusResponse> => {
  const response = await api.get(`/api/square/status`, {
    params: { business_id: businessId },
  });
  return response.data;
};

export const disconnectSquare = async (businessId: string): Promise<void> => {
  await api.post(`/api/square/disconnect?business_id=${businessId}`);
};

export const getSquareCatalog = async (
  businessId: string,
  types?: string
): Promise<CatalogListResponse> => {
  const params: Record<string, string> = { business_id: businessId };
  if (types) {
    params.types = types;
  }
  const response = await api.get(`/api/square/catalog`, { params });
  return response.data;
};

export interface SquareLocationAddress {
  address_line_1?: string;
  address_line_2?: string;
  locality?: string;
  administrative_district_level_1?: string;
  postal_code?: string;
  country?: string;
}

export interface SquareLocation {
  id: string;
  name: string;
  status: string;
  type?: string;
  timezone?: string;
  currency?: string;
  country?: string;
  merchant_id?: string;
  address?: SquareLocationAddress;
  [key: string]: unknown;
}

export interface LocationImportItemPreview {
  square_id: string;
  square_name: string;
  square_address?: string;
  square_status: string;
  square_type?: string;
  square_merchant_id?: string;
  mapped_name: string;
  mapped_address: string;
  mapped_type: string;
  mapped_is_warehouse: boolean;
  mapped_is_active: boolean;
  match_status: "new" | "duplicate";
  match_reason?: string;
  existing_location_id?: string;
  existing_location_name?: string;
  default_action: "create" | "update" | "skip";
}

export interface LocationImportPreviewResponse {
  entity_type: string;
  total_found: number;
  new_count: number;
  duplicate_count: number;
  items: LocationImportItemPreview[];
}

export interface ExecuteLocationImportItem {
  square_id: string;
  square_name?: string;
  mapped_name: string;
  mapped_address?: string;
  mapped_type: string;
  mapped_is_warehouse: boolean;
  mapped_is_active: boolean;
  action: "create" | "update" | "skip";
  existing_location_id?: string;
}

export interface SquareImportHistoryItem {
  id: string;
  business_id: string;
  user_id: string;
  entity_type: string;
  status: string;
  created_count: number;
  updated_count: number;
  skipped_count: number;
  field_mappings?: Record<string, unknown>;
  summary_log?: {
    items?: Array<{
      square_id?: string;
      location_id?: string;
      name?: string;
      action?: string;
    }>;
  };
  created_at: string;
}

export const getSquareLocations = async (
  businessId: string
): Promise<{ locations?: SquareLocation[] }> => {
  const response = await api.get(`/api/square/locations`, {
    params: { business_id: businessId },
  });
  return response.data;
};

export const previewSquareLocationImport = async (
  businessId: string
): Promise<LocationImportPreviewResponse> => {
  const response = await api.post(`/api/square/import/locations/preview`, null, {
    params: { business_id: businessId },
  });
  return response.data;
};

export const executeSquareLocationImport = async (
  businessId: string,
  items: ExecuteLocationImportItem[]
): Promise<{
  status: string;
  created_count: number;
  updated_count: number;
  skipped_count: number;
  history_id: string;
}> => {
  const response = await api.post(`/api/square/import/locations`, {
    business_id: businessId,
    items,
  });
  return response.data;
};

export const getSquareImportHistory = async (
  businessId: string
): Promise<{ history: SquareImportHistoryItem[] }> => {
  const response = await api.get(`/api/square/import/history`, {
    params: { business_id: businessId },
  });
  return response.data;
};

