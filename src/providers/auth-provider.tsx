"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { AppUser } from "@/types/user";
import { getMeProfile } from "@/lib/repositories/user.repository";
import { authClient } from "@/lib/auth/auth-client";

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
  const [session, setSession] = useState<{ user: any; session: any } | null>(null);
  const [profile, setProfile] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSession = async () => {
    try {
      setLoading(true);
      const res = await authClient.getSession();
      if (res?.data) {
        setSession(res.data);
      } else {
        setSession(null);
      }
    } catch (err) {
      console.error("Error fetching Better Auth session:", err);
      setSession(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSession();
  }, []);

  const user = session?.user ? {
    uid: session.user.id,
    email: session.user.email,
    displayName: session.user.name,
  } : null;

  useEffect(() => {
    if (session?.session?.token) {
      localStorage.setItem("stocktrack_token", session.session.token);
    } else if (session === null) {
      localStorage.removeItem("stocktrack_token");
      localStorage.removeItem("stocktrack_active_business_id");
      setProfile(null);
    }
  }, [session]);

  const refreshProfile = async () => {
    if (!session?.user) return;
    try {
      const userProfile = await getMeProfile();
      if (userProfile) {
        setProfile(userProfile);
      }
    } catch (error) {
      console.error("Error refreshing profile:", error);
    }
  };

  useEffect(() => {
    if (session?.user) {
      refreshProfile();
    } else {
      setProfile(null);
    }
  }, [session?.user]);

  const logout = async () => {
    await authClient.signOut();
    localStorage.removeItem("stocktrack_token");
    localStorage.removeItem("stocktrack_active_business_id");
    setSession(null);
    setProfile(null);
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
