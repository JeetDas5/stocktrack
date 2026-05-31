export type UserRole = "admin" | "staff";

export interface User {
  id: string;
  phone: string;
  fullName: string;
  role: UserRole;
  createdAt: string;
}

export interface Business {
  id: string;
  name: string;
  createdAt: string;
  createdBy: string;
}

export interface Location {
  id: string;
  businessId: string;
  name: string;
  type: "store" | "warehouse" | "kitchen";
}

export interface StockItem {
  id: string;
  businessId: string;
  categoryId: string;
  itemName: string;
  baseUnit: "kg" | "L" | "pcs";
}
