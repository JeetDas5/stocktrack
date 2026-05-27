"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { loginAdmin } from "@/lib/services/auth.service";
import { useAuth } from "@/providers/auth-provider";
import { KeyRound, Mail, Eye, EyeOff, Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { refreshProfile } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await loginAdmin(email, password);
      await refreshProfile();
      router.push("/business");
    } catch (err: any) {
      console.error(err);
      setError("Invalid email or password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-[#F1F5F9] font-sans">
      <div className="relative w-full max-w-md mx-4 z-10">
        <div className="bg-white border border-zinc-200 rounded-2xl p-8 shadow-xl shadow-zinc-200/50">
          
          <div className="flex flex-col items-center mb-8 text-center">
            <div className="h-12 w-12 rounded-xl bg-[#DCFCE7] border border-[#16A34A]/20 flex items-center justify-center mb-4">
              <span className="text-[#16A34A] font-extrabold text-2xl tracking-tighter">S</span>
            </div>
            <h1 className="text-3xl font-extrabold text-[#0F172A] tracking-tight">StockTrack</h1>
            <p className="text-[#64748B] text-sm mt-1">Hospitality Inventory Intelligence Portal</p>
          </div>

          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-600 text-xs rounded-xl p-3 mb-6 text-center font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#0F172A] uppercase tracking-wider block">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="email"
                  placeholder="admin@email.com"
                  className="w-full bg-white border border-zinc-300 focus:border-[#16A34A] rounded-xl py-3 pl-10 pr-4 text-sm text-zinc-950 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-[#16A34A] transition-all"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-[#0F172A] uppercase tracking-wider block">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
                  <KeyRound className="h-4 w-4" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="w-full bg-white border border-zinc-300 focus:border-[#16A34A] rounded-xl py-3 pl-10 pr-10 text-sm text-zinc-950 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-[#16A34A] transition-all"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-400 hover:text-zinc-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary-green hover:bg-green-700 active:bg-green-800 text-white rounded-xl py-3 text-sm font-semibold tracking-wide shadow-md shadow-zinc-200 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Authenticating...
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-xs font-semibold text-zinc-500">
            Don't have an account?{" "}
            <Link href="/signup" className="text-[#16A34A] hover:underline font-extrabold">
              Sign Up
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}
