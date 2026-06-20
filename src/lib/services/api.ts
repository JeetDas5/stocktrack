import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
});

api.interceptors.request.use(
  async (config) => {
    // Check if super admin has enabled read-only safety mode
    const isReadOnly =
      typeof window !== "undefined"
        ? localStorage.getItem("stocktrack_super_admin_readonly") === "true"
        : false;

    if (
      isReadOnly &&
      config.method &&
      ["post", "put", "delete", "patch"].includes(config.method.toLowerCase())
    ) {
      return Promise.reject(
        new Error(
          "Impersonation Read-Only Mode is active. Write operations are blocked."
        )
      );
    }

    const token = typeof window !== "undefined" ? localStorage.getItem("stocktrack_token") : null;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.data?.detail) {
      return Promise.reject(new Error(error.response.data.detail));
    }
    return Promise.reject(error);
  }
);

export default api;
