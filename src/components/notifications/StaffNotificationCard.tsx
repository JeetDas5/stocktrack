"use client";

import React, { useState, useEffect } from "react";
import { Bell, BellOff, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  isPushNotificationSupported,
  getNotificationPermissionState,
  subscribeUserToPush,
  unsubscribeUserFromPush,
} from "@/lib/notifications";

export function StaffNotificationCard() {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function checkSub() {
      try {
        const supported = await isPushNotificationSupported();
        setIsSupported(supported);

        if (supported && "serviceWorker" in navigator) {
          const reg = await navigator.serviceWorker.getRegistration();
          if (reg) {
            const sub = await reg.pushManager.getSubscription();
            setIsSubscribed(!!sub);
          }
        }
      } catch (e) {
        console.error("Notification check error:", e);
      } finally {
        setLoading(false);
      }
    }
    checkSub();
  }, []);

  const handleToggle = async () => {
    setSubmitting(true);
    try {
      if (isSubscribed) {
        await unsubscribeUserFromPush();
        setIsSubscribed(false);
        toast.success("Push notifications disabled");
      } else {
        await subscribeUserToPush();
        setIsSubscribed(true);
        toast.success("Push notifications enabled!");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to update notification settings");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !isSupported) return null;

  return (
    <div className="bg-zinc-50 border border-zinc-200/80 rounded-2xl p-4 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
      <div className="flex items-center gap-3">
        <div className={`p-2.5 rounded-xl border ${isSubscribed ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-white border-zinc-200 text-[#0a2924]"}`}>
          {isSubscribed ? <CheckCircle2 className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
        </div>
        <div>
          <h4 className="text-xs font-extrabold text-zinc-900 uppercase tracking-wide">
            Daily Timesheet Reminders
          </h4>
          <p className="text-[11px] font-medium text-zinc-500 mt-0.5">
            {isSubscribed
              ? "Push notifications enabled on this device. You will receive daily end-of-day reminders."
              : "Enable browser push reminders so you never forget to log your daily shifts."}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={handleToggle}
        disabled={submitting}
        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 cursor-pointer ${
          isSubscribed
            ? "bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border border-zinc-200"
            : "bg-[#0a2924] hover:bg-[#0a2924]/90 text-white shadow-xs"
        }`}
      >
        {submitting ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : isSubscribed ? (
          <>
            <BellOff className="w-3.5 h-3.5" /> Turn Off
          </>
        ) : (
          <>
            <Bell className="w-3.5 h-3.5" /> Enable Notifications
          </>
        )}
      </button>
    </div>
  );
}
