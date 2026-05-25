export interface Category {
  id: string;
  businessId: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
}

export type LocationType =
  | "warehouse"
  | "store"
  | "kitchen"
  | "cold_storage"
  | "other";

export interface Location {
  id: string;
  businessId: string;
  name: string;
  type: LocationType;
  description?: string;
  address?: string;
  isActive: boolean;
  createdAt: string;
}

export type BaseUnit =
  | "kg"
  | "L"
  | "pcs";

export interface StockItem {
  id: string;

  businessId: string;

  categoryId: string;

  name: string;

  sku?: string;

  imageUrl?: string;

  description?: string;

  baseUnit: BaseUnit;

  reorderLevelBaseQty: number;

  maxStockBaseQty: number;

  costPerBaseUnit?: number;

  isActive: boolean;

  createdAt: string;
}

export interface CountingOption {
  id: string;

  itemId: string;

  businessId: string;

  levelName: string;

  displayName: string;

  conversionToBaseQty: number;

  baseUnit: BaseUnit;

  sortOrder: number;

  showOnMobile: boolean;
}