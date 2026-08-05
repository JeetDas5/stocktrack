"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { Download, X, Share, PlusSquare, Smartphone, Sparkles, CheckCircle2 } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [showIosInstructions, setShowIosInstructions] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // 1. Check if running in Standalone mode (already installed as PWA)
    const checkStandalone = () => {
      const isStandaloneMode =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone === true;
      setIsStandalone(isStandaloneMode);
    };

    checkStandalone();

    // 2. Register Service Worker
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          console.log("PWA Service Worker registered successfully:", reg.scope);
        })
        .catch((err) => {
          console.warn("PWA Service Worker registration failed:", err);
        });
    }

    // 3. Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const iosDetected = /iphone|ipad|ipod/.test(userAgent);
    setIsIos(iosDetected);

    // 4. Handle beforeinstallprompt event (Chrome, Edge, Android)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);

      // Check if user dismissed prompt recently (within 7 days)
      const lastDismissed = localStorage.getItem("nexbrix_pwa_dismissed_at");
      const sevenDays = 7 * 24 * 60 * 60 * 1000;
      if (!lastDismissed || Date.now() - parseInt(lastDismissed, 10) > sevenDays) {
        setShowPrompt(true);
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // Listen for appinstalled event
    const handleAppInstalled = () => {
      setInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
    };
    window.addEventListener("appinstalled", handleAppInstalled);

    // Custom trigger event to manually open prompt from anywhere (e.g. Header/Settings)
    const handleManualShow = () => {
      if (iosDetected) {
        setShowIosInstructions(true);
      } else if (deferredPrompt) {
        setShowPrompt(true);
      } else {
        // Show general prompt fallback
        setShowPrompt(true);
      }
    };
    window.addEventListener("show-pwa-install-prompt", handleManualShow);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
      window.removeEventListener("show-pwa-install-prompt", handleManualShow);
    };
  }, [deferredPrompt]);

  const handleInstallClick = async () => {
    if (isIos) {
      setShowIosInstructions(true);
      setShowPrompt(false);
      return;
    }

    if (!deferredPrompt) {
      // Fallback instructions if prompt isn't directly available
      alert("To install NexBrix, open your browser menu (⋮ or ⋯) and select 'Add to Home Screen' or 'Install App'.");
      return;
    }

    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === "accepted") {
        setInstalled(true);
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
    localStorage.setItem("nexbrix_pwa_dismissed_at", Date.now().toString());
  };

  // Don't display anything if already installed/running in standalone mode
  if (isStandalone || installed) return null;

  return (
    <>
      {/* Main Floating Banner Prompt */}
      {showPrompt && (
        <div className="fixed bottom-5 left-5 right-5 sm:left-auto sm:right-6 sm:max-w-md z-50 animate-in fade-in slide-in-from-bottom-6 duration-300">
          <div className="relative overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950 p-5 text-white shadow-2xl backdrop-blur-xl">
            {/* Ambient Background Gradient Glow */}
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
              <div className="relative flex-shrink-0">
                <div className="h-12 w-12 rounded-xl overflow-hidden bg-neutral-900 border border-neutral-700/80 flex items-center justify-center p-1 shadow-md">
                  <Image
                    src="/homescreen/android-chrome-192x192.png"
                    alt="NexBrix"
                    width={48}
                    height={48}
                    className="rounded-lg object-cover"
                  />
                </div>
                <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white ring-2 ring-neutral-950">
                  <Sparkles className="h-3 w-3" />
                </span>
              </div>

              <div className="flex-1 min-w-0 pr-4">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-semibold text-white tracking-tight">
                    Add NexBrix to Home Screen
                  </h3>
                </div>
                <p className="mt-1 text-xs text-neutral-400 leading-relaxed">
                  Install our app for a faster full-screen experience and instant access.
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

      {/* iOS Safari Step-by-Step Modal */}
      {showIosInstructions && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm rounded-3xl border border-neutral-800 bg-neutral-950 p-6 text-white shadow-2xl animate-in slide-in-from-bottom-8 duration-300">
            <button
              onClick={() => setShowIosInstructions(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-neutral-900 border border-neutral-700 flex items-center justify-center p-1">
                <Image
                  src="/homescreen/apple-touch-icon.png"
                  alt="NexBrix App"
                  width={36}
                  height={36}
                  className="rounded-md"
                />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">Install on iPhone / iPad</h3>
                <p className="text-xs text-neutral-400">Follow these simple steps in Safari</p>
              </div>
            </div>

            <div className="mt-5 space-y-3.5 text-xs">
              <div className="flex items-start gap-3 rounded-2xl bg-neutral-900/80 border border-neutral-800 p-3.5">
                <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-blue-600/20 text-blue-400 font-bold">
                  1
                </div>
                <div className="pt-0.5">
                  <p className="font-medium text-neutral-200">
                    Tap the <span className="font-semibold text-white">Share</span> button
                  </p>
                  <p className="mt-0.5 text-neutral-400 text-[11px] flex items-center gap-1">
                    Look for <Share className="inline h-3.5 w-3.5 text-blue-400" /> at the bottom or top bar of Safari.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-2xl bg-neutral-900/80 border border-neutral-800 p-3.5">
                <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-blue-600/20 text-blue-400 font-bold">
                  2
                </div>
                <div className="pt-0.5">
                  <p className="font-medium text-neutral-200">
                    Scroll & tap <span className="font-semibold text-white">&quot;Add to Home Screen&quot;</span>
                  </p>
                  <p className="mt-0.5 text-neutral-400 text-[11px] flex items-center gap-1">
                    Find <PlusSquare className="inline h-3.5 w-3.5 text-blue-400" /> in the share options list.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-2xl bg-neutral-900/80 border border-neutral-800 p-3.5">
                <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-blue-600/20 text-blue-400 font-bold">
                  3
                </div>
                <div className="pt-0.5">
                  <p className="font-medium text-neutral-200">
                    Tap <span className="font-semibold text-white">&quot;Add&quot;</span> in top right
                  </p>
                  <p className="mt-0.5 text-neutral-400 text-[11px]">
                    NexBrix will be installed directly on your home screen!
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowIosInstructions(false)}
              className="mt-5 w-full rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-500 transition-colors shadow-lg shadow-blue-600/30"
            >
              Got it!
            </button>
          </div>
        </div>
      )}
    </>
  );
}
