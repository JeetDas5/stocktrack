"use client";

import Link from "next/link";

export default function NotFound() {
  return (
    <div className="relative min-h-screen flex items-center justify-center bg-[#F1F5F9] font-sans overflow-hidden">
      <div className="absolute inset-0 pointer-events-none select-none">
        <div className="absolute top-1/4 -left-20 w-72 h-72 bg-[#DCFCE7] rounded-full opacity-40 blur-3xl" />
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-[#DCFCE7] rounded-full opacity-30 blur-3xl" />
      </div>

      <div className="relative w-full max-w-lg mx-4 z-10 animate-scale-in">
        <div className="bg-white border border-zinc-200 rounded-2xl p-10 shadow-xl shadow-zinc-200/50 text-center">
          <div className="flex justify-center mb-6">
            <div className="h-14 w-14 rounded-xl bg-[#DCFCE7] border border-[#16A34A]/20 flex items-center justify-center">
              <span className="text-[#16A34A] font-extrabold text-3xl tracking-tighter">
                S
              </span>
            </div>
          </div>

          <div className="relative mb-6">
            <span className="text-[140px] font-black text-[#DCFCE7] leading-none select-none block">
              404
            </span>
            <div className="absolute inset-0 flex items-center justify-center">
              <svg
                className="w-20 h-20 text-[#16A34A] opacity-80"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.182 16.318A4.486 4.486 0 0 0 12.016 15a4.486 4.486 0 0 0-3.198 1.318M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Z"
                />
              </svg>
            </div>
          </div>

          <h1 className="text-2xl font-extrabold text-[#0F172A] tracking-tight mb-2">
            Page Not Found
          </h1>
          <p className="text-[#64748B] text-sm leading-relaxed max-w-sm mx-auto mb-8">
            The page you&apos;re looking for doesn&apos;t exist or is under
            development. Let&apos;s get you back on track.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/"
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
                  d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
                />
              </svg>
              Go Home
            </Link>
            <button
              onClick={() => history.back()}
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
                  d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3"
                />
              </svg>
              Go Back
            </button>
          </div>
        </div>

        <p className="text-center text-xs font-semibold text-zinc-400 mt-4 uppercase tracking-wider">
          StockTrack
        </p>
      </div>
    </div>
  );
}
