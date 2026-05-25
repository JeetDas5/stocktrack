import {
  addDoc,
  collection,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";

import { db } from "@/lib/firebase/client";

import { COLLECTIONS } from "@/lib/constants/collections";

import { Category } from "@/types/inventory";

export const createCategory = async (
  businessId: string,
  data: Omit<Category, "id" | "createdAt">,
) => {
  return addDoc(
    collection(db, COLLECTIONS.BUSINESSES, businessId, COLLECTIONS.CATEGORIES),
    {
      ...data,
      createdAt: serverTimestamp(),
    },
  );
};

export const getCategories = async (businessId: string) => {
  const snapshot = await getDocs(
    collection(db, COLLECTIONS.BUSINESSES, businessId, COLLECTIONS.CATEGORIES),
  );

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Category[];
};
