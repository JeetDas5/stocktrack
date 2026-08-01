import api from "../services/api";
import { StockTransfer } from "@/types/inventory";

export interface TransferDispatchPayload {
  from_location_id: string;
  to_location_id: string;
  notes?: string;
  items: {
    stock_item_id: string;
    dispatched_qty: number;
  }[];
}

export interface TransferReceivePayload {
  notes?: string;
  items?: {
    stock_item_id: string;
    received_qty: number;
  }[];
}

export const dispatchStockTransfer = async (
  businessId: string,
  payload: TransferDispatchPayload
) => {
  const response = await api.post(
    `/api/businesses/${businessId}/stock-transfers/dispatch`,
    payload
  );
  return response.data;
};

export const receiveStockTransfer = async (
  businessId: string,
  transferId: string,
  payload?: TransferReceivePayload
) => {
  const response = await api.post(
    `/api/businesses/${businessId}/stock-transfers/${transferId}/receive`,
    payload || {}
  );
  return response.data;
};

export const getStockTransfers = async (
  businessId: string,
  statusFilter?: string
) => {
  const response = await api.get(
    `/api/businesses/${businessId}/stock-transfers`,
    {
      params: statusFilter ? { status_filter: statusFilter } : {},
    }
  );
  const data = response.data;
  return data.map((t: any) => ({
    id: t.id,
    transferNumber: t.transfer_number,
    fromLocationId: t.from_location_id,
    fromLocationName: t.from_location_name,
    toLocationId: t.to_location_id,
    toLocationName: t.to_location_name,
    status: t.status,
    dispatchedAt: t.dispatched_at,
    receivedAt: t.received_at,
    notes: t.notes,
    items: (t.items || []).map((it: any) => ({
      id: it.id,
      stockItemId: it.stock_item_id,
      stockItemName: it.stock_item_name,
      dispatchedQty: it.dispatched_qty,
      receivedQty: it.received_qty,
      unitCost: it.unit_cost,
    })),
  })) as StockTransfer[];
};
