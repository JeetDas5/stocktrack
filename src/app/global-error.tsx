"use client";

import { useEffect } from "react";
import { Inter } from "next/font/google";
import { AlertCircle, RefreshCw } from "lucide-react";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export default function GlobalError({
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
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-[#F5F5F5] text-zinc-900 font-sans select-none">
        <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden">
          <div className="relative w-full max-w-md z-10">
            <div className="bg-white border border-zinc-200 rounded-3xl p-8 sm:p-10 shadow-xl text-center">
              <div className="flex justify-center mb-6">
                <div className="h-16 w-16 rounded-2xl bg-zinc-50 border border-zinc-200 flex items-center justify-center text-zinc-950 shadow-2xs">
                  <AlertCircle className="w-8 h-8 stroke-[1.75]" />
                </div>
              </div>

              <h1 className="text-2xl font-extrabold text-zinc-900 tracking-tight mb-2">
                Critical Error
              </h1>
              <p className="text-zinc-500 text-xs font-semibold leading-relaxed max-w-sm mx-auto mb-6">
                A critical application error occurred. Please try again.
              </p>

              {error.message && (
                <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-4 mb-6 text-left">
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                    Error Details:
                  </p>
                  <p className="text-zinc-800 text-xs font-mono break-all leading-relaxed">
                    {error.message}
                  </p>
                </div>
              )}

              <button
                onClick={reset}
                className="w-full bg-[#0a2924] hover:bg-[#071d1a] text-white rounded-full py-3 px-6 text-xs font-bold uppercase tracking-wider shadow-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Try Again</span>
              </button>
            </div>

            <p className="text-center text-[10px] font-extrabold text-zinc-400 mt-6 uppercase tracking-widest">
              NexBrix
            </p>
          </div>
        </div>
      </body>
    </html>
  );
}
