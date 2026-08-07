"use client";

import React, { useState, useEffect } from "react";
import { Bell, BellOff, Send, Clock, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  isPushNotificationSupported,
  getNotificationPermissionState,
  subscribeUserToPush,
  unsubscribeUserFromPush,
  getNotificationPreferences,
  updateNotificationPreferences,
  sendTestPushNotification,
} from "@/lib/notifications";

export function NotificationManager() {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [testing, setTesting] = useState(false);

  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [reminderTime, setReminderTime] = useState("17:00");
  const [userTimezone, setUserTimezone] = useState("UTC");

  useEffect(() => {
    async function init() {
      try {
        const supported = await isPushNotificationSupported();
        setIsSupported(supported);

        if (supported) {
          const perm = await getNotificationPermissionState();
          setPermission(perm);

          const reg = await navigator.serviceWorker.getRegistration();
          if (reg) {
            const sub = await reg.pushManager.getSubscription();
            setIsSubscribed(!!sub);
          }

          // Fetch preferences
          const prefs = await getNotificationPreferences();
          if (prefs) {
            setReminderEnabled(prefs.timesheet_reminder_enabled ?? true);
            setReminderTime(prefs.reminder_time || "17:00");
            setUserTimezone(
              prefs.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
            );
          }
        }
      } catch (err) {
        console.error("Failed to load notification settings:", err);
      } finally {
        setLoading(false);
      }
    }

    init();
  }, []);

  const handleToggleSubscription = async () => {
    setSubmitting(true);
    try {
      if (isSubscribed) {
        await unsubscribeUserFromPush();
        setIsSubscribed(false);
        toast.success("Push notifications disabled");
      } else {
        await subscribeUserToPush();
        setIsSubscribed(true);
        setPermission("granted");
        toast.success("Push notifications enabled!");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Failed to update notification subscription");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSavePreferences = async () => {
    setSubmitting(true);
    try {
      await updateNotificationPreferences({
        timesheet_reminder_enabled: reminderEnabled,
        reminder_time: reminderTime,
        timezone: userTimezone,
      });
      toast.success("Notification preferences saved");
    } catch (err: any) {
      toast.error("Failed to save preferences");
    } finally {
      setSubmitting(false);
    }
  };

  const handleTestPush = async () => {
    setTesting(true);
    try {
      const res = await sendTestPushNotification();
      toast.success("Test push notification triggered!");
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to send test push");
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs font-bold text-zinc-500 py-4">
        <Loader2 className="w-4 h-4 animate-spin text-[#0a2924]" /> Loading notification settings...
      </div>
    );
  }

  if (!isSupported) {
    return (
      <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-2xl flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-900">
          <p className="font-extrabold uppercase tracking-wide">Push Notifications Not Supported</p>
          <p className="text-[11px] text-amber-700 mt-1">
            Your browser does not support standard WebPush notifications. Please try using modern Chrome, Edge, Firefox, or Safari (v16.4+).
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Enable / Status Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-zinc-50/60 border border-zinc-200/80 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-white border border-zinc-200 rounded-xl text-[#0a2924] shadow-2xs">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-extrabold text-zinc-900 uppercase tracking-wide">
              Browser Push Notifications
            </h4>
            <p className="text-[10px] font-bold text-zinc-400 mt-0.5">
              Receive automated reminders for end-of-day timesheet submissions.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleToggleSubscription}
          disabled={submitting}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer ${
            isSubscribed
              ? "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 border border-zinc-200"
              : "bg-[#0a2924] hover:bg-[#0a2924]/90 text-white shadow-xs"
          }`}
        >
          {submitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : isSubscribed ? (
            <>
              <BellOff className="w-4 h-4" /> Enabled (Click to Unsubscribe)
            </>
          ) : (
            <>
              <Bell className="w-4 h-4" /> Enable Push Notifications
            </>
          )}
        </button>
      </div>

      {permission === "denied" && (
        <div className="p-3.5 bg-red-50/70 border border-red-200 rounded-2xl text-xs text-red-700 flex items-center gap-2.5 font-medium">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          Notifications are currently blocked in your browser settings. Please unblock site permissions in your browser address bar to receive alerts.
        </div>
      )}

      {isSubscribed && (
        <div className="space-y-6 pt-2">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={reminderEnabled}
                onChange={(e) => setReminderEnabled(e.target.checked)}
                className="mt-0.5 h-3.5 w-3.5 accent-[#0C830C] text-[#0C830C] border-zinc-300 rounded focus:ring-[#0C830C]"
              />
              <div className="flex flex-col">
                <span className="text-xs font-bold text-zinc-950">
                  Daily Timesheet Reminder
                </span>
                <p className="text-[10px] text-zinc-400 mt-0.5">
                  Send reminder push notification if timesheet is not logged by end of day
                </p>
              </div>
            </label>

            {reminderEnabled && (
              <>
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-zinc-700 uppercase tracking-wide">
                    Reminder Time
                  </label>
                  <div className="relative">
                    <Clock className="w-4 h-4 text-zinc-400 absolute left-3.5 top-2.5 pointer-events-none" />
                    <input
                      type="time"
                      value={reminderTime}
                      onChange={(e) => setReminderTime(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-white border border-zinc-200 rounded-xl text-xs font-bold text-zinc-950 focus:outline-none focus:ring-2 focus:ring-[#0a2924]"
                    />
                  </div>
                  <p className="text-[10px] text-zinc-400">Time of day to send reminder push</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-zinc-700 uppercase tracking-wide">
                    Timezone
                  </label>
                  <input
                    type="text"
                    value={userTimezone}
                    onChange={(e) => setUserTimezone(e.target.value)}
                    className="w-full px-3.5 py-2 bg-white border border-zinc-200 rounded-xl text-xs font-bold text-zinc-950 focus:outline-none focus:ring-2 focus:ring-[#0a2924]"
                    placeholder="e.g. Australia/Sydney or UTC"
                  />
                  <p className="text-[10px] text-zinc-400">Configured user timezone</p>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-zinc-100">
            <button
              type="button"
              onClick={handleTestPush}
              disabled={testing}
              className="px-3.5 py-2 text-xs font-bold text-zinc-700 bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 rounded-xl transition flex items-center gap-2 cursor-pointer"
            >
              {testing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5 text-[#0a2924]" />
              )}
              Send Test Push to Myself
            </button>

            <button
              type="button"
              onClick={handleSavePreferences}
              disabled={submitting}
              className="px-5 py-2.5 text-xs font-bold text-white bg-[#0a2924] hover:bg-[#0a2924]/90 rounded-xl transition flex items-center gap-2 shadow-xs cursor-pointer"
            >
              {submitting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5" />
              )}
              Save Preferences
            </button>
          </div>
        </div>
      )}

      {/* Owner / Manager Broadcast Tool */}
      <div className="border-t border-zinc-100 pt-6 mt-6">
        <div className="flex items-center gap-2 text-zinc-900 font-extrabold text-xs uppercase tracking-wide mb-1">
          <Send className="w-4 h-4 text-[#0C830C]" />
          Owner Tool: Broadcast Push Alert to Staff
        </div>
        <p className="text-[11px] text-zinc-500 mb-4">
          Send a custom push announcement directly to all staff members' devices.
        </p>

        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const title = (form.elements.namedItem("broadcastTitle") as HTMLInputElement).value;
            const body = (form.elements.namedItem("broadcastBody") as HTMLTextAreaElement).value;

            if (!title || !body) {
              toast.error("Title and message body are required");
              return;
            }

            try {
              setSubmitting(true);
              const { sendBroadcastNotification } = await import("@/lib/notifications");
              const res = await sendBroadcastNotification({
                title,
                body,
                url: "/dashboard/timesheet-entry",
              });

              // Also pop up direct local desktop notification for testing
              if (
                typeof window !== "undefined" &&
                "Notification" in window &&
                Notification.permission === "granted"
              ) {
                const reg = await navigator.serviceWorker.getRegistration();
                if (reg) {
                  reg.showNotification(title, {
                    body,
                    icon: "/homescreen/android-chrome-192x192.png",
                    data: { url: "/dashboard/timesheet-entry" },
                  });
                }
              }

              toast.success(`Broadcast sent to ${res.sent_count} device(s)!`);
              form.reset();
            } catch (err: any) {
              toast.error("Failed to send broadcast notification");
            } finally {
              setSubmitting(false);
            }
          }}
          className="space-y-4 bg-zinc-50/60 p-5 rounded-2xl border border-zinc-200"
        >
          <div className="space-y-1.5">
            <label className="text-xs font-extrabold text-zinc-700 uppercase tracking-wide">
              Notification Title
            </label>
            <input
              name="broadcastTitle"
              type="text"
              placeholder="e.g., Timesheet Reminder: Log Shift Before 6:00 PM"
              className="w-full px-3.5 py-2 bg-white border border-zinc-200 rounded-xl text-xs font-bold text-zinc-950 focus:outline-none focus:ring-2 focus:ring-[#0a2924]"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-extrabold text-zinc-700 uppercase tracking-wide">
              Message Body
            </label>
            <textarea
              name="broadcastBody"
              rows={2}
              placeholder="e.g., Please log all shifts before end of day for payroll processing."
              className="w-full px-3.5 py-2 bg-white border border-zinc-200 rounded-xl text-xs font-bold text-zinc-950 focus:outline-none focus:ring-2 focus:ring-[#0a2924]"
              required
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 bg-[#0a2924] hover:bg-[#0a2924]/90 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Broadcast Notification Now
          </button>
        </form>
      </div>
    </div>
  );
}
