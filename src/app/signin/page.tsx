"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Mail, Lock, Sparkles } from "lucide-react";
import { Reveal, RevealText } from "@/components/site/Reveal";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("idle");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("soon");
  };

  return (
    <main className="min-h-screen bg-white">
      <section className="pt-36 lg:pt-44 pb-28 lg:pb-40">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 grid lg:grid-cols-12 gap-16 items-center">
          <div className="lg:col-span-6">
            <Reveal>
              <div className="text-[12px] tracking-[0.2em] uppercase text-neutral-500">
                Customer portal
              </div>
            </Reveal>
            <h1 className="mt-6 text-[44px] sm:text-[60px] md:text-[80px] font-semibold tracking-tightest leading-[1] text-neutral-900 text-balance">
              <RevealText text="Welcome" />
              <br />
              <RevealText
                text="back."
                delay={0.15}
                className="text-neutral-400"
              />
            </h1>
            <Reveal delay={0.4}>
              <p className="mt-8 max-w-md text-[17px] leading-relaxed text-neutral-600">
                Sign in to your NexBrix workspace. Early Access members can use
                the credentials shared by our team.
              </p>
            </Reveal>
            <Reveal delay={0.5}>
              <div className="mt-10 inline-flex items-center gap-2 text-[13px] text-neutral-600 rounded-full border border-neutral-200 bg-neutral-50 px-3.5 py-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Don’t have an account yet?
                <Link
                  href="/contact?demo=1"
                  className="text-neutral-900 font-medium underline-offset-4 hover:underline"
                >
                  Request access
                </Link>
              </div>
            </Reveal>
          </div>

          <Reveal delay={0.15} className="lg:col-span-6">
            <div className="rounded-3xl border border-neutral-200 bg-white p-8 lg:p-10 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.15)]">
              <button
                type="button"
                onClick={() => setStatus("soon")}
                className="w-full inline-flex items-center justify-center gap-3 bg-white text-neutral-900 px-6 py-3.5 rounded-xl text-[15px] font-medium border border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50 transition-colors"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.75h3.57c2.08-1.92 3.28-4.74 3.28-8.07z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.75c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A10.99 10.99 0 0 0 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.12c-.22-.66-.35-1.36-.35-2.12s.13-1.46.35-2.12V7.04H2.18A10.99 10.99 0 0 0 1 12c0 1.78.43 3.46 1.18 4.96l3.66-2.84z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.04l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"
                  />
                </svg>
                Continue with Google
              </button>

              <div className="my-6 flex items-center gap-3">
                <div className="h-px flex-1 bg-neutral-200" />
                <span className="text-[11px] tracking-[0.18em] uppercase text-neutral-400">
                  or
                </span>
                <div className="h-px flex-1 bg-neutral-200" />
              </div>

              <form onSubmit={submit} className="space-y-5">
                <div>
                  <label className="text-[12px] font-medium tracking-wide text-neutral-700">
                    Email
                  </label>
                  <div className="mt-2 relative">
                    <Mail className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="you@business.com"
                      className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-neutral-200 bg-white text-[15px] focus:outline-none focus:border-neutral-900 focus:ring-4 focus:ring-neutral-900/5 transition"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-[12px] font-medium tracking-wide text-neutral-700">
                      Password
                    </label>
                    <Link
                      href="/contact"
                      className="text-[12px] text-neutral-500 hover:text-neutral-900"
                    >
                      Forgot?
                    </Link>
                  </div>
                  <div className="mt-2 relative">
                    <Lock className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      placeholder="••••••••"
                      className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-neutral-200 bg-white text-[15px] focus:outline-none focus:border-neutral-900 focus:ring-4 focus:ring-neutral-900/5 transition"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full inline-flex items-center justify-center gap-2 bg-neutral-900 text-white px-6 py-3.5 rounded-full text-[15px] font-medium hover:bg-neutral-800 transition-all hover:gap-3"
                >
                  Sign in <ArrowRight className="w-4 h-4" />
                </button>

                {status === "soon" && (
                  <div className="text-center text-[13px] text-neutral-500 pt-2">
                    The customer portal is launching soon. Until then,{" "}
                    <Link
                      href="/contact?demo=1"
                      className="text-neutral-900 underline-offset-4 hover:underline"
                    >
                      request a demo
                    </Link>
                    .
                  </div>
                )}
              </form>

              <div className="mt-8 pt-6 border-t border-neutral-100 text-center">
                <p className="text-[12px] text-neutral-500">
                  New to NexBrix?{" "}
                  <Link
                    href="/contact?demo=1"
                    className="text-neutral-900 font-medium underline-offset-4 hover:underline"
                  >
                    Request a demo
                  </Link>
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </main>
  );
}
