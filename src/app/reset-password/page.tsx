"use client";

import Link from "next/link";
import { toast } from "sonner";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { authClient } from "@/lib/auth/auth-client";
import {
  KeyRound,
  Eye,
  EyeOff,
  Loader2,
  ArrowLeft,
  CheckCircle2,
} from "lucide-react";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      toast.error("Invalid or missing password reset token.");
      return;
    }

    if (!password || !confirmPassword) {
      toast.error("Please fill in both password fields.");
      return;
    }

    if (password.length < 8) {
      toast.error("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);

      const result = await authClient.resetPassword({
        newPassword: password,
        token: token,
      });

      if (result.error) {
        throw new Error(result.error.message || "Failed to reset password.");
      }

      toast.success("Password reset successfully!");
      setIsSuccess(true);

      setTimeout(() => {
        router.push("/login");
      }, 3000);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Failed to reset password. The link may have expired.",
      );
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="bg-[#0A0A0A] border border-[#222222] rounded-2xl p-8 shadow-2xl shadow-black/80 text-center">
        <h1 className="text-2xl font-extrabold text-white mb-4">
          Invalid Reset Link
        </h1>
        <p className="text-zinc-400 text-sm mb-6">
          The password reset token is missing or invalid. Please request a new
          link.
        </p>
        <Link
          href="/forgot-password"
          className="inline-flex bg-white hover:bg-zinc-200 text-black px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-200"
        >
          Request New Link
        </Link>
      </div>
    );
  }

  return (
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
          <KeyRound className="h-5 w-5" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">
          Reset Password
        </h1>
        <p className="text-zinc-400 text-sm mt-2 max-w-[280px]">
          {isSuccess
            ? "Your password has been reset. Redirecting you to login page..."
            : "Enter a strong, secure new password for your account."}
        </p>
      </div>

      {!isSuccess ? (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label
              htmlFor="password"
              className="text-xs font-bold uppercase tracking-wider text-zinc-300 block"
            >
              New Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                <KeyRound className="h-4 w-4" />
              </div>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                placeholder="At least 8 characters"
                className="w-full bg-[#111111] border border-[#222222] focus:border-white focus:ring-1 focus:ring-white rounded-xl py-3 pl-10 pr-10 text-sm text-white placeholder-zinc-600 focus:outline-none transition-all"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="confirmPassword"
              className="text-xs font-bold uppercase tracking-wider text-zinc-300 block"
            >
              Confirm New Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                <KeyRound className="h-4 w-4" />
              </div>
              <input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                required
                placeholder="Repeat new password"
                className="w-full bg-[#111111] border border-[#222222] focus:border-white focus:ring-1 focus:ring-white rounded-xl py-3 pl-10 pr-10 text-sm text-white placeholder-zinc-600 focus:outline-none transition-all"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !password || !confirmPassword}
            className="w-full bg-white hover:bg-zinc-200 active:bg-zinc-300 text-black rounded-xl py-3 text-sm font-semibold tracking-wide shadow-md transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-black" />
                Resetting password...
              </>
            ) : (
              "Save New Password"
            )}
          </button>
        </form>
      ) : (
        <div className="space-y-6 py-4 flex flex-col items-center">
          <div className="h-16 w-16 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center animate-bounce">
            <CheckCircle2 className="h-8 w-8 text-white" />
          </div>
          <p className="text-sm text-zinc-300 text-center">
            Password updated successfully. You will be redirected to the login
            screen shortly.
          </p>
        </div>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="relative min-h-screen flex items-center justify-center bg-[#000000] text-white font-sans selection:bg-white selection:text-black">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.08),transparent_70%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-size-[40px_40px] pointer-events-none" />

      <div className="relative w-full max-w-md mx-4 z-10">
        <Suspense
          fallback={
            <div className="bg-[#0A0A0A] border border-[#222222] rounded-2xl p-8 shadow-2xl shadow-black/80 flex flex-col items-center justify-center min-h-[300px]">
              <Loader2 className="h-8 w-8 animate-spin text-white mb-4" />
              <p className="text-zinc-400 text-sm">
                Loading password reset configuration...
              </p>
            </div>
          }
        >
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
