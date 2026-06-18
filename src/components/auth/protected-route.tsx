"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/providers/auth-provider";
import Loading from "@/app/loading";

export default function ProtectedRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile, loading } = useAuth();

  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/login");
      } else if (profile) {
        if (!profile.isInternal) {
          router.push("/invite");
        } else if (
          profile.role !== "admin" &&
          profile.role !== "super_admin" &&
          !profile.isActive
        ) {
          router.push("/invite");
        }
      }
    }
  }, [user, profile, loading, router]);

  if (loading) {
    return <Loading />;
  }

  if (!user) {
    return null;
  }

  if (profile) {
    if (!profile.isInternal) {
      return null;
    }
    if (
      profile.role !== "admin" &&
      profile.role !== "super_admin" &&
      !profile.isActive
    ) {
      return null;
    }
  }

  return children;
}
