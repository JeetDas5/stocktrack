/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { Download, X, Share, PlusSquare } from "lucide-react";
import { useAuth } from "@/providers/auth-provider";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export function PwaInstallPrompt() {
  const { user, profile, loading } = useAuth();

  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [showIosInstructions, setShowIosInstructions] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [cancelled, setCancelled] = useState(false);

  useEffect(() => {
    // 1. Check if already cancelled or installed in localStorage
    if (typeof window !== "undefined") {
      const isCancelled =
        localStorage.getItem("nexbrix_pwa_cancelled") === "true";
      const isAlreadyInstalled =
        localStorage.getItem("nexbrix_pwa_installed") === "true";
      setCancelled(isCancelled);
      setInstalled(isAlreadyInstalled);
    }

    // 2. Check if running in Standalone mode (already installed as PWA)
    const checkStandalone = () => {
      const isStandaloneMode =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone === true;
      setIsStandalone(isStandaloneMode);
    };

    checkStandalone();

    // 3. Register Service Worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          console.log("PWA Service Worker registered successfully:", reg.scope);
        })
        .catch((err) => {
          console.warn("PWA Service Worker registration failed:", err);
        });
    }

    // 4. Detect iOS & Mobile
    const userAgent = window.navigator.userAgent.toLowerCase();
    const iosDetected = /iphone|ipad|ipod/.test(userAgent);
    const isMobileDevice =
      /android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
        userAgent,
      ) || window.innerWidth <= 768;

    setIsIos(iosDetected);

    // 5. Handle beforeinstallprompt event (Chrome, Edge, Android)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);

      // Only show popup automatically on mobile devices for staff users
      if (isMobileDevice && !iosDetected) {
        setShowPrompt(true);
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // Listen for appinstalled event
    const handleAppInstalled = () => {
      setInstalled(true);
      setShowPrompt(false);
      setShowIosInstructions(false);
      setDeferredPrompt(null);
      localStorage.setItem("nexbrix_pwa_installed", "true");
    };
    window.addEventListener("appinstalled", handleAppInstalled);

    // Custom trigger event to manually open prompt from anywhere (e.g. Settings / Header)
    const handleManualShow = () => {
      if (iosDetected) {
        setShowIosInstructions(true);
      } else if (deferredPrompt) {
        setShowPrompt(true);
      } else {
        setShowPrompt(true);
      }
    };
    window.addEventListener("show-pwa-install-prompt", handleManualShow);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
      window.removeEventListener("show-pwa-install-prompt", handleManualShow);
    };
  }, []);

  // Show iOS modal when user logs in as staff on iOS device if not previously cancelled/installed
  useEffect(() => {
    if (
      !loading &&
      user &&
      profile?.role === "staff" &&
      isIos &&
      !isStandalone &&
      !installed &&
      !cancelled
    ) {
      setShowIosInstructions(true);
    }
  }, [loading, user, profile, isIos, isStandalone, installed, cancelled]);

  const handleInstallClick = async () => {
    if (isIos) {
      setShowIosInstructions(true);
      setShowPrompt(false);
      return;
    }

    if (!deferredPrompt) {
      alert(
        "To install NexBrix, open your browser menu (⋮ or ⋯) and select 'Add to Home Screen' or 'Install App'.",
      );
      return;
    }

    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === "accepted") {
        setInstalled(true);
        localStorage.setItem("nexbrix_pwa_installed", "true");
      } else {
        // User cancelled in native prompt
        handleDismiss();
      }
    } catch (err) {
      console.error("Error triggering install prompt:", err);
    } finally {
      setDeferredPrompt(null);
      setShowPrompt(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setShowIosInstructions(false);
    setCancelled(true);
    localStorage.setItem("nexbrix_pwa_cancelled", "true");
  };

  // Conditions to hide popup completely:
  // 1. Still loading auth status
  // 2. User is not logged in or not a staff member
  // 3. App is already running in PWA standalone mode
  // 4. App is already installed
  // 5. User previously cancelled / dismissed the prompt
  if (
    loading ||
    !user ||
    profile?.role !== "staff" ||
    isStandalone ||
    installed ||
    cancelled
  ) {
    return null;
  }

  return (
    <>
      {showPrompt && !isIos && (
        <div className="fixed bottom-5 left-5 right-5 sm:left-auto sm:right-6 sm:max-w-md z-50 animate-in fade-in slide-in-from-bottom-6 duration-300">
          <div className="relative overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950 p-5 text-white shadow-2xl backdrop-blur-xl">
            <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-blue-600/20 blur-2xl pointer-events-none" />
            <div className="absolute -bottom-12 -left-12 h-32 w-32 rounded-full bg-indigo-600/20 blur-2xl pointer-events-none" />

            <button
              onClick={handleDismiss}
              aria-label="Close"
              className="absolute top-3.5 right-3.5 p-1.5 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-800/80 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-start gap-4">
              <div className="relative shrink-0">
                <div className="h-12 w-12 rounded-xl overflow-hidden bg-neutral-900 border border-neutral-700/80 flex items-center justify-center p-1 shadow-md">
                  <Image
                    src="/homescreen/android-chrome-192x192.png"
                    alt="NexBrix"
                    width={48}
                    height={48}
                    className="rounded-lg object-cover"
                  />
                </div>
              </div>

              <div className="flex-1 min-w-0 pr-4">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-semibold text-white tracking-tight">
                    Welcome to NexBrix!
                  </h3>
                </div>
                <p className="mt-1 text-xs text-neutral-400 leading-relaxed">
                  For faster access and an app-like experience, add NexBrix to
                  your Home Screen
                </p>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2.5">
              <button
                onClick={handleInstallClick}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-semibold text-neutral-950 hover:bg-neutral-100 active:scale-[0.98] transition-all shadow-sm"
              >
                <Download className="h-4 w-4 text-blue-600" />
                Add to Home Screen
              </button>
              <button
                onClick={handleDismiss}
                className="rounded-xl border border-neutral-800 bg-neutral-900/60 px-3.5 py-2.5 text-xs font-medium text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
              >
                Not now
              </button>
            </div>
          </div>
        </div>
      )}

      {showIosInstructions && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm rounded-3xl border border-neutral-800 bg-neutral-950 p-6 text-white shadow-2xl animate-in slide-in-from-bottom-8 duration-300">
            <button
              onClick={handleDismiss}
              className="absolute top-4 right-4 p-1.5 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl bg-neutral-900 border border-neutral-700 flex items-center justify-center p-1.5 shadow-md">
                <Image
                  src="/homescreen/apple-touch-icon.png"
                  alt="NexBrix App"
                  width={38}
                  height={38}
                  className="rounded-md"
                />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">
                  Welcome to NexBrix!
                </h3>
                <p className="text-xs text-neutral-400">
                  For faster access and an app-like experience, add NexBrix to
                  your Home Screen
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-3 text-xs">
              <div className="flex items-start gap-3 rounded-2xl bg-neutral-900/90 border border-neutral-800/80 p-3.5">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600/20 text-blue-400 font-bold text-xs">
                  1
                </div>
                <div className="pt-0.5">
                  <p className="font-medium text-neutral-200">
                    Tap the{" "}
                    <span className="font-semibold text-white">Share</span>{" "}
                    button
                  </p>
                  <p className="mt-1 text-neutral-400 text-[11px] flex items-center gap-1.5">
                    Look for{" "}
                    <Share className="inline h-3.5 w-3.5 text-blue-400" /> in
                    Safari&apos;s toolbar (bottom or top).
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-2xl bg-neutral-900/90 border border-neutral-800/80 p-3.5">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600/20 text-blue-400 font-bold text-xs">
                  2
                </div>
                <div className="pt-0.5">
                  <p className="font-medium text-neutral-200">
                    Scroll &amp; tap{" "}
                    <span className="font-semibold text-white">
                      &quot;Add to Home Screen&quot;
                    </span>
                  </p>
                  <p className="mt-1 text-neutral-400 text-[11px] flex items-center gap-1.5">
                    Find{" "}
                    <PlusSquare className="inline h-3.5 w-3.5 text-blue-400" />{" "}
                    in the menu list.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-2xl bg-neutral-900/90 border border-neutral-800/80 p-3.5">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600/20 text-blue-400 font-bold text-xs">
                  3
                </div>
                <div className="pt-0.5">
                  <p className="font-medium text-neutral-200">
                    Confirm name &amp; tap{" "}
                    <span className="font-semibold text-white">
                      &quot;Add&quot;
                    </span>{" "}
                    or{" "}
                    <span className="font-semibold text-white">
                      &quot;OK&quot;
                    </span>
                  </p>
                  <p className="mt-1 text-neutral-400 text-[11px]">
                    NexBrix will open directly to your timesheets from your home
                    screen!
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-5 flex items-center gap-2.5">
              <button
                onClick={handleDismiss}
                className="w-full rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-500 transition-colors shadow-lg shadow-blue-600/30"
              >
                Got it!
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
