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
