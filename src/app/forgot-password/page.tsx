"use client";

import { useState } from "react";
import Link from "next/link";
import { authClient } from "@/lib/auth/auth-client";
import { Mail, ArrowLeft, Loader2, Send } from "lucide-react";
import { toast } from "sonner";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Please enter your email address.");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch("/api/auth/check-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: email.trim() }),
      });

      if (!res.ok) {
        throw new Error("Failed to verify email address.");
      }

      const { exists } = await res.json();
      if (!exists) {
        toast.error("No account found with this email address.");
        setLoading(false);
        return;
      }

      const result = await authClient.requestPasswordReset({
        email: email.trim(),
        redirectTo: "/reset-password",
      });

      if (result.error) {
        throw new Error(
          result.error.message || "Failed to request password reset.",
        );
      }

      toast.success("Verification link sent! Check your inbox.");
      setIsSent(true);
    } catch (err) {
      if (err instanceof Error) {
        toast.error(err.message);
      } else {
        toast.error("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-[#000000] text-white font-sans selection:bg-white selection:text-black">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.08),transparent_70%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-size-[40px_40px] pointer-events-none" />

      <div className="relative w-full max-w-md mx-4 z-10">
        <div className="bg-[#0A0A0A] border border-[#222222] rounded-2xl p-8 shadow-2xl shadow-black/80 transition-all duration-300 hover:border-[#444444]">
          <div className="mb-6">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-white transition-colors group"
            >
              <ArrowLeft className="h-3 w-3 transition-transform group-hover:-translate-x-0.5" />
              Back to Login
            </Link>
          </div>

          <div className="flex flex-col items-center mb-8 text-center">
            <div className="h-12 w-12 rounded-xl bg-white text-black flex items-center justify-center mb-4 shadow-lg shadow-white/10">
              <Mail className="h-5 w-5" />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">
              Forgot Password
            </h1>
            <p className="text-zinc-400 text-sm mt-2 max-w-[280px]">
              {isSent
                ? "Check your inbox for a verification link to reset your password."
                : "Enter your registered email below to receive a password verification link."}
            </p>
          </div>

          {!isSent ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label
                  htmlFor="email"
                  className="text-xs font-bold uppercase tracking-wider text-zinc-300 block"
                >
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                    <Mail className="h-4 w-4" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    required
                    placeholder="you@example.com"
                    className="w-full bg-[#111111] border border-[#222222] focus:border-white focus:ring-1 focus:ring-white rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder-zinc-600 focus:outline-none transition-all"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !email.trim()}
                className="w-full bg-white hover:bg-zinc-200 active:bg-zinc-300 text-black rounded-xl py-3 text-sm font-semibold tracking-wide shadow-md transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-black" />
                    Checking account...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 text-black" />
                    Send Verification Link
                  </>
                )}
              </button>
            </form>
          ) : (
            <div className="space-y-6">
              <div className="p-4 bg-zinc-900/40 border border-zinc-800 rounded-xl text-center">
                <p className="text-sm text-zinc-300">
                  Verification email sent to{" "}
                  <strong className="text-white">{email}</strong>.
                </p>
              </div>
              <button
                onClick={() => setIsSent(false)}
                className="w-full bg-transparent hover:bg-zinc-900 border border-zinc-800 text-white rounded-xl py-3 text-sm font-semibold tracking-wide transition-all duration-200 flex items-center justify-center cursor-pointer"
              >
                Use another email
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
