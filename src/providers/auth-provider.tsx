"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { AppUser } from "@/types/user";
import { getMeProfile } from "@/lib/repositories/user.repository";
import { logoutUser } from "@/lib/services/auth.service";

interface CustomUser {
  uid: string;
  email?: string;
  displayName?: string;
}

interface AuthContextType {
  user: CustomUser | null;
  profile: AppUser | null;
  loading: boolean;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  logout: async () => {},
  refreshProfile: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<CustomUser | null>(null);
  const [profile, setProfile] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  const initAuth = async () => {
    try {
      setLoading(true);
      const token = typeof window !== "undefined" ? localStorage.getItem("stocktrack_token") : null;
      if (!token) {
        setUser(null);
        setProfile(null);
        return;
      }

      const userProfile = await getMeProfile();
      if (!userProfile) {
        if (typeof window !== "undefined") {
          localStorage.removeItem("stocktrack_token");
        }
        setUser(null);
        setProfile(null);
        return;
      }

      setUser({
        uid: userProfile.uid,
        email: userProfile.email,
        displayName: userProfile.fullName,
      });
      setProfile(userProfile);
    } catch (error) {
      console.error("Auth provider initialization error:", error);
      setUser(null);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await logoutUser();
    setUser(null);
    setProfile(null);
  };

  useEffect(() => {
    initAuth();
  }, []);

  const refreshProfile = async () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("stocktrack_token") : null;
    if (!token) return;
    try {
      const userProfile = await getMeProfile();
      if (userProfile) {
        setProfile(userProfile);
        setUser({
          uid: userProfile.uid,
          email: userProfile.email,
          displayName: userProfile.fullName,
        });
      }
    } catch (error) {
      console.error("Error refreshing profile:", error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
