"use client";

import { toast } from "sonner";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

import { useBusinessStore } from "@/stores/business-store";
import { handleSquareCallback } from "@/lib/repositories/square.repository";

function SquareCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { activeBusinessId } = useBusinessStore();

  const [status, setStatus] = useState<"connecting" | "success" | "error">(
    "connecting"
  );
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");

    if (error) {
      setStatus("error");
      const msg = errorDescription || error || "Square authorization failed.";
      setErrorMessage(msg);
      toast.error(msg);
      return;
    }

    if (!code) {
      setStatus("error");
      setErrorMessage("No authorization code returned from Square.");
      toast.error("Authorization failed: Missing code");
      return;
    }

    let targetBusinessId: string = activeBusinessId || "";
    if (state && state.includes(":")) {
      targetBusinessId = state.split(":")[0];
    } else if (!targetBusinessId && typeof window !== "undefined") {
      targetBusinessId = localStorage.getItem("nexbrix_active_business_id") || "";
    }

    if (!targetBusinessId) {
      setStatus("error");
      setErrorMessage("No active business selected. Cannot link Square token.");
      toast.error("Missing active business selection.");
      return;
    }

    async function exchangeToken() {
      try {
        const res = await handleSquareCallback(targetBusinessId, code!);
        setStatus("success");
        toast.success(res.message || "Square connected successfully!");
        setTimeout(() => {
          router.push("/dashboard/square");
        }, 1500);
      } catch (err: unknown) {
        setStatus("error");
        const msg = (err as Error).message || "Failed to exchange authorization code.";
        setErrorMessage(msg);
        toast.error(msg);
      }
    }

    exchangeToken();
  }, [searchParams, activeBusinessId, router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 max-w-md w-full shadow-lg flex flex-col items-center">
        {status === "connecting" && (
          <>
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
              Connecting Square...
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Please wait while we exchange tokens and setup your Square merchant integration.
            </p>
          </>
        )}

        {status === "success" && (
          <>
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mb-4 animate-bounce" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
              Successfully Connected!
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              Your Square account has been authorized. Redirecting to Square dashboard...
            </p>
          </>
        )}

        {status === "error" && (
          <>
            <AlertCircle className="w-12 h-12 text-rose-500 mb-4" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
              Connection Failed
            </h2>
            <p className="text-sm text-rose-500 mb-6">{errorMessage}</p>
            <button
              onClick={() => router.push("/dashboard/square")}
              className="px-5 py-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition font-medium text-sm"
            >
              Return to Square Dashboard
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function SquareCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      }
    >
      <SquareCallbackContent />
    </Suspense>
  );
}
