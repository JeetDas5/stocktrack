"use client";

import { useEffect } from "react";
import Link from "next/link";

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

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-[#F1F5F9] font-sans overflow-hidden">
      <div className="absolute inset-0 pointer-events-none select-none">
        <div className="absolute top-1/3 -left-24 w-80 h-80 bg-red-100 rounded-full opacity-40 blur-3xl" />
        <div className="absolute bottom-1/3 -right-24 w-96 h-96 bg-[#DCFCE7] rounded-full opacity-30 blur-3xl" />
      </div>

      <div className="relative w-full max-w-lg mx-4 z-10 animate-scale-in">
        <div className="bg-white border border-zinc-200 rounded-2xl p-10 shadow-xl shadow-zinc-200/50 text-center">
          <div className="flex justify-center mb-6">
            <div className="h-14 w-14 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center">
              <svg
                className="w-7 h-7 text-red-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
                />
              </svg>
            </div>
          </div>

          <h1 className="text-2xl font-extrabold text-[#0F172A] tracking-tight mb-2">
            Something Went Wrong
          </h1>
          <p className="text-[#64748B] text-sm leading-relaxed max-w-sm mx-auto mb-3">
            An unexpected error occurred. You can try again or head back to the
            home page.
          </p>

          {error.message && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-8">
              <p className="text-red-600 text-xs font-mono break-all">
                {error.message}
              </p>
            </div>
          )}

          {!error.message && <div className="mb-5" />}

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={reset}
              className="w-full sm:w-auto bg-primary-green hover:bg-green-700 active:bg-green-800 text-white rounded-xl py-3 px-6 text-sm font-semibold tracking-wide shadow-md shadow-zinc-200 transition-all duration-200 flex items-center justify-center gap-2"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182"
                />
              </svg>
              Try Again
            </button>
            <Link
              href="/"
              className="w-full sm:w-auto bg-white hover:bg-zinc-50 border border-zinc-300 active:bg-zinc-100 text-zinc-700 rounded-xl py-3 px-6 text-sm font-semibold tracking-wide shadow-sm transition-all duration-200 flex items-center justify-center gap-2"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
                />
              </svg>
              Go Home
            </Link>
          </div>
        </div>

        <p className="text-center text-xs font-semibold text-zinc-400 mt-4 uppercase tracking-wider">
          StockTrack
        </p>
      </div>
    </div>
  );
}
