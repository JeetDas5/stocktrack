"use client";

import React from "react";
import { motion } from "framer-motion";
import { Settings } from "lucide-react";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const router = useRouter();

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center bg-white text-black p-6 select-none">
      <div className="max-w-md w-full text-center space-y-8">
        {/* Elegant Animated Gear */}
        <motion.div
          initial={{ rotate: 0 }}
          animate={{ rotate: 360 }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          className="inline-flex items-center justify-center w-16 h-16 rounded-full border border-zinc-200 bg-zinc-50"
        >
          <Settings className="w-8 h-8 text-black stroke-[1.25]" />
        </motion.div>

        {/* Title and Status Badge */}
        <div className="space-y-3">
          <h1 className="text-3xl font-light tracking-tight text-black uppercase">
            Settings
          </h1>
          <div className="inline-block px-3 py-1 rounded-full border border-black/10 bg-zinc-50 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
            Coming Soon
          </div>
        </div>

        {/* Description */}
        <p className="text-zinc-500 text-sm font-medium leading-relaxed max-w-xs mx-auto">
          We are designing a modular configuration suite to fine-tune your stock preferences, user roles, and POS integrations.
        </p>

        {/* Action Button */}
        <div className="pt-2">
          <button
            onClick={() => router.push("/dashboard")}
            className="inline-flex items-center justify-center px-6 py-2.5 rounded-full border border-black bg-black text-white hover:bg-white hover:text-black transition-all duration-300 text-xs font-bold uppercase tracking-widest cursor-pointer"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
