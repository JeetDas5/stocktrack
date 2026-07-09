/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { createContext, useContext, useEffect, useState } from "react";

import { AppUser } from "@/types/user";
import { authClient } from "@/lib/auth/auth-client";
import { getMeProfile } from "@/lib/repositories/user.repository";

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
  refreshProfile: () => Promise<AppUser | null>;
  fetchSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  logout: async () => {},
  refreshProfile: async () => null,
  fetchSession: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [session, setSession] = useState<{ user: any; session: any } | null>(
    null,
  );
  const [profile, setProfile] = useState<AppUser | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  const fetchSession = async () => {
    try {
      setSessionLoading(true);
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("nexbrix_token")
          : null;
      const res = await authClient.getSession({
        fetchOptions: {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        },
      });
      if (res?.data) {
        setSession(res.data);
        if (res.data.session?.token) {
          localStorage.setItem("nexbrix_token", res.data.session.token);
        }
      } else if (token) {
        // Fallback: If Better Auth session is null but we have a custom token, fetch user profile from FastAPI backend
        try {
          const userProfile = await getMeProfile();
          if (userProfile) {
            setProfile(userProfile);
            setSession({
              session: { token },
              user: {
                id: userProfile.uid,
                email: userProfile.email,
                name: userProfile.fullName || "",
              },
            });
          } else {
            setSession(null);
            localStorage.removeItem("nexbrix_token");
          }
        } catch (profileErr) {
          console.error("Error fetching fallback profile:", profileErr);
          setSession(null);
          localStorage.removeItem("nexbrix_token");
        }
      } else {
        setSession(null);
        localStorage.removeItem("nexbrix_token");
      }
    } catch (err) {
      console.error("Error fetching Better Auth session:", err);
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("nexbrix_token")
          : null;
      if (token) {
        try {
          const userProfile = await getMeProfile();
          if (userProfile) {
            setProfile(userProfile);
            setSession({
              session: { token },
              user: {
                id: userProfile.uid,
                email: userProfile.email,
                name: userProfile.fullName || "",
              },
            });
            return;
          }
        } catch {}
      }
      setSession(null);
      localStorage.removeItem("nexbrix_token");
    } finally {
      setSessionLoading(false);
    }
  };

  useEffect(() => {
    fetchSession();
  }, []);

  const user = session?.user
    ? {
        uid: session.user.id,
        email: session.user.email,
        displayName: session.user.name,
      }
    : null;

  useEffect(() => {
    if (session?.session?.token) {
      localStorage.setItem("nexbrix_token", session.session.token);
    } else if (session === null && !sessionLoading) {
      localStorage.removeItem("nexbrix_token");
      localStorage.removeItem("nexbrix_active_business_id");
      setProfile(null);
    }
  }, [session, sessionLoading]);

  const refreshProfile = async () => {
    if (!session?.user) return null;
    try {
      setProfileLoading(true);
      const userProfile = await getMeProfile();
      if (userProfile) {
        setProfile(userProfile);
        return userProfile;
      }
    } catch (error) {
      console.error("Error refreshing profile:", error);
    } finally {
      setProfileLoading(false);
    }
    return null;
  };

  useEffect(() => {
    if (session?.user) {
      refreshProfile();
    } else {
      setProfile(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user]);

  useEffect(() => {
    if (profile?.role === "super_admin") {
      if (
        typeof window !== "undefined" &&
        localStorage.getItem("nexbrix_super_admin_readonly") === null
      ) {
        localStorage.setItem("nexbrix_super_admin_readonly", "true");
      }
    }
  }, [profile]);

  const logout = async () => {
    await authClient.signOut();
    localStorage.removeItem("nexbrix_token");
    localStorage.removeItem("nexbrix_active_business_id");
    localStorage.removeItem("nexbrix_active_location_id");
    localStorage.removeItem("nexbrix_impersonated_user_id");
    localStorage.removeItem("nexbrix_super_admin_readonly");
    setSession(null);
    setProfile(null);
  };

  const loading =
    sessionLoading || profileLoading || (session?.user && !profile);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        logout,
        refreshProfile,
        fetchSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
