export interface ReconciliationItem {
  id?: string;
  itemId: string;
  itemName: string;
  itemSku?: string;
  categoryName: string;
  baseUnit: string;
  expectedQty: number;
  actualQty: number;
  varianceQty: number;
  variancePercent: number;
  varianceValue: number;
  status: "Matched" | "Variance";
}

export interface Reconciliation {
  id?: string;
  businessId: string;
  locationId?: string;
  locationName?: string;
  reconciliationDate: string;
  compareWith: string;
  status: string;
  totalItems: number;
  matchedItems: number;
  varianceItems: number;
  totalVarianceUsd: number;
  totalValueExpected: number;
  totalValueActual: number;
  positiveVarianceUsd: number;
  negativeVarianceUsd: number;
  createdAt?: string;
  items?: ReconciliationItem[];
}
