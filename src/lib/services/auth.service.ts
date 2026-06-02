import { authClient } from "@/lib/auth/auth-client";

export const loginAdmin = async (email: string, password: string) => {
  const result = await authClient.signIn.email({
    email,
    password,
  });
  if (result.error) {
    throw new Error(result.error.message || "Invalid credentials");
  }
  if (result.data?.session?.token) {
    if (typeof window !== "undefined") {
      localStorage.setItem("stocktrack_token", result.data.session.token);
    }
  }
  return result.data;
};

export const registerAdmin = async (email: string, password: string, fullName: string) => {
  const result = await authClient.signUp.email({
    email,
    password,
    name: fullName,
  });
  if (result.error) {
    throw new Error(result.error.message || "Registration failed");
  }
  if (result.data?.session?.token) {
    if (typeof window !== "undefined") {
      localStorage.setItem("stocktrack_token", result.data.session.token);
    }
  }
  return result.data;
};

export const logoutUser = async () => {
  await authClient.signOut();
  if (typeof window !== "undefined") {
    localStorage.removeItem("stocktrack_token");
    localStorage.removeItem("stocktrack_active_business_id");
  }
};
