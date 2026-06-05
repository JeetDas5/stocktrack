import api from "../services/api";
import { AppUser } from "@/types/user";

export const createUserProfile = async (user: AppUser) => {
  // Map uid to id for SQLModel schema
  const payload = {
    id: user.uid,
    email: user.email,
    name: user.fullName|| user.email || null,
  };
  const response = await api.post("/api/users", payload);
  return response.data;
};

export const getUserProfile = async (uid: string) => {
  try {
    const response = await api.get(`/api/users/${uid}`);
    const data = response.data;
    // Map id back to uid and name to fullName for Next.js frontend compatibility
    return {
      uid: data.id,
      email: data.email || "",
      displayName: data.name || "",
      fullName: data.name || "",
      name: data.name || "",
      role: "admin",
      isActive: true,
      businessIds: [],
      createdAt: data.created_at || new Date().toISOString(),
      last_login_at: new Date().toISOString(),
    } as unknown as AppUser;
  } catch (error: any) {
    if (error.response && error.response.status === 404) {
      return null;
    }
    throw error;
  }
};

export const getMeProfile = async () => {
  try {
    const response = await api.get("/api/users/me");
    const data = response.data;
    return {
      uid: data.id,
      email: data.email || "",
      displayName: data.name || "",
      fullName: data.name || "",
      name: data.name || "",
      role: "admin",
      isActive: true,
      businessIds: [],
      createdAt: data.created_at || new Date().toISOString(),
      last_login_at: new Date().toISOString(),
    } as unknown as AppUser;
  } catch (error: any) {
    if (error.response && (error.response.status === 401 || error.response.status === 404)) {
      return null;
    }
    throw error;
  }
};
export const getUserAssignments = async (businessId: string) => {
  const response = await api.get(`/api/businesses/${businessId}/users`);
  return response.data;
};

export const updateUserAssignment = async (businessId: string, assignmentId: string, payload: any) => {
  const response = await api.put(`/api/businesses/${businessId}/users/${assignmentId}`, payload);
  return response.data;
};

export const deleteUserAssignment = async (businessId: string, assignmentId: string) => {
  const response = await api.delete(`/api/businesses/${businessId}/users/${assignmentId}`);
  return response.data;
};
