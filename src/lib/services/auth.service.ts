import { signInWithEmailAndPassword, signOut } from "firebase/auth";

import { auth } from "../firebase/client";

export const loginAdmin = async (email: string, password: string) => {
  return signInWithEmailAndPassword(auth, email, password);
};

export const logoutUser = async () => {
  return signOut(auth);
};
