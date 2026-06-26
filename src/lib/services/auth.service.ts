import api from "./api";
import { authClient } from "@/lib/auth/auth-client";

export const loginAdmin = async (email: string, password: string) => {
  const result = await authClient.signIn.email({
    email,
    password,
  });
  if (result.error) {
    throw new Error(result.error.message || "Invalid credentials");
  }
  if (result.data?.token) {
    if (typeof window !== "undefined") {
      localStorage.setItem("nexbrix_token", result.data.token);
    }
  }
  return result.data;
};

export const registerAdmin = async (
  email: string,
  password: string,
  fullName: string,
) => {
  const result = await authClient.signUp.email({
    email,
    password,
    name: fullName,
  });
  if (result.error) {
    throw new Error(result.error.message || "Registration failed");
  }
  if (result.data?.token) {
    if (typeof window !== "undefined") {
      localStorage.setItem("nexbrix_token", result.data.token);
    }
  }
  return result.data;
};

export const logoutUser = async () => {
  await authClient.signOut();
  if (typeof window !== "undefined") {
    localStorage.removeItem("nexbrix_token");
    localStorage.removeItem("nexbrix_active_business_id");
    localStorage.removeItem("nexbrix_active_location_id");
    localStorage.removeItem("nexbrix_impersonated_user_id");
    localStorage.removeItem("nexbrix_super_admin_readonly");
  }
};

export const sendOtp = async (email: string): Promise<{ message: string }> => {
  const response = await api.post("/api/auth/send-otp", { email });
  return response.data;
};

export const verifyOtp = async (
  email: string,
  otp: string,
): Promise<{ token: string; user: any }> => {
  const response = await api.post("/api/auth/verify-otp", { email, otp });
  if (response.data?.token) {
    if (typeof window !== "undefined") {
      localStorage.setItem("nexbrix_token", response.data.token);
    }
  }
  return response.data;
};
