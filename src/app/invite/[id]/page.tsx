"use client";

import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useEffect, useState, use } from "react";

import { useAuth } from "@/providers/auth-provider";
import { StaffInvitationPublic } from "@/types/staff";
import {
  getStaffInvitation,
  registerStaffInvitation,
} from "@/lib/repositories/staff.repository";
import { authClient } from "@/lib/auth/auth-client";
import { sendOtp, verifyOtp } from "@/lib/services/auth.service";
import {
  Loader2,
  Mail,
  Phone,
  User,
  CheckCircle,
  ShieldAlert,
  Sparkles,
  LogOut,
  ArrowRight,
} from "lucide-react";

export default function InvitePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const invitationId = resolvedParams.id;

  const router = useRouter();
  const {
    user,
    loading: authLoading,
    logout,
    refreshProfile,
    fetchSession,
  } = useAuth();

  const [invitation, setInvitation] = useState<StaffInvitationPublic | null>(
    null,
  );
  const [loadingInvite, setLoadingInvite] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [registered, setRegistered] = useState(false);

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      toast.error("Please enter a valid email address.");
      return;
    }

    try {
      setSendingOtp(true);
      setOtpError(null);
      await sendOtp(email.trim());
      setOtpSent(true);
      toast.success("Verification code sent to your email!");
    } catch (err) {
      if (err instanceof Error) {
        setOtpError(err.message);
        toast.error(err.message);
      } else {
        setOtpError("Failed to send verification code.");
        toast.error("Failed to send verification code.");
      }
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim() || otp.trim().length !== 6) {
      toast.error("Please enter a valid 6-digit code.");
      return;
    }

    try {
      setVerifyingOtp(true);
      setOtpError(null);
      await verifyOtp(email.trim(), otp.trim());
      toast.success("Email verified successfully!");

      // Update global auth session so user is now logged in
      await fetchSession();
      await refreshProfile();
    } catch (err) {
      if (err instanceof Error) {
        setOtpError(err.message);
        toast.error(err.message);
      } else {
        setOtpError("Verification failed. Please try again.");
        toast.error("Verification failed.");
      }
    } finally {
      setVerifyingOtp(false);
    }
  };

  useEffect(() => {
    async function loadInvitation() {
      try {
        setLoadingInvite(true);
        const data = await getStaffInvitation(invitationId);
        setInvitation(data);
        if (data.status === "expired") {
          setError(
            "This invitation link has expired. Please ask your admin for a new link.",
          );
        } else if (data.status === "completed") {
          setError("This invitation has already been used and completed.");
        }
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError(
            "Failed to load invitation. Please verify the link is correct.",
          );
        }
      } finally {
        setLoadingInvite(false);
      }
    }
    loadInvitation();
  }, [invitationId]);

  useEffect(() => {
    if (user?.displayName) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setName(user.displayName);
    }
  }, [user]);

  const handleGoogleLogin = async () => {
    try {
      const callbackUrl = `${window.location.origin}/invite/${invitationId}`;
      await authClient.signIn.social({
        provider: "google",
        callbackURL: callbackUrl,
        errorCallbackURL: callbackUrl,
        newUserCallbackURL: callbackUrl,
      });
    } catch (err) {
      if (err instanceof Error) {
        toast.error(err.message);
      } else {
        toast.error("Failed to sign in with Google.");
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Please enter your name.");
      return;
    }
    if (!phone.trim()) {
      toast.error("Please enter your phone number.");
      return;
    }

    try {
      setSubmitting(true);
      await registerStaffInvitation(invitationId, {
        name: name.trim(),
        phone: phone.trim(),
      });
      toast.success("Profile submitted successfully!");
      setRegistered(true);

      await fetchSession();
      await refreshProfile();
    } catch (err) {
      if (err instanceof Error) {
        toast.error(err.message);
      } else {
        toast.error("Failed to complete registration.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingInvite || authLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4">
        <div className="bg-white border border-zinc-200 rounded-3xl p-8 max-w-md w-full shadow-xl flex flex-col items-center justify-center">
          <Loader2 className="h-8 w-8 text-[#16A34A] animate-spin mb-4" />
          <p className="text-zinc-600 text-sm font-semibold">
            Loading invitation details...
          </p>
        </div>
      </div>
    );
  }

  if (error || !invitation) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4">
        <div className="bg-white border border-red-100 rounded-3xl p-8 max-w-md w-full shadow-xl text-center">
          <div className="h-14 w-14 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center mx-auto mb-5 text-red-500">
            <ShieldAlert className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-extrabold text-zinc-900 tracking-tight">
            Invitation Error
          </h1>
          <p className="text-zinc-500 text-sm mt-3 leading-relaxed">
            {error || "Invalid invitation"}
          </p>
          <button
            onClick={() => router.push("/login")}
            className="mt-6 w-full bg-zinc-900 hover:bg-zinc-800 text-white font-bold py-3 px-4 rounded-xl text-xs uppercase tracking-wider transition duration-200 cursor-pointer"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4 font-sans select-none relative overflow-hidden">
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-green-200/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-200/20 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-lg z-10">
        <div className="bg-white border border-zinc-200/80 rounded-3xl p-8 shadow-xl shadow-zinc-200/30">
          <div className="flex flex-col items-center text-center mb-8">
            <div className="h-14 w-14 rounded-2xl bg-[#DCFCE7] border border-[#16A34A]/20 flex items-center justify-center mb-4">
              <Sparkles className="h-7 w-7 text-[#16A34A]" />
            </div>
            <h1 className="text-3xl font-extrabold text-[#0F172A] tracking-tight">
              Join the Team
            </h1>
            <p className="text-[#64748B] text-xs font-bold uppercase tracking-wider mt-1.5">
              NexBrix Staff Onboarding
            </p>
          </div>

          <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-5 mb-8 text-center py-4">
            <p className="text-sm font-extrabold text-[#0F172A] leading-relaxed">
              <span className="text-[#16A34A]">
                {invitation.invited_by || "An administrator"}
              </span>{" "}
              invited you for Staff Onboarding
            </p>
            <p className="text-xs text-zinc-500 font-semibold mt-2 leading-relaxed">
              Please register below to submit your details. Once registered, the
              company administrator will configure your access role, business,
              and locations.
            </p>
          </div>

          {registered ? (
            <div className="text-center space-y-6 animate-scale-in">
              <div className="h-16 w-16 rounded-full bg-[#DCFCE7] border border-[#16A34A]/20 flex items-center justify-center mx-auto text-[#16A34A]">
                <CheckCircle className="h-9 w-9 stroke-[2.5px]" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-extrabold text-zinc-900 tracking-tight">
                  Profile Submitted!
                </h2>
                <p className="text-zinc-500 text-xs font-semibold leading-relaxed max-w-sm mx-auto">
                  Your request has been routed to the Company Admin for
                  approval. You will receive access once approved.
                </p>
              </div>

              <div className="border-t border-zinc-200 pt-6">
                <button
                  onClick={() => router.push("/dashboard/profile")}
                  className="w-full bg-zinc-950 hover:bg-zinc-900 text-white rounded-xl py-3 text-xs font-bold uppercase tracking-wider shadow-md transition duration-200 flex items-center justify-center gap-2 cursor-pointer"
                >
                  Go to Profile
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : !user ? (
            !otpSent ? (
              <div className="space-y-6 animate-scale-in text-center">
                <div className="space-y-2">
                  <h2 className="text-xl font-bold text-zinc-800">
                    Authentication Required
                  </h2>
                  <p className="text-zinc-500 text-xs font-semibold leading-relaxed max-w-xs mx-auto">
                    Please choose an authentication option to automatically
                    verify your professional identity.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  className="w-full bg-white hover:bg-zinc-50 border border-zinc-300 active:bg-zinc-100 text-zinc-700 rounded-xl py-3.5 text-sm font-semibold tracking-wide shadow-sm transition-all duration-200 flex items-center justify-center gap-2.5 cursor-pointer"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    x="0px"
                    y="0px"
                    width="22"
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
                  Continue with Google
                </button>

                <div className="relative flex items-center justify-center my-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-zinc-200"></div>
                  </div>
                  <span className="relative px-3 bg-white text-[10px] font-extrabold text-zinc-400 uppercase tracking-widest">
                    or use email verification
                  </span>
                </div>

                <form onSubmit={handleSendOtp} className="space-y-4 text-left">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold text-[#0F172A] uppercase tracking-wider block">
                      Email Address
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                        <Mail className="h-4 w-4" />
                      </div>
                      <input
                        type="email"
                        required
                        placeholder="Enter your email"
                        className="w-full bg-white border border-zinc-300 focus:border-[#16A34A] rounded-xl py-3 pl-10 pr-4 text-xs text-zinc-950 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-[#16A34A] transition-all"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={sendingOtp}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={sendingOtp || !email.trim()}
                    className="w-full bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl py-3.5 text-xs font-bold uppercase tracking-wider shadow-sm transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {sendingOtp ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Sending Code...
                      </>
                    ) : (
                      "Send Verification Code"
                    )}
                  </button>
                </form>
              </div>
            ) : (
              <div className="space-y-6 animate-scale-in text-center">
                <div className="space-y-2">
                  <h2 className="text-xl font-bold text-zinc-800">
                    Verify Email Address
                  </h2>
                  <p className="text-zinc-500 text-xs font-semibold leading-relaxed max-w-xs mx-auto">
                    We sent a 6-digit verification code to{" "}
                    <span className="font-bold text-zinc-800">{email}</span>.
                  </p>
                </div>

                <form
                  onSubmit={handleVerifyOtp}
                  className="space-y-4 text-left"
                >
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold text-[#0F172A] uppercase tracking-wider block">
                      Verification Code
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      placeholder="Enter 6-digit code"
                      className="w-full text-center bg-white border border-zinc-300 focus:border-[#16A34A] rounded-xl py-3.5 text-base font-extrabold tracking-[0.4em] text-zinc-950 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-[#16A34A] transition-all"
                      value={otp}
                      onChange={(e) =>
                        setOtp(
                          e.target.value.replace(/\D/g, "").substring(0, 6),
                        )
                      }
                      disabled={verifyingOtp}
                    />
                  </div>

                  {otpError && (
                    <p className="text-red-500 text-[11px] font-bold text-center mt-1">
                      {otpError}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={verifyingOtp || otp.trim().length !== 6}
                    className="w-full bg-[#16A34A] hover:bg-[#15803D] text-white rounded-xl py-3.5 text-xs font-bold uppercase tracking-wider shadow-sm transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {verifyingOtp ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Verifying Code...
                      </>
                    ) : (
                      "Verify Code"
                    )}
                  </button>

                  <div className="flex justify-between items-center text-xs pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setOtpSent(false);
                        setOtp("");
                      }}
                      className="text-zinc-500 hover:text-zinc-800 font-bold transition cursor-pointer"
                    >
                      Go Back
                    </button>
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={sendingOtp}
                      className="text-[#16A34A] hover:text-[#15803D] font-bold transition cursor-pointer disabled:opacity-50"
                    >
                      {sendingOtp ? "Resending..." : "Resend Code"}
                    </button>
                  </div>
                </form>
              </div>
            )
          ) : (
            <form
              onSubmit={handleSubmit}
              className="space-y-6 animate-scale-in"
            >
              <div className="flex justify-between items-center text-xs font-semibold text-zinc-500">
                <span>LOGGED IN AS:</span>
                <button
                  type="button"
                  onClick={logout}
                  className="text-red-500 hover:text-red-600 font-bold flex items-center gap-1.5 cursor-pointer bg-none border-none p-0 focus:outline-none"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Sign Out
                </button>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold text-[#0F172A] uppercase tracking-wider block">
                  Email Address (Verified)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                    <Mail className="h-4 w-4" />
                  </div>
                  <input
                    type="email"
                    readOnly
                    disabled
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-3 pl-10 pr-4 text-xs text-zinc-500 font-semibold focus:outline-none select-none cursor-not-allowed"
                    value={user.email || ""}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold text-[#0F172A] uppercase tracking-wider block">
                  Full Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                    <User className="h-4 w-4" />
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="Enter your name"
                    className="w-full bg-white border border-zinc-300 focus:border-[#16A34A] rounded-xl py-3 pl-10 pr-4 text-xs text-zinc-950 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-[#16A34A] transition-all"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={submitting}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold text-[#0F172A] uppercase tracking-wider block">
                  Phone Number
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                    <Phone className="h-4 w-4" />
                  </div>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 98765 43210"
                    className="w-full bg-white border border-zinc-300 focus:border-[#16A34A] rounded-xl py-3 pl-10 pr-4 text-xs text-zinc-950 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-[#16A34A] transition-all"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={submitting}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting || !name.trim() || !phone.trim()}
                className="w-full bg-[#16A34A] hover:bg-[#15803D] active:bg-[#14532D] text-white rounded-xl py-3.5 text-xs font-bold uppercase tracking-wider shadow-md shadow-zinc-200 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Submitting Registration...
                  </>
                ) : (
                  "Complete Registration"
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
