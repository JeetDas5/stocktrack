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

export type BaseUnit = "kg" | "L" | "pcs";

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
  costPerBaseUnit?: number;
  currentStock?: number;
  deliveryPackaging?: string;
  isActive: boolean;
  createdAt: string;
  locationsCount?: number;
  locationRules?: LocationRule[];
  countingOptions?: CountingOption[];
}

export interface CountingOption {
  id?: string;
  itemId?: string;
  businessId?: string;
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

export interface RecipeIngredient {
  id?: string;
  recipeId?: string;
  itemId: string;
  itemName?: string;
  qtyUsed: number;
  unit: string;
  costPerUnit: number;
  totalCost: number;
}

export interface Recipe {
  id: string;
  businessId: string;
  recipeName: string;
  recipeCode?: string;
  categoryId?: string;
  categoryName?: string;
  yieldQty: number;
  yieldUnit: string;
  description?: string;
  status: "active" | "inactive";
  isActive: boolean;
  createdAt: string;
  ingredientsCount?: number;
  costPerServing?: number;
  ingredients: RecipeIngredient[];
}

export type StockCountStatus = "in_progress" | "completed";

export interface StockCountItem {
  id?: string;
  sessionId?: string;
  itemId: string;
  itemName?: string;
  itemSku?: string;
  baseUnit?: string;
  expectedQty: number;
  countedCartons?: number;
  countedPieces?: number;
  countedQty?: number;
  variance?: number;
  costVariance?: number;
  notes?: string;
}

export interface StockCountSession {
  id: string;
  businessId: string;
  locationId?: string;
  locationName?: string;
  countType: string;
  countDate: string;
  countedByName: string;
  status: StockCountStatus;
  notes?: string;
  createdAt: string;
  completedAt?: string;
  itemsCount?: number;
  totalVariance?: number;
  items?: StockCountItem[];
}

export interface RefillSuggestion {
  stockItemId: string;
  stockItemName: string;
  sku: string;
  categoryName: string;
  supplierId?: string;
  supplierName: string;
  locationId?: string;
  locationName: string;
  currentStock: number;
  capacity: number;
  reorderLevel: number;
  toRefill: number;
  costPerBaseUnit: number;
  estCost: number;
}

export interface PurchaseOrderItem {
  id?: string;
  stockItemId: string;
  stockItemName?: string;
  sku?: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  status: "draft" | "sent" | "completed";
  createdAt: string;
  totalAmount: number;
  notes?: string;
  items: PurchaseOrderItem[];
}
