"use client";

import ProtectedRoute from "@/components/auth/protected-route";
import { useAuth } from "@/providers/auth-provider";

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <ProtectedRoute>
      <div className="p-10">
        <h1>Dashboard</h1>

        <p>{user?.email}</p>
      </div>
    </ProtectedRoute>
  );
}
