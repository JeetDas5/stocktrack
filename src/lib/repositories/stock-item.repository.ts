import {
  addDoc,
  collection,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";

import { db } from "@/lib/firebase/client";
import { COLLECTIONS } from "@/lib/constants/collections";
import { StockItem } from "@/types/inventory";

export const createStockItem = async (
  businessId: string,
  data: Omit<StockItem, "id" | "createdAt">,
) => {
  return addDoc(
    collection(db, COLLECTIONS.BUSINESSES, businessId, COLLECTIONS.STOCK_ITEMS),
    {
      ...data,
      createdAt: serverTimestamp(),
    },
  );
};

export const getStockItems = async (businessId: string) => {
  const snapshot = await getDocs(
    collection(db, COLLECTIONS.BUSINESSES, businessId, COLLECTIONS.STOCK_ITEMS),
  );

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as StockItem[];
};
