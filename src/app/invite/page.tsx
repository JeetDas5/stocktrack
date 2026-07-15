"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";
import { Loader2, LogOut, Clock, Lock } from "lucide-react";

export default function InvitePendingPage() {
  const router = useRouter();
  const { user, profile, loading, logout, refreshProfile } = useAuth();
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (user) {
      refreshProfile();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/login");
      } else if (profile) {
        if (
          profile.isInternal &&
          (profile.role === "admin" ||
            profile.role === "super_admin" ||
            profile.isActive)
        ) {
          router.push("/dashboard/profile");
        }
      }
    }
  }, [user, profile, loading, router]);

  const handleCheckStatus = async () => {
    setChecking(true);
    try {
      const fresh = await refreshProfile();
      if (
        fresh?.isInternal &&
        (fresh.role === "admin" ||
          fresh.role === "super_admin" ||
          fresh.isActive)
      ) {
        router.push("/dashboard/profile");
      } else {
        toast.info("Approval still pending");
      }
    } catch (err) {
      toast.error("Failed to check status. Please try again.");
    } finally {
      setChecking(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  const isInviteOnly = profile && !profile.isInternal;

  if (
    loading ||
    !user ||
    (profile &&
      profile.isInternal &&
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
        {isInviteOnly ? (
          <>
            <div className="h-16 w-16 rounded-full bg-zinc-950 flex items-center justify-center mx-auto mb-6 text-white shadow-sm">
              <Lock className="h-7 w-7 stroke-[2.5px]" />
            </div>

            <h1 className="text-3xl font-extrabold text-zinc-900 tracking-tight">
              Invite Only
            </h1>

            <div className="inline-flex items-center gap-1.5 px-4 py-1 mt-3.5 rounded-full bg-amber-50 border border-amber-200/50">
              <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-[10px] uppercase font-extrabold tracking-wider text-amber-700">
                Private Beta
              </span>
            </div>

            <div className="mt-8 space-y-3">
              <p className="text-zinc-900 font-extrabold text-sm uppercase tracking-wide">
                NexBrix is Invite-Only
              </p>
              <p className="text-zinc-500 text-xs font-semibold leading-relaxed max-w-sm mx-auto">
                Currently, NexBrix is only accessible to invited team members and partners.
                <br />
                Please ask your administrator for an invite.
              </p>
            </div>
          </>
        ) : (
          <>
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
          </>
        )}

        <div className="mt-10 border-t border-zinc-100 pt-8 space-y-3">
          {!isInviteOnly && (
            <button
              onClick={handleCheckStatus}
              disabled={checking}
              className="w-full bg-zinc-950 hover:bg-zinc-800 text-white rounded-full py-3.5 text-[13px] font-semibold transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-xs disabled:opacity-50"
            >
              {checking ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Checking Status...
                </>
              ) : (
                "Check Approval Status"
              )}
            </button>
          )}
          <button
            onClick={handleLogout}
            className={`w-full rounded-full py-3.5 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer flex items-center justify-center gap-2 ${
              isInviteOnly
                ? "bg-zinc-950 hover:bg-zinc-800 text-white shadow-sm"
                : "bg-transparent hover:bg-zinc-50 text-zinc-500 hover:text-zinc-900 border border-transparent"
            }`}
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
