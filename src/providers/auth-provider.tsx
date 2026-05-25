"use client";

import { onAuthStateChanged, User } from "firebase/auth";
import { createContext, useContext, useEffect, useState } from "react";
import { auth } from "@/lib/firebase/client";
import { AppUser } from "@/types/user";
import { getUserProfile, createUserProfile } from "@/lib/repositories/user.repository";

interface AuthContextType {
  user: User | null;

  profile: AppUser | null;

  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        setLoading(true);

        if (!firebaseUser) {
          setUser(null);
          setProfile(null);
          return;
        }

        setUser(firebaseUser);

        let userProfile = await getUserProfile(firebaseUser.uid);

        if (!userProfile) {
          const newProfile: AppUser = {
            uid: firebaseUser.uid,
            fullName: firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "Admin User",
            email: firebaseUser.email || undefined,
            role: "admin",
            isActive: true,
            businessIds: [],
            createdAt: new Date().toISOString(),
            last_login_at: new Date().toISOString(),
          };
          await createUserProfile(newProfile);
          userProfile = newProfile;
        }

        setProfile(userProfile);
      } catch (error) {
        console.error("Auth provider error:", error);
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
