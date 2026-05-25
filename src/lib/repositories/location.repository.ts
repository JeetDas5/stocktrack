import {
  addDoc,
  collection,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";

import { db } from "@/lib/firebase/client";
import { Location } from "@/types/inventory";
import { COLLECTIONS } from "@/lib/constants/collections";

export const createLocation = async (
  businessId: string,
  data: Omit<Location, "id" | "createdAt">,
) => {
  return addDoc(
    collection(db, COLLECTIONS.BUSINESSES, businessId, COLLECTIONS.LOCATIONS),
    {
      ...data,
      createdAt: serverTimestamp(),
    },
  );
};

export const getLocations = async (businessId: string) => {
  const snapshot = await getDocs(
    collection(db, COLLECTIONS.BUSINESSES, businessId, COLLECTIONS.LOCATIONS),
  );

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Location[];
};

export const updateLocation = async (
  businessId: string,
  locationId: string,
  data: Partial<Omit<Location, "id" | "createdAt">>,
) => {
  const docRef = doc(
    db,
    COLLECTIONS.BUSINESSES,
    businessId,
    COLLECTIONS.LOCATIONS,
    locationId
  );
  return updateDoc(docRef, data);
};

export const deleteLocation = async (
  businessId: string,
  locationId: string,
) => {
  const docRef = doc(
    db,
    COLLECTIONS.BUSINESSES,
    businessId,
    COLLECTIONS.LOCATIONS,
    locationId
  );
  return deleteDoc(docRef);
};
