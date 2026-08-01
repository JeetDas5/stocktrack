import api from "../services/api";
import { Delivery } from "@/types/inventory";

const mapDelivery = (d: any): Delivery => ({
  id: d.id,
  deliveryNumber: d.delivery_number,
  poNumber: d.po_number,
  purchaseOrderId: d.purchase_order_id,
  supplierId: d.supplier_id,
  supplierName: d.supplier_name,
  status: d.status,
  deliveryDate: d.delivery_date,
  totalAmount: d.total_amount,
  notes: d.notes || "",
  itemsCount: d.items_count !== undefined ? d.items_count : (d.items ? d.items.length : 0),
  items: (d.items || []).map((i: any) => ({
    id: i.id,
    stockItemId: i.stock_item_id,
    stockItemName: i.stock_item_name,
    sku: i.sku || "",
    orderedQuantity: i.ordered_quantity || 0,
    receivedQuantity: i.received_quantity || 0,
    unitCost: i.unit_cost || 0,
    totalCost: i.total_cost || 0,
  })),
});

export const getDeliveries = async (
  businessId: string,
): Promise<Delivery[]> => {
  const response = await api.get(
    `/api/businesses/${businessId}/deliveries`,
  );
  return response.data.map(mapDelivery);
};

export const getDelivery = async (
  businessId: string,
  deliveryId: string,
): Promise<Delivery> => {
  const response = await api.get(
    `/api/businesses/${businessId}/deliveries/${deliveryId}`,
  );
  return mapDelivery(response.data);
};

export const createDelivery = async (
  businessId: string,
  data: {
    purchaseOrderId: string;
    receivingLocationId?: string;
    notes?: string;
    items: {
      stockItemId: string;
      orderedQuantity: number;
      receivedQuantity: number;
      unitCost: number;
    }[];
  },
): Promise<Delivery> => {
  const response = await api.post(
    `/api/businesses/${businessId}/deliveries`,
    {
      purchase_order_id: data.purchaseOrderId,
      receiving_location_id: data.receivingLocationId || null,
      notes: data.notes || null,
      items: data.items.map((i) => ({
        stock_item_id: i.stockItemId,
        ordered_quantity: i.orderedQuantity,
        received_quantity: i.receivedQuantity,
        unit_cost: i.unitCost,
      })),
    },
  );
  return mapDelivery(response.data);
};

