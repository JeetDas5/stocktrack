export interface RosterUser {
  id: string;
  name: string | null;
  email: string;
  role: string;
  priority: number;
  position: string | null;
  max_working_hours: number | null;
}

export interface RosterLocation {
  id: string;
  name: string;
}

export interface RosterShift {
  id: string;
  businessId: string;
  locationId: string;
  userId: string | null;
  date: string; // YYYY-MM-DD
  shiftName: string;
  timeFrom: string;
  timeTo: string;
  requiredCount: number;
  status: string; // draft or published
  createdAt: string;
  updatedAt: string;
  user?: RosterUser | null;
  location?: RosterLocation | null;
}

export interface RosterShiftCreateInput {
  id?: string;
  location_id: string;
  user_id: string | null;
  date: string;
  shift_name: string;
  time_from: string;
  time_to: string;
  required_count: number;
  status: string;
}
