export interface Business {
  id: string;
  name: string;
  logoUrl?: string;
  createdBy: string;
  createdAt: string;
  isActive: boolean;
  locationsCount?: number;
  itemsCount?: number;
}

export interface BusinessUser {
  id: string;
  businessId: string;
  userId: string;
  role: string;
  joinedAt: string;
  isActive: boolean;
}
