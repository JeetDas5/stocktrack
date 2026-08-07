"use client";

import React from "react";
import { NotificationManager } from "@/components/notifications/NotificationManager";

export default function NotificationsPage() {
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Push Notification Settings & Broadcast
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Manage your push notification subscriptions, daily timesheet reminders, and broadcast staff alerts.
        </p>
      </div>

      <NotificationManager />
    </div>
  );
}
