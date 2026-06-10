export interface LocationOut {
  id: string;
  name: string;
}

export interface AvailabilitySlot {
  id?: string;
  timeFrom: string;
  timeTo: string;
  locationId?: string;
  location?: LocationOut;
  note?: string;
}

export interface AvailabilityDay {
  id?: string;
  date: string;
  isAvailable: boolean;
  slots: AvailabilitySlot[];
}

export interface AvailabilitySubmission {
  id?: string;
  businessId?: string;
  userId?: string;
  startDate: string;
  endDate: string;
  periodType: "weekly" | "fortnightly";
  generalNote?: string;
  days: AvailabilityDay[];
  createdAt?: string;
  updatedAt?: string;
}

export interface OverviewStaffMember {
  id: string;
  name: string;
  priority: number;
  alreadyAssigned: number;
  workedPreviousDay: string;
}

export interface AvailabilityOverviewItem {
  date: string;
  day: string;
  locationId?: string;
  locationName: string;
  timeFrom: string;
  timeTo: string;
  shiftLabel: string;
  availableStaffCount: number;
  staffMembers: OverviewStaffMember[];
}
