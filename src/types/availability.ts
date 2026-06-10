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
