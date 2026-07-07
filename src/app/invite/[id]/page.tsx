"use client";

import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Image from "next/image";
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
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [countryCode, setCountryCode] = useState("+61");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [registered, setRegistered] = useState(false);

  const handleCountryCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    let sanitized = value.replace(/[^+\d]/g, "");
    if (sanitized.includes("+")) {
      sanitized = "+" + sanitized.replace(/\+/g, "");
    }
    setCountryCode(sanitized);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const sanitized = value.replace(/[^\d]/g, "");
    setPhone(sanitized);
  };

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [resendTimer, setResendTimer] = useState(0);

  useEffect(() => {
    if (resendTimer <= 0) return;
    const interval = setInterval(() => {
      setResendTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [resendTimer]);

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
      setResendTimer(60);
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
      const partsList = user.displayName.trim().split(/\s+/);
      if (partsList.length > 0) {
        setFirstName(partsList[0]);
      }
      if (partsList.length > 1) {
        setLastName(partsList.slice(1).join(" "));
      }
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
    if (!firstName.trim()) {
      toast.error("Please enter your first name.");
      return;
    }
    if (!lastName.trim()) {
      toast.error("Please enter your last name.");
      return;
    }
    if (!name.trim()) {
      toast.error("Please enter your preferred name.");
      return;
    }
    if (!phone.trim()) {
      toast.error("Please enter your phone number.");
      return;
    }

    try {
      setSubmitting(true);
      const combinedPhone = phone.trim() ? `${countryCode} ${phone.trim()}`.trim() : "";
      await registerStaffInvitation(invitationId, {
        name: name.trim(),
        phone: combinedPhone,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
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
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 grain-bg opacity-[0.05]" />
        </div>
        <div className="bg-white border border-neutral-200 rounded-3xl p-8 max-w-sm w-full shadow-[0_20px_50px_-12px_rgba(0,0,0,0.03)] flex flex-col items-center justify-center z-10">
          <Loader2
            className="h-8 w-8 text-neutral-900 animate-spin mb-4"
            strokeWidth={1.5}
          />
          <p className="text-neutral-500 text-[13px] font-medium tracking-tight">
            Loading invitation details...
          </p>
        </div>
      </div>
    );
  }

  if (error || !invitation) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 grain-bg opacity-[0.05]" />
        </div>
        <div className="bg-white border border-neutral-200 rounded-3xl p-8 max-w-sm w-full shadow-[0_20px_50px_-12px_rgba(0,0,0,0.03)] text-center z-10">
          <div className="h-12 w-12 rounded-full border border-neutral-200 flex items-center justify-center mx-auto mb-5 text-neutral-900 bg-neutral-50">
            <ShieldAlert className="h-5 w-5" strokeWidth={1.5} />
          </div>
          <h1 className="text-xl font-semibold text-neutral-900 tracking-tightest">
            Invitation Error
          </h1>
          <p className="text-neutral-500 text-[13px] mt-2.5 leading-relaxed font-medium">
            {error || "Invalid invitation"}
          </p>
          <button
            onClick={() => router.push("/login")}
            className="mt-6 w-full bg-neutral-900 hover:bg-neutral-800 text-white font-medium py-3 px-4 rounded-full text-[13px] transition-colors cursor-pointer"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 font-sans select-none relative overflow-hidden">
      <div className="absolute inset-0 z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[1000px] rounded-full bg-linear-to-br from-neutral-100 to-transparent blur-3xl opacity-60 pointer-events-none" />
        <div className="absolute inset-0 grain-bg opacity-[0.05]" />
      </div>

      <div className="w-full max-w-lg z-10">
        <div className="bg-white border border-neutral-200 rounded-3xl p-8 md:p-10 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.03)]">
          <div className="flex flex-col items-center text-center mb-4">
            <Image
              src="/logos/logo.png"
              alt="logo"
              width={110}
              height={28}
              style={{ width: "110px", height: "auto" }}
              priority
            />
            <h1 className="mt-2 text-3xl font-semibold tracking-normal text-neutral-900 leading-none">
              Join the Team
            </h1>
            <p className="mt-1 text-[11px] font-medium text-neutral-400 uppercase tracking-[0.2em]">
              Staff Onboarding
            </p>
          </div>

          <div className="bg-neutral-50 border border-neutral-200/80 rounded-2xl p-5 mb-4 text-center">
            <p className="text-[14px] font-medium text-neutral-900 leading-relaxed">
              <span className="font-semibold text-neutral-900">
                {invitation.invited_by || "An administrator"}
              </span>{" "}
              invited you to join the team
            </p>
            <p className="text-[12px] text-neutral-500 mt-2 leading-relaxed font-normal">
              Please complete the registration below. Once submitted, your
              administrator will set up your access role.
            </p>
          </div>

          {registered ? (
            <div className="text-center space-y-6 animate-scale-in">
              <div className="h-12 w-12 rounded-full border border-neutral-200 flex items-center justify-center mx-auto text-neutral-900 bg-neutral-50">
                <CheckCircle className="h-5 w-5" strokeWidth={1.5} />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold text-neutral-900 tracking-tightest">
                  Profile Submitted!
                </h2>
                <p className="text-neutral-500 text-[13px] leading-relaxed max-w-xs mx-auto font-medium">
                  Your details have been successfully saved and routed to the
                  administrator for setup. You will receive access once
                  approved.
                </p>
              </div>

              <div className="border-t border-neutral-200/60 pt-6">
                <button
                  onClick={() => router.push("/dashboard/profile")}
                  className="w-full bg-neutral-900 hover:bg-neutral-800 text-white rounded-full py-3.5 text-[14px] font-medium transition-all hover:gap-3 flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                >
                  Go to Profile
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : !user ? (
            !otpSent ? (
              <div className="space-y-4 animate-scale-in text-center">
                <div className="space-y-2">
                  <h2 className="text-xl font-semibold text-neutral-900 tracking-tightest">
                    Authentication Required
                  </h2>
                  <p className="text-neutral-500 text-[13px] leading-relaxed max-w-xs mx-auto font-medium font-sans">
                    Please choose an authentication option to verify your
                    professional identity.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  className="w-full bg-white hover:bg-neutral-50 border border-neutral-200 text-neutral-800 rounded-full py-3 text-[14px] font-medium shadow-sm transition-colors flex items-center justify-center gap-2.5 cursor-pointer"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 48 48"
                  >
                    <path
                      fill="#FFC107"
                      d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"
                    />
                    <path
                      fill="#FF3D00"
                      d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"
                    />
                    <path
                      fill="#4CAF50"
                      d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"
                    />
                    <path
                      fill="#1976D2"
                      d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"
                    />
                  </svg>
                  Continue with Google
                </button>

                <div className="relative flex items-center justify-center my-5">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-neutral-200"></div>
                  </div>
                  <span className="relative px-3 bg-white text-[10px] font-semibold text-neutral-400 uppercase tracking-[0.2em]">
                    or use email verification
                  </span>
                </div>

                <form onSubmit={handleSendOtp} className="space-y-4 text-left">
                  <div className="space-y-2">
                    <label className="text-[11px] font-semibold text-neutral-900 uppercase tracking-[0.15em] block">
                      Email Address
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-neutral-400">
                        <Mail className="h-4 w-4" strokeWidth={1.5} />
                      </div>
                      <input
                        type="email"
                        required
                        placeholder="name@company.com"
                        className="w-full bg-white border border-neutral-200 focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 rounded-full py-3 pl-11 pr-4 text-[13px] text-neutral-900 placeholder-neutral-400 focus:outline-none transition-all font-medium"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={sendingOtp}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={sendingOtp || !email.trim()}
                    className="w-full bg-neutral-900 hover:bg-neutral-800 text-white rounded-full py-3.5 text-[14px] font-medium transition-all hover:gap-3 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {sendingOtp ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Sending Code...
                      </>
                    ) : (
                      <>
                        Send Verification Code{" "}
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </form>
              </div>
            ) : (
              <div className="space-y-6 animate-scale-in text-center">
                <div className="space-y-2">
                  <h2 className="text-xl font-semibold text-neutral-900 tracking-tightest">
                    Verify Email Address
                  </h2>
                  <p className="text-neutral-500 text-[13px] leading-relaxed max-w-xs mx-auto font-medium">
                    We sent a 6-digit verification code to{" "}
                    <span className="font-semibold text-neutral-950">
                      {email}
                    </span>
                    .
                  </p>
                </div>

                <form
                  onSubmit={handleVerifyOtp}
                  className="space-y-4 text-left"
                >
                  <div className="space-y-2">
                    <label className="text-[11px] font-semibold text-neutral-900 uppercase tracking-[0.15em] block">
                      Verification Code
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      placeholder="------"
                      className="w-full text-center bg-white border border-neutral-200 focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 rounded-2xl py-3.5 text-[20px] font-semibold tracking-[0.4em] text-neutral-900 placeholder-neutral-300 focus:outline-none transition-all"
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
                    <p className="text-red-500 text-[11px] font-medium text-center mt-1">
                      {otpError}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={verifyingOtp || otp.trim().length !== 6}
                    className="w-full bg-neutral-900 hover:bg-neutral-800 text-white rounded-full py-3.5 text-[14px] font-medium transition-all hover:gap-3 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
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

                  <div className="flex justify-between items-center text-[12px] pt-3 font-medium">
                    <button
                      type="button"
                      onClick={() => {
                        setOtpSent(false);
                        setOtp("");
                      }}
                      className="text-neutral-500 hover:text-neutral-900 transition cursor-pointer"
                    >
                      Go Back
                    </button>
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={sendingOtp || resendTimer > 0}
                      className="text-neutral-900 hover:text-neutral-700 transition cursor-pointer disabled:opacity-50"
                    >
                      {sendingOtp
                        ? "Resending..."
                        : resendTimer > 0
                          ? `Resend in ${resendTimer}s`
                          : "Resend Code"}
                    </button>
                  </div>
                </form>
              </div>
            )
          ) : (
            <form
              onSubmit={handleSubmit}
              className="space-y-5 animate-scale-in"
            >
              <div className="flex justify-between items-center text-[11px] font-semibold tracking-wider text-neutral-400">
                <span>LOGGED IN AS</span>
                <button
                  type="button"
                  onClick={logout}
                  className="text-neutral-500 hover:text-neutral-900 transition-colors font-semibold flex items-center gap-1.5 cursor-pointer bg-none border-none p-0 focus:outline-none"
                >
                  <LogOut className="h-3.5 w-3.5" strokeWidth={1.5} />
                  Sign Out
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-semibold text-neutral-900 uppercase tracking-[0.15em] block">
                  Email Address (Verified)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-neutral-400">
                    <Mail className="h-4 w-4" strokeWidth={1.5} />
                  </div>
                  <input
                    type="email"
                    readOnly
                    disabled
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-full py-3 pl-11 pr-4 text-[13px] text-neutral-500 font-medium select-none cursor-not-allowed"
                    value={user.email || ""}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[11px] font-semibold text-neutral-900 uppercase tracking-[0.15em] block">
                    First Name
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-neutral-450">
                      <User className="h-4 w-4" strokeWidth={1.5} />
                    </div>
                    <input
                      type="text"
                      required
                      placeholder="First name"
                      className="w-full bg-white border border-neutral-200 focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 rounded-full py-3 pl-11 pr-4 text-[13px] text-neutral-900 placeholder-neutral-400 focus:outline-none transition-all font-medium"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      disabled={submitting}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-semibold text-neutral-900 uppercase tracking-[0.15em] block">
                    Last Name
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-neutral-450">
                      <User className="h-4 w-4" strokeWidth={1.5} />
                    </div>
                    <input
                      type="text"
                      required
                      placeholder="Last name"
                      className="w-full bg-white border border-neutral-200 focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 rounded-full py-3 pl-11 pr-4 text-[13px] text-neutral-900 placeholder-neutral-400 focus:outline-none transition-all font-medium"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      disabled={submitting}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-semibold text-neutral-900 uppercase tracking-[0.15em] block">
                  Preferred Name
                </label>
                <div className="relative flex items-center">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-neutral-450">
                    <User className="h-4 w-4" strokeWidth={1.5} />
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Alex"
                    className="w-full bg-white border border-neutral-200 focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 rounded-full py-3 pl-11 pr-12 text-[13px] text-neutral-900 placeholder-neutral-400 focus:outline-none transition-all font-medium"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={submitting}
                  />
                  <div className="absolute right-4 flex items-center group">
                    <div className="cursor-help text-neutral-400 hover:text-neutral-900 transition-colors">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth="1.5"
                        stroke="currentColor"
                        className="w-4 h-4"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z"
                        />
                      </svg>
                    </div>
                    <div className="absolute left-full ml-3 bg-neutral-950 text-white text-[11px] font-semibold py-2 px-3.5 rounded-xl shadow-xl whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-200 -translate-x-2 group-hover:translate-x-0 z-50">
                      write the name that you want to be displayed
                      <div className="absolute right-full top-1/2 -translate-y-1/2 border-8 border-transparent border-r-neutral-950" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-semibold text-neutral-900 uppercase tracking-[0.15em] block">
                  Phone Number
                </label>
                <div className="flex gap-0 items-center bg-white border border-neutral-200 focus-within:border-neutral-900 focus-within:ring-1 focus-within:ring-neutral-900 rounded-full py-3 px-4 transition-all">
                  <div className="flex items-center text-neutral-400 shrink-0 mr-2">
                    <Phone className="h-4 w-4" strokeWidth={1.5} />
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="+61"
                    className="w-12 text-center bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-[13px] text-neutral-900 placeholder-neutral-400 font-medium p-0"
                    value={countryCode}
                    onChange={handleCountryCodeChange}
                    disabled={submitting}
                  />
                  <div className="h-5 w-px bg-neutral-200 mx-2 shrink-0" />
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 469872356"
                    className="flex-1 bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-[13px] text-neutral-900 placeholder-neutral-400 font-medium p-0"
                    value={phone}
                    onChange={handlePhoneChange}
                    disabled={submitting}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting || !firstName.trim() || !lastName.trim() || !name.trim() || !phone.trim()}
                className="w-full bg-neutral-900 hover:bg-neutral-800 text-white rounded-full py-3.5 text-[14px] font-medium transition-all hover:gap-3 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
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
