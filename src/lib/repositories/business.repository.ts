import {
  collection,
  addDoc,
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
} from "firebase/firestore";

import { db } from "../firebase/client";
import { COLLECTIONS } from "../constants/collections";
import { Business } from "@/types/business";

export const createBusinessAndLink = async (userId: string, name: string) => {
  const docRef = await addDoc(collection(db, COLLECTIONS.BUSINESSES), {
    name,
    createdBy: userId,
    isActive: true,
    createdAt: new Date().toISOString(),
  });

  const userRef = doc(db, "users", userId);
  await updateDoc(userRef, {
    businessIds: arrayUnion(docRef.id),
  });

  return { id: docRef.id, name };
};

export const getUserBusinesses = async (businessIds: string[]) => {
  if (!businessIds || businessIds.length === 0) return [];

  const promises = businessIds.map(async (id) => {
    const snap = await getDoc(doc(db, COLLECTIONS.BUSINESSES, id));
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() } as Business;
    }
    return null;
  });

  const results = await Promise.all(promises);
  return results.filter((b): b is Business => b !== null);
};