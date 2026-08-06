"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertCircle, RefreshCw, Home } from "lucide-react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  reset = () => {
    window.location.reload();
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-[#F5F5F5] font-sans p-4 overflow-hidden select-none">
      <div className="relative w-full max-w-md z-10">
        <div className="bg-white border border-zinc-200 rounded-3xl p-8 sm:p-10 shadow-xl text-center">
          <div className="flex justify-center mb-6">
            <div className="h-16 w-16 rounded-2xl bg-zinc-50 border border-zinc-200 flex items-center justify-center text-zinc-950 shadow-2xs">
              <AlertCircle className="w-8 h-8 stroke-[1.75]" />
            </div>
          </div>

          <h1 className="text-2xl font-extrabold text-zinc-900 tracking-tight mb-2">
            Something Went Wrong
          </h1>
          <p className="text-zinc-500 text-xs font-semibold leading-relaxed max-w-sm mx-auto mb-6">
            An unexpected error occurred. You can try again or return to the
            main dashboard.
          </p>

          {error.message && (
            <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-4 mb-6 text-left">
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                Error Details:
              </p>
              <p className="text-red-500 text-xs font-mono break-all leading-relaxed">
                {error.message}
              </p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={reset}
              className="w-full sm:w-auto flex-1 bg-[#0a2924] hover:bg-[#071d1a] text-white rounded-full py-3 px-6 text-xs font-bold uppercase tracking-wider shadow-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Try Again</span>
            </button>
            <Link
              href="/"
              className="w-full sm:w-auto flex-1 bg-white hover:bg-zinc-100 border border-zinc-300 text-zinc-700 rounded-full py-3 px-6 text-xs font-bold uppercase tracking-wider shadow-2xs transition-colors flex items-center justify-center gap-2 cursor-pointer text-center"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Go Home</span>
            </Link>
          </div>
        </div>

        <p className="text-center text-[10px] font-extrabold text-zinc-400 mt-6 uppercase tracking-widest">
          NexBrix
        </p>
      </div>
    </div>
  );
}
