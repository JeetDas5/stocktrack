"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";
import { Loader2, LogOut, Clock } from "lucide-react";

export default function InvitePendingPage() {
  const router = useRouter();
  const { user, profile, loading, logout } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/login");
      } else if (profile) {
        if (
          profile.role === "admin" ||
          profile.role === "super_admin" ||
          profile.isActive
        ) {
          router.push("/dashboard");
        }
      }
    }
  }, [user, profile, loading, router]);

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  if (
    loading ||
    !user ||
    (profile &&
      (profile.role === "admin" ||
        profile.role === "super_admin" ||
        profile.isActive))
  ) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4">
        <Loader2 className="h-8 w-8 text-zinc-950 animate-spin mb-4" />
        <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider">
          Syncing profile status...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 select-none font-sans">
      <div className="max-w-md w-full border border-zinc-200 rounded-3xl p-10 text-center shadow-xs bg-white">
        <div className="h-16 w-16 rounded-full bg-zinc-950 flex items-center justify-center mx-auto mb-6 text-white shadow-sm">
          <Clock className="h-7 w-7 stroke-[2.5px]" />
        </div>

        <h1 className="text-3xl font-extrabold text-zinc-900 tracking-tight">
          You&apos;re all set!
        </h1>

        <div className="inline-flex items-center gap-1.5 px-4 py-1 mt-3.5 rounded-full bg-zinc-100 border border-zinc-200/50">
          <span className="h-2 w-2 rounded-full bg-zinc-500 animate-pulse" />
          <span className="text-[10px] uppercase font-extrabold tracking-wider text-zinc-600">
            Approval pending
          </span>
        </div>

        <div className="mt-8 space-y-3">
          <p className="text-zinc-900 font-extrabold text-sm uppercase tracking-wide">
            Your account is under review
          </p>
          <p className="text-zinc-500 text-xs font-semibold leading-relaxed max-w-sm mx-auto">
            Most approvals happen within a few hours.
            <br />
            You&apos;ll be notified once approved.
          </p>
        </div>

        <div className="mt-10 border-t border-zinc-100 pt-8">
          <button
            onClick={handleLogout}
            className="w-full bg-zinc-950 hover:bg-zinc-800 text-white rounded-full py-3.5 text-xs font-bold uppercase tracking-wider shadow-sm transition-colors cursor-pointer flex items-center justify-center gap-2"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
