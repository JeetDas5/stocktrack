import api from "@/lib/services/api";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function isPushNotificationSupported() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export async function getNotificationPermissionState(): Promise<NotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "denied";
  }
  return Notification.permission;
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;

  try {
    const registration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/"
    });
    return registration;
  } catch (error) {
    console.error("Service worker registration failed:", error);
    return null;
  }
}

export async function subscribeUserToPush() {
  const supported = await isPushNotificationSupported();
  if (!supported) {
    throw new Error("Push notifications are not supported by your browser");
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("Notification permission was denied");
  }

  let registration = await navigator.serviceWorker.getRegistration();
  if (!registration) {
    registration = (await registerServiceWorker()) || undefined;
  }

  if (!registration) {
    throw new Error("Could not register service worker");
  }

  // 1. Fetch VAPID public key from backend
  const { data } = await api.get("/api/notifications/vapid-public-key");
  const publicKey = data.publicKey;

  // 2. Subscribe via Browser PushManager
  const applicationServerKey = urlBase64ToUint8Array(publicKey);
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey
  });

  const subscriptionJson = subscription.toJSON();

  // 3. Send subscription to backend database
  await api.post("/api/notifications/subscribe", {
    endpoint: subscriptionJson.endpoint,
    keys: subscriptionJson.keys,
    user_agent: navigator.userAgent
  });

  return subscription;
}

export async function unsubscribeUserFromPush() {
  if (!("serviceWorker" in navigator)) return;

  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration) return;

  const subscription = await registration.pushManager.getSubscription();
  if (subscription) {
    const subscriptionJson = subscription.toJSON();
    await api.post("/api/notifications/unsubscribe", {
      endpoint: subscriptionJson.endpoint,
      keys: subscriptionJson.keys
    });
    await subscription.unsubscribe();
  }
}

export async function getNotificationPreferences() {
  const { data } = await api.get("/api/notifications/preferences");
  return data;
}

export async function updateNotificationPreferences(payload: {
  timesheet_reminder_enabled?: boolean;
  reminder_time?: string;
  timezone?: string;
}) {
  const { data } = await api.put("/api/notifications/preferences", payload);
  return data;
}

export async function sendTestPushNotification() {
  const { data } = await api.post("/api/notifications/test-push");

  // If on localhost or browser permission is granted, also pop up immediate local notification
  if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
    if ("serviceWorker" in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) {
        await reg.showNotification("Timesheet Reminder Test", {
          body: "This is a test notification from NexBrix!",
          icon: "/homescreen/android-chrome-192x192.png",
          badge: "/homescreen/favicon.ico",
          data: { url: "/dashboard/timesheet-entry" },
        });
      } else {
        new Notification("Timesheet Reminder Test", {
          body: "This is a test notification from NexBrix!",
          icon: "/homescreen/android-chrome-192x192.png",
        });
      }
    }
  }

  return data;
}

export async function sendBroadcastNotification(payload: {
  title: string;
  body: string;
  url?: string;
  business_id?: string;
}) {
  const { data } = await api.post("/api/notifications/broadcast", payload);
  return data;
}

