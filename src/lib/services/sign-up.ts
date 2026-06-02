import { authClient } from "@/lib/auth/auth-client";

export const signUpWithEmailAndPassword = async (email: string, password: string, name: string) => {
  return await authClient.signUp.email({
    email,
    password,
    name,
    callbackURL: "/dashboard/business",
  });
};
