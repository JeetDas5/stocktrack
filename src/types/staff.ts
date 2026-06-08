import { Location } from "./inventory";

export interface Staff {
  id: string;
  businessId: string;
  name: string;
  phone: string;
  email: string;
  role: string;
  status: "Active" | "Inactive";
  createdAt: string;
  locations?: Location[];
}

export interface StaffCreateInput {
  name: string;
  phone: string;
  email: string;
  role: string;
  status: "Active" | "Inactive";
  locationIds: string[];
}
