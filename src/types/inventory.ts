export interface Category {
  id: string;
  businessId: string;
  name: string;
  description?: string;
  icon?: string;
  status: "active" | "inactive";
  isActive: boolean;
  createdAt: string;
  itemsCount?: number;
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

export interface LocationRule {
  id?: string;
  stockItemId?: string;
  locationId: string;
  locationName?: string;
  storageCapacity: number;
  storageCapacityUnit?: string;
  reorderLevel: number;
  reorderLevelUnit?: string;
}

export interface StockItem {
  id: string;
  businessId: string;
  categoryId: string;
  categoryName?: string;
  supplierId?: string;
  supplierName?: string;
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
  locationsCount?: number;
  locationRules?: LocationRule[];
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

export type OrderingMethod = "email" | "phone" | "website" | "manual";

export interface Supplier {
  id: string;
  businessId: string;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  stateProvince?: string;
  postalCode?: string;
  country: string;
  website?: string;
  notes?: string;
  orderingMethod?: OrderingMethod;
  isActive: boolean;
  createdAt: string;
}