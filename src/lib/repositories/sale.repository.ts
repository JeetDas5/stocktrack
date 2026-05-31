import api from "../services/api";
import { Sale } from "@/types/inventory";

const mapSale = (s: any): Sale => ({
  id: s.id,
  saleNumber: s.sale_number,
  saleDate: s.sale_date,
  locationId: s.location_id || "",
  locationName: s.location_name || "",
  customerName: s.customer_name || "Walk-in Customer",
  paymentMethod: s.payment_method || "Cash",
  status: s.status,
  reference: s.reference || "",
  remarks: s.remarks || "",
  taxRate: s.tax_rate !== undefined ? s.tax_rate : 5.0,
  subtotalAmount: s.subtotal_amount || 0,

  taxAmount: s.tax_amount || 0,
  discountAmount: s.discount_amount || 0,
  totalAmount: s.total_amount || 0,
  createdAt: s.created_at || "",
  itemsCount: s.items_count !== undefined ? s.items_count : (s.items ? s.items.length : 0),
  items: (s.items || []).map((i: any) => ({
    id: i.id,
    recipeId: i.recipe_id,
    recipeName: i.recipe_name || "",
    recipeCode: i.recipe_code || "",
    quantity: i.quantity || 0,
    unitPrice: i.unit_price || 0,
    discountPercentage: i.discount_percentage || 0,
    totalAmount: i.total_amount || 0,
  })),
});

export const getSales = async (businessId: string): Promise<Sale[]> => {
  const response = await api.get(`/api/businesses/${businessId}/sales`);
  return response.data.map(mapSale);
};

export const getSale = async (
  businessId: string,
  saleId: string,
): Promise<Sale> => {
  const response = await api.get(
    `/api/businesses/${businessId}/sales/${saleId}`,
  );
  return mapSale(response.data);
};

export const createSale = async (
  businessId: string,
  data: {
    saleDate: string;
    locationId?: string;
    customerName?: string;
    paymentMethod?: string;
    reference?: string;
    remarks?: string;
    status: string;
    taxRate?: number;
    items: {
      recipeId: string;
      quantity: number;
      unitPrice: number;
      discountPercentage: number;
    }[];
  },
): Promise<Sale> => {
  const response = await api.post(`/api/businesses/${businessId}/sales`, {
    sale_date: data.saleDate,
    location_id: data.locationId || null,
    customer_name: data.customerName || "Walk-in Customer",
    payment_method: data.paymentMethod || "Cash",
    reference: data.reference || null,
    remarks: data.remarks || null,
    status: data.status,
    tax_rate: data.taxRate !== undefined ? data.taxRate : 5.0,
    items: data.items.map((i) => ({
      recipe_id: i.recipeId,
      quantity: i.quantity,
      unit_price: i.unitPrice,
      discount_percentage: i.discountPercentage,
    })),
  });
  return mapSale(response.data);
};

export const updateSale = async (
  businessId: string,
  saleId: string,
  data: {
    remarks?: string;
    status?: string;
  },
): Promise<Sale> => {
  const response = await api.put(
    `/api/businesses/${businessId}/sales/${saleId}`,
    {
      remarks: data.remarks !== undefined ? data.remarks : undefined,
      status: data.status !== undefined ? data.status : undefined,
    },
  );
  return mapSale(response.data);
};
