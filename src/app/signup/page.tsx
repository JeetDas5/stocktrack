"use client";

import Link from "next/link";
import { toast } from "sonner";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Mail,
  User,
  Loader2,
  ArrowRight,
  Sparkles,
  KeyRound,
} from "lucide-react";

import { useAuth } from "@/providers/auth-provider";
import { sendOtp, verifyOtp } from "@/lib/services/auth.service";
import { updateMeProfile } from "@/lib/repositories/user.repository";
import { authClient } from "@/lib/auth/auth-client";
import { getStaffInvitation, registerStaffInvitation } from "@/lib/repositories/staff.repository";
import { Reveal, RevealText } from "@/components/site/Reveal";

export default function SignupPage() {
  const router = useRouter();
  const { refreshProfile, fetchSession, loading: authLoading, user, profile } = useAuth();

  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [agree, setAgree] = useState(false);
  const [otp, setOtp] = useState("");

  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const [token, setToken] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [validatingToken, setValidatingToken] = useState(true);
  const [isEmailLocked, setIsEmailLocked] = useState(false);
  const [timer, setTimer] = useState(0);
  const registrationStarted = useRef(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timer]);

  // Validate token query parameter immediately on load
  useEffect(() => {
    async function validateToken() {
      const searchParams = new URLSearchParams(window.location.search);
      const tokenVal = searchParams.get("token");
      if (!tokenVal) {
        router.replace("/login");
        return;
      }
      setToken(tokenVal);
      try {
        setValidatingToken(true);
        const invite = await getStaffInvitation(tokenVal);
        if (invite.status === "expired" || invite.status === "completed") {
          setInviteError("This invitation link has expired or has already been used.");
        } else if (invite.email) {
          setEmail(invite.email);
          setIsEmailLocked(true);
        }
      } catch (err) {
        setInviteError("The invitation token is invalid or does not exist.");
      } finally {
        setValidatingToken(false);
      }
    }
    validateToken();
  }, [router]);

  // Once authenticated (from OTP or Google), complete invitation registration automatically!
  useEffect(() => {
    const currentToken = token;
    if (!authLoading && user && profile && currentToken && !registrationStarted.current) {
      registrationStarted.current = true;
      async function autoRegister() {
        try {
          setLoading(true);
          await registerStaffInvitation(currentToken as string, {
            name: fullName.trim() || profile?.fullName || (user?.displayName ?? "") || "Owner",
            phone: profile?.phone || "",
          });
          toast.success("Account registration completed successfully!");
          await fetchSession();
          await refreshProfile();
          router.replace("/dashboard/profile");
        } catch (err) {
          console.error("Failed to complete automatic registration:", err);
          setInviteError("Failed to link your account to the invitation. Please try again.");
        } finally {
          setLoading(false);
        }
      }
      autoRegister();
    }
  }, [authLoading, user, profile, token, router]);

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const trimmedEmail = email.trim();
    const trimmedName = fullName.trim();

    if (!trimmedName || !trimmedEmail) {
      toast.error("Please fill in all fields.");
      return;
    }

    if (!agree) {
      toast.error("Please agree to the Terms & Conditions and Privacy Policy.");
      return;
    }

    if (trimmedName.length < 3 || trimmedName.length > 50) {
      toast.error("Full name must be between 3 and 50 characters long.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      toast.error("Please enter a valid email address.");
      return;
    }

    try {
      setLoading(true);
      await sendOtp(trimmedEmail);
      setOtpSent(true);
      setTimer(60);
      toast.success("Verification code sent to your email!");
    } catch (err) {
      console.error(err);
      if (err instanceof Error) {
        toast.error(err.message);
      } else {
        toast.error("Failed to send verification code. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = email.trim();
    const trimmedOtp = otp.trim();

    if (!trimmedOtp || trimmedOtp.length !== 6) {
      toast.error("Please enter a valid 6-digit verification code.");
      return;
    }

    try {
      setLoading(true);
      await verifyOtp(trimmedEmail, trimmedOtp);
      toast.success("Email verified successfully!");

      await fetchSession();
      await refreshProfile();
      if (!token) {
        router.push("/dashboard/profile");
      }
    } catch (err) {
      console.error(err);
      if (err instanceof Error) {
        toast.error(err.message);
      } else {
        toast.error(
          "Verification failed. Please check the code and try again.",
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      const callbackUrl = token
        ? `${window.location.origin}/signup?token=${token}`
        : `${window.location.origin}/dashboard/business`;
      await authClient.signIn.social({
        provider: "google",
        callbackURL: callbackUrl,
        errorCallbackURL: "/login",
        newUserCallbackURL: callbackUrl,
      });
    } catch (err) {
      console.error(err);
      if (err instanceof Error) {
        toast.error(err.message);
      } else {
        toast.error("Failed to authenticate with Google. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (validatingToken) {
    return (
      <main className="min-h-screen bg-white flex flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 text-neutral-900 animate-spin mb-4" />
        <p className="text-neutral-500 text-sm font-semibold uppercase tracking-wider animate-pulse">
          Validating invitation...
        </p>
      </main>
    );
  }

  if (inviteError) {
    return (
      <main className="min-h-screen bg-white flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-3xl border border-neutral-200 bg-white p-8 lg:p-10 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.15)] text-center animate-scale-in animate-duration-300">
          <div className="h-12 w-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-6">
            <Sparkles className="w-6 h-6 rotate-45" />
          </div>
          <h2 className="text-2xl font-semibold tracking-tight text-neutral-900">
            Invalid Invitation
          </h2>
          <p className="mt-4 text-[#64748B] text-[13px] font-medium leading-relaxed">
            {inviteError}
          </p>
          <button
            onClick={() => router.replace("/login")}
            className="mt-8 w-full inline-flex items-center justify-center bg-neutral-900 text-white px-6 py-3.5 rounded-full text-[15px] font-medium hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            Go to Login
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white">
      <section className="pt-36 lg:pt-24 pb-28 lg:pb-40">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 grid lg:grid-cols-12 gap-16 items-center">
          <div className="lg:col-span-6">
            <Reveal>
              <div className="text-[12px] tracking-[0.2em] uppercase text-neutral-500">
                Get started
              </div>
            </Reveal>
            <h1 className="mt-6 text-[44px] sm:text-[60px] md:text-[80px] font-semibold tracking-tightest leading-none text-neutral-900 text-balance">
              <RevealText text="Create" />
              <br />
              <RevealText
                text="account."
                delay={0.15}
                className="text-neutral-400"
              />
            </h1>
            <Reveal delay={0.4}>
              <p className="mt-8 max-w-md text-[17px] leading-relaxed text-neutral-600">
                Sign up for your NexBrix workspace. Enter your name and email
                to receive a secure verification code.
              </p>
            </Reveal>
            <Reveal delay={0.5}>
              <div className="mt-10 inline-flex items-center gap-2 text-[13px] text-neutral-600 rounded-full border border-neutral-200 bg-neutral-50 px-3.5 py-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Already have an account?
                <Link
                  href="/login"
                  className="text-neutral-900 font-medium underline-offset-4 hover:underline"
                >
                  Sign in
                </Link>
              </div>
            </Reveal>
          </div>

          <Reveal delay={0.15} className="lg:col-span-6">
            <div className="rounded-3xl border border-neutral-200 bg-white p-8 lg:p-10 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.15)]">
              {!otpSent ? (
                <form onSubmit={handleSendOtp} className="space-y-5">
                  <div>
                    <label className="text-[12px] font-medium tracking-wide text-neutral-700">
                      Full Name
                    </label>
                    <div className="mt-2 relative">
                      <User className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required
                        placeholder="John Doe"
                        disabled={loading}
                        className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-neutral-200 bg-white text-[15px] focus:outline-none focus:border-neutral-900 focus:ring-4 focus:ring-neutral-900/5 transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[12px] font-medium tracking-wide text-neutral-700">
                      Email Address
                    </label>
                    <div className="mt-2 relative">
                      <Mail className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        placeholder="you@business.com"
                        disabled={loading || isEmailLocked}
                        className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-neutral-200 bg-white text-[15px] focus:outline-none focus:border-neutral-900 focus:ring-4 focus:ring-neutral-900/5 transition disabled:opacity-75 disabled:bg-neutral-50"
                      />
                    </div>
                  </div>

                  <div className="space-y-3 pt-1">
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        className="mt-0.5 h-4 w-4 rounded border-neutral-200 text-neutral-900 focus:ring-neutral-900 cursor-pointer"
                        checked={agree}
                        onChange={(e) => setAgree(e.target.checked)}
                        disabled={loading}
                      />
                      <span className="text-[12px] text-neutral-600 leading-tight select-none">
                        I agree to the{" "}
                        <Link
                          href="/terms"
                          className="text-neutral-900 font-medium underline-offset-4 hover:underline"
                          target="_blank"
                        >
                          Terms &amp; Conditions
                        </Link>{" "}
                        and{" "}
                        <Link
                          href="/privacy-policy"
                          className="text-neutral-900 font-medium underline-offset-4 hover:underline"
                          target="_blank"
                        >
                          Privacy Policy
                        </Link>
                      </span>
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={
                      loading || !fullName.trim() || !email.trim() || !agree
                    }
                    className="w-full inline-flex items-center justify-center gap-2 bg-neutral-900 text-white px-6 py-3.5 rounded-full text-[15px] font-medium hover:bg-neutral-800 transition-all hover:gap-3 disabled:opacity-60"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Sending Code...
                      </>
                    ) : (
                      <>
                        Send Verification Code{" "}
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-5">
                  <div className="text-center pb-2">
                    <p className="text-[14px] text-neutral-600">
                      We sent a 6-digit verification code to
                    </p>
                    <p className="text-[14px] font-semibold text-neutral-900 mt-1">
                      {email}
                    </p>
                  </div>

                  <div>
                    <label className="text-[12px] font-medium tracking-wide text-neutral-700">
                      Verification Code
                    </label>
                    <div className="mt-2 relative">
                      <KeyRound className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
                      <input
                        type="text"
                        value={otp}
                        onChange={(e) =>
                          setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                        }
                        required
                        placeholder="123456"
                        disabled={loading}
                        className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-neutral-200 bg-white text-[15px] tracking-[0.25em] font-semibold focus:outline-none focus:border-neutral-900 focus:ring-4 focus:ring-neutral-900/5 transition text-center"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || otp.trim().length !== 6}
                    className="w-full inline-flex items-center justify-center gap-2 bg-neutral-900 text-white px-6 py-3.5 rounded-full text-[15px] font-medium hover:bg-neutral-800 transition-all hover:gap-3 disabled:opacity-60"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      <>
                        Verify &amp; Create Account{" "}
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  <div className="flex items-center justify-between text-[13px] pt-2">
                    {timer > 0 ? (
                      <span className="text-neutral-400 font-medium select-none">
                        Resend in {timer}s
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSendOtp()}
                        disabled={loading}
                        className="text-neutral-500 hover:text-neutral-900 font-medium transition-colors"
                      >
                        Resend Code
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setOtpSent(false);
                        setOtp("");
                      }}
                      disabled={loading}
                      className="text-neutral-500 hover:text-neutral-900 font-medium transition-colors"
                    >
                      Change Email
                    </button>
                  </div>
                </form>
              )}

              {!otpSent && (
                <>
                  <div className="my-6 flex items-center gap-3">
                    <div className="h-px flex-1 bg-neutral-200" />
                    <span className="text-[11px] tracking-[0.18em] uppercase text-neutral-400">
                      or
                    </span>
                    <div className="h-px flex-1 bg-neutral-200" />
                  </div>

                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={loading}
                    className="w-full inline-flex items-center justify-center gap-3 bg-white text-neutral-900 px-6 py-3.5 rounded-xl text-[15px] font-medium border border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50 transition-colors disabled:opacity-60"
                  >
                    <svg
                      className="w-5 h-5"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
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
                </>
              )}

              <div className="mt-8 pt-6 border-t border-neutral-100 text-center">
                <p className="text-[12px] text-neutral-500">
                  Already have an account?{" "}
                  <Link
                    href="/login"
                    className="text-neutral-900 font-medium underline-offset-4 hover:underline"
                  >
                    Sign in
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
