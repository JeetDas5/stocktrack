"use client";

import Link from "next/link";
import { FileQuestion, Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="relative min-h-screen flex items-center justify-center bg-[#F5F5F5] font-sans p-4 overflow-hidden select-none">
      <div className="relative w-full max-w-md z-10">
        <div className="bg-white border border-zinc-200 rounded-3xl p-8 sm:p-10 shadow-xl text-center">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 rounded-2xl bg-zinc-50 border border-zinc-200 flex items-center justify-center text-zinc-950 shadow-2xs">
              <FileQuestion className="w-8 h-8 stroke-[1.75]" />
            </div>
          </div>

          <div className="relative my-2">
            <span className="text-7xl font-black text-zinc-950 tracking-tighter block">
              404
            </span>
          </div>

          <h1 className="text-xl font-extrabold text-zinc-900 tracking-tight mb-2">
            Page Not Found
          </h1>
          <p className="text-zinc-500 text-xs font-semibold leading-relaxed max-w-sm mx-auto mb-8">
            The page you are looking for does not exist or has been moved.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/"
              className="w-full sm:w-auto flex-1 bg-[#0a2924] hover:bg-[#071d1a] text-white rounded-full py-3 px-6 text-xs font-bold uppercase tracking-wider shadow-sm transition-colors flex items-center justify-center gap-2 cursor-pointer text-center"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Go Home</span>
            </Link>
            <button
              onClick={() => history.back()}
              className="w-full sm:w-auto flex-1 bg-white hover:bg-zinc-100 border border-zinc-300 text-zinc-700 rounded-full py-3 px-6 text-xs font-bold uppercase tracking-wider shadow-2xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Go Back</span>
            </button>
          </div>
        </div>

        <p className="text-center text-[10px] font-extrabold text-zinc-400 mt-6 uppercase tracking-widest">
          NexBrix
        </p>
      </div>
    </div>
  );
}
