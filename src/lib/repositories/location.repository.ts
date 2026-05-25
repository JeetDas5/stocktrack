import {
  addDoc,
  collection,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";

import { db } from "@/lib/firebase/client";

import { COLLECTIONS } from "@/lib/constants/collections";

import { Location } from "@/types/inventory";

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
