"use client";

import Link from "next/link";
import { toast } from "sonner";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";
import { signInWithGoogle } from "@/lib/services/sign-in";
import { registerAdmin } from "@/lib/services/auth.service";
import { KeyRound, Mail, Eye, EyeOff, Loader2, User } from "lucide-react";

export default function SignupPage() {
  const router = useRouter();
  const { refreshProfile, fetchSession } = useAuth();

  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agree, setAgree] = useState(false);

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      await signInWithGoogle();
    } catch (err) {
      console.error(err);
      if (err instanceof Error) {
        toast.error(err.message);
      } else {
        toast.error("Failed to sign up. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedFullName = fullName.trim();
    if (!trimmedFullName || !email || !password || !confirmPassword) {
      toast.error("Please fill in all fields.");
      return;
    }

    if (!agree) {
      toast.error("Please agree to the Terms & Conditions and Privacy Policy.");
      return;
    }

    const trimmedEmail = email.trim();

    if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      toast.error("Please enter a valid email address.");
      return;
    }

    if (trimmedFullName.length < 3 || trimmedFullName.length > 50) {
      toast.error("Full name must be between 3 and 50 characters long.");
      return;
    }

    if (password.length < 8 || password.length > 50) {
      toast.error("Password must be between 8 and 50 characters long.");
      return;
    }

    if (confirmPassword.length < 8 || confirmPassword.length > 50) {
      toast.error("Confirm password must be between 8 and 50 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);
      await registerAdmin(email, password, trimmedFullName);
      await fetchSession();
      await refreshProfile();
      router.push("/dashboard/business");
    } catch (err) {
      console.error(err);
      if (err instanceof Error) {
        toast.error(err.message);
      } else {
        toast.error("Failed to create account. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-[#F1F5F9] font-sans">
      <div className="relative w-full max-w-md mx-4 z-10">
        <div className="bg-white border border-zinc-200 rounded-2xl p-8 shadow-xl shadow-zinc-200/50">
          <div className="flex flex-col items-center mb-6 text-center">
            <div className="h-12 w-12 rounded-xl bg-[#DCFCE7] border border-[#16A34A]/20 flex items-center justify-center mb-4">
              <span className="text-[#16A34A] font-extrabold text-2xl tracking-tighter">
                S
              </span>
            </div>
            <h1 className="text-3xl font-extrabold text-[#0F172A] tracking-tight">
              Stock Track
            </h1>
            <p className="text-[#64748B] text-sm mt-1">
              Get started with hospitality inventory intelligence
            </p>
          </div>

          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#0F172A] uppercase tracking-wider block">
                Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
                  <User className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  placeholder="Enter your name"
                  className="w-full bg-white border border-zinc-300 focus:border-[#16A34A] rounded-xl py-2.5 pl-10 pr-4 text-sm text-zinc-950 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-[#16A34A] transition-all"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#0F172A] uppercase tracking-wider block">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="w-full bg-white border border-zinc-300 focus:border-[#16A34A] rounded-xl py-2.5 pl-10 pr-4 text-sm text-zinc-950 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-[#16A34A] transition-all"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#0F172A] uppercase tracking-wider block">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
                  <KeyRound className="h-4 w-4" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  className="w-full bg-white border border-zinc-300 focus:border-[#16A34A] rounded-xl py-2.5 pl-10 pr-10 text-sm text-zinc-950 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-[#16A34A] transition-all"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-400 hover:text-zinc-600 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#0F172A] uppercase tracking-wider block">
                Confirm Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
                  <KeyRound className="h-4 w-4" />
                </div>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Reenter your password"
                  className="w-full bg-white border border-zinc-300 focus:border-[#16A34A] rounded-xl py-2.5 pl-10 pr-10 text-sm text-zinc-950 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-[#16A34A] transition-all"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-400 hover:text-zinc-600 transition-colors"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-zinc-300 text-[#16A34A] focus:ring-[#16A34A] cursor-pointer"
                  checked={agree}
                  onChange={(e) => setAgree(e.target.checked)}
                  disabled={loading}
                />
                <span className="text-xs font-semibold text-zinc-700 leading-tight select-none">
                  I agree to the{" "}
                  <Link href="/terms" className="text-[#16A34A] hover:underline" target="_blank">
                    Terms &amp; Conditions
                  </Link>{" "}
                  and{" "}
                  <Link href="/privacy-policy" className="text-[#16A34A] hover:underline" target="_blank">
                    Privacy Policy
                  </Link>
                </span>
              </label>
              
              <p className="text-[11px] text-zinc-500 leading-normal">
                By creating an account, you acknowledge that StockTrack is business assistance software and that you have read and accepted our{" "}
                <Link href="/terms" className="text-[#16A34A] hover:underline" target="_blank">
                  Terms &amp; Conditions
                </Link>
                .
              </p>
            </div>

            <button
              type="submit"
              disabled={
                loading ||
                !fullName.trim() ||
                !email.trim() ||
                !password ||
                !confirmPassword ||
                !agree
              }
              className={`w-full mt-2 bg-primary-green hover:bg-green-700 active:bg-green-800 text-white rounded-xl py-3 text-sm font-semibold tracking-wide shadow-md shadow-zinc-200 transition-all duration-200 flex items-center justify-center gap-2  disabled:opacity-50 ${loading || !fullName.trim() || !email.trim() || !password || !confirmPassword || !agree ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating Account...
                </>
              ) : (
                "Create Account"
              )}
            </button>
          </form>

          <div className="relative my-5 flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-200"></div>
            </div>
            <div className="relative bg-white px-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Or continue with
            </div>
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full bg-white hover:bg-zinc-50 border border-zinc-300 active:bg-zinc-100 text-zinc-700 rounded-xl py-3 text-sm font-semibold tracking-wide shadow-sm transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              x="0px"
              y="0px"
              width="28"
              height="22"
              viewBox="0 0 48 48"
            >
              <path
                fill="#FFC107"
                d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"
              ></path>
              <path
                fill="#FF3D00"
                d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"
              ></path>
              <path
                fill="#4CAF50"
                d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"
              ></path>
              <path
                fill="#1976D2"
                d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"
              ></path>
            </svg>
            Google
          </button>

          <div className="mt-6 text-center text-xs font-semibold text-zinc-500">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-[#16A34A] hover:underline font-extrabold"
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
