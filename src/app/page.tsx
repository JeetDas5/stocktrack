"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";
import { useBusinessStore } from "@/store/business-store";
import { Loader2 } from "lucide-react";

export default function RootPage() {
  const { user, loading } = useAuth();
  const { activeBusinessId, setActiveBusiness } = useBusinessStore();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.push("/login");
      return;
    }

    let currentBusId = activeBusinessId;
    if (!currentBusId && typeof window !== "undefined") {
      const persisted = localStorage.getItem("stocktrack_active_business_id");
      if (persisted) {
        setActiveBusiness(persisted);
        currentBusId = persisted;
      }
    }

    if (currentBusId) {
      router.push("/dashboard");
    } else {
      router.push("/dashboard/business");
    }
  }, [user, loading, activeBusinessId, router, setActiveBusiness]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white">
      <Loader2 className="h-8 w-8 text-emerald-400 animate-spin mb-4" />
      <span className="text-zinc-500 text-xs font-semibold uppercase tracking-wider">
        Initializing StockTrack...
      </span>
    </div>
  );
}
