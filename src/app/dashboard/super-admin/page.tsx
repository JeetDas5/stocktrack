"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";
import {
  Mail,
  Copy,
  Check,
  Trash2,
  Loader2,
  Plus,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Building,
} from "lucide-react";
import { toast } from "sonner";

import {
  createOwnerInvitation,
  listOwnerInvitations,
  deleteOwnerInvitation,
} from "@/lib/repositories/user.repository";

interface Invitation {
  id: string;
  email: string;
  modules: string[];
  expires_at: string;
  created_at: string;
  status: string;
  signup_link: string;
}

export default function SuperAdminPage() {
  const { profile, loading: authLoading } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [selectedModules, setSelectedModules] = useState<string[]>([
    "timesheet",
  ]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loadingInvites, setLoadingInvites] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Security guard at the page level
  useEffect(() => {
    if (!authLoading) {
      if (!profile || profile.role !== "super_admin") {
        router.replace("/dashboard");
      }
    }
  }, [profile, authLoading, router]);

  const loadInvitations = async () => {
    try {
      setLoadingInvites(true);
      const data = await listOwnerInvitations();
      setInvitations(data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load invitations log.");
    } finally {
      setLoadingInvites(false);
    }
  };

  useEffect(() => {
    if (profile?.role === "super_admin") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadInvitations();
    }
  }, [profile]);

  const handleToggleModule = (modName: string) => {
    if (selectedModules.includes(modName)) {
      setSelectedModules(selectedModules.filter((m) => m !== modName));
    } else {
      setSelectedModules([...selectedModules, modName]);
    }
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      toast.error("Please enter a valid email address.");
      return;
    }

    if (selectedModules.length === 0) {
      toast.error("Please select at least one module for the owner.");
      return;
    }

    try {
      setSubmitting(true);
      const invite = await createOwnerInvitation({
        email: trimmedEmail,
        modules: selectedModules,
      });

      if (!invite) {
        toast.error("Failed to create invitation.");
        return;
      }
      toast.success("Invitation generated successfully!");
      setEmail("");
      // Reload invitations list
      await loadInvitations();
    } catch (err) {
      console.error(err);
      toast.error(
        err instanceof Error ? err.message : "Failed to create invitation.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteInvite = async (inviteId: string) => {
    try {
      await deleteOwnerInvitation(inviteId);
      toast.success("Invitation link revoked successfully.");
      setInvitations(invitations.filter((inv) => inv.id !== inviteId));
    } catch (err) {
      console.error(err);
      toast.error("Failed to revoke invitation.");
    }
  };

  const handleCopyLink = (link: string, id: string) => {
    navigator.clipboard.writeText(link);
    setCopiedId(id);
    toast.success("Invitation link copied to clipboard!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (authLoading || !profile || profile.role !== "super_admin") {
    return (
      <div className="h-[75vh] flex flex-col items-center justify-center bg-white text-neutral-900">
        <Loader2 className="h-8 w-8 text-black animate-spin mb-3" />
        <span className="text-neutral-500 text-xs font-bold uppercase tracking-wider animate-pulse">
          Authorizing system access...
        </span>
      </div>
    );
  }

  return (
    <div className="px-2 bg-white min-h-[90vh] overflow-y-auto animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-6 border-neutral-100">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-neutral-900 flex items-center gap-2.5">
            Super Admin Console
          </h1>
          <p className="text-neutral-500 text-xs font-bold tracking-wide uppercase mt-1">
            System configuration, Owner Onboarding, and Licensing Management
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-8">
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white border border-neutral-200 rounded-3xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <h2 className="text-base font-bold text-neutral-900">
                Invite New Organization Owner
              </h2>
            </div>
            <p className="text-neutral-500 text-xs font-medium leading-relaxed mb-2">
              Invite a new business/organization owner to NexBrix. Specifying
              their modules controls their workspace features.
            </p>

            <form onSubmit={handleInviteSubmit} className="space-y-5">
              <div>
                <label className="text-[10px] font-extrabold uppercase text-neutral-500 tracking-wider block mb-2">
                  Owner Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="owner@organization.com"
                    disabled={submitting}
                    className="w-full pl-11 pr-4 py-3 border border-neutral-200 focus:border-neutral-950 bg-white text-xs font-semibold rounded-2xl focus:outline-none focus:ring-4 focus:ring-neutral-950/5 transition"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-extrabold uppercase text-neutral-500 tracking-wider block mb-3">
                  Activate Module Packages
                </label>
                <div className="space-y-2.5">
                  <label className="flex items-start gap-3 p-3.5 border border-neutral-200 rounded-2xl bg-neutral-50/50 hover:bg-neutral-50 transition cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={selectedModules.includes("timesheet")}
                      onChange={() => handleToggleModule("timesheet")}
                      className="mt-0.5 h-4 w-4 rounded border-neutral-300 text-black focus:ring-black accent-black cursor-pointer"
                    />
                    <div>
                      <span className="text-xs font-extrabold text-neutral-900 block leading-tight">
                        Timesheet & Directory Module
                      </span>
                      <span className="text-[10px] text-neutral-400 font-bold block mt-1 leading-snug">
                        Includes Team Directory, Timesheet Entries, Timesheet
                        Review, and Settings.
                      </span>
                    </div>
                  </label>
                  <label className="flex items-start gap-3 p-3.5 border border-neutral-200 rounded-2xl bg-neutral-50/50 hover:bg-neutral-50 transition cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={selectedModules.includes("roster")}
                      onChange={() => handleToggleModule("roster")}
                      className="mt-0.5 h-4 w-4 rounded border-neutral-300 text-black focus:ring-black accent-black cursor-pointer"
                    />
                    <div>
                      <span className="text-xs font-extrabold text-neutral-900 block leading-tight">
                        Roster Module
                      </span>
                      <span className="text-[10px] text-neutral-400 font-bold block mt-1 leading-snug">
                        Includes Roster Builder, Roster Settings, and
                        Availability management.
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting || !email.trim()}
                className="w-full bg-black hover:bg-neutral-800 text-white rounded-full py-3.5 text-xs font-bold uppercase tracking-wider shadow-sm flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-white" />
                    Generating Onboarding Link...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 stroke-[3px]" />
                    Generate Invitation
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Active Invitations */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white border border-neutral-200 rounded-3xl p-6 shadow-sm">
            <h2 className="text-base font-bold text-neutral-900 mb-1">
              Active Invitations Log
            </h2>
            <p className="text-neutral-400 text-[10px] font-bold tracking-wide uppercase mb-6">
              Monitor active token statuses, expirations, and copy onboarding
              links
            </p>

            {loadingInvites ? (
              <div className="py-20 flex flex-col items-center justify-center bg-white border border-neutral-100 rounded-2xl">
                <Loader2 className="h-6 w-6 text-black animate-spin mb-2" />
                <span className="text-[11px] text-neutral-400 font-bold uppercase tracking-wider">
                  Loading invitations log...
                </span>
              </div>
            ) : invitations.length === 0 ? (
              <div className="bg-neutral-50/50 border border-neutral-200/60 rounded-2xl py-20 px-6 text-center flex flex-col items-center justify-center">
                <Building className="h-10 w-10 text-neutral-300 mb-3" />
                <h3 className="text-xs font-extrabold text-neutral-950 uppercase tracking-wider">
                  No invitations generated
                </h3>
                <p className="text-neutral-500 text-[11px] font-semibold mt-1 max-w-xs leading-relaxed">
                  Generate owner invitations in the left panel to onboard new
                  organizations.
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                {invitations.map((invite) => {
                  const isExpired =
                    invite.status === "expired" ||
                    new Date(invite.expires_at) < new Date();
                  const isCompleted = invite.status === "completed";

                  return (
                    <div
                      key={invite.id}
                      className="border border-neutral-200 rounded-2xl p-4 bg-white hover:shadow-xs transition-shadow flex flex-col gap-3.5"
                    >
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <span className="text-xs font-extrabold text-neutral-950 block">
                            {invite.email}
                          </span>
                          <div className="flex flex-wrap gap-1.5 mt-1.5">
                            {invite.modules.map((m) => (
                              <span
                                key={m}
                                className="inline-flex items-center gap-1 text-[9px] font-bold text-neutral-700 bg-neutral-100 border border-neutral-200/50 rounded px-1.5 py-0.5 uppercase"
                              >
                                {m}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div>
                          {isCompleted ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[9px] font-extrabold tracking-wide uppercase bg-emerald-50 text-emerald-700 border border-emerald-200/60 leading-none">
                              <CheckCircle2 className="h-3 w-3" />
                              COMPLETED
                            </span>
                          ) : isExpired ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[9px] font-extrabold tracking-wide uppercase bg-red-50 text-red-700 border border-red-200/60 leading-none">
                              <AlertTriangle className="h-3 w-3" />
                              EXPIRED
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[9px] font-extrabold tracking-wide uppercase bg-amber-50 text-amber-700 border border-amber-200/60 leading-none animate-pulse">
                              <Clock className="h-3 w-3" />
                              PENDING
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pt-3 border-t border-neutral-100 text-[11px] text-neutral-500 font-semibold">
                        <div className="flex items-center gap-1.5 text-neutral-400 font-medium">
                          <Clock className="h-3.5 w-3.5 text-neutral-300" />
                          <span>
                            Expires:{" "}
                            {new Date(invite.expires_at).toLocaleDateString()}{" "}
                            at{" "}
                            {new Date(invite.expires_at).toLocaleTimeString(
                              [],
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                              },
                            )}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
                          {!isCompleted && !isExpired && (
                            <button
                              onClick={() =>
                                handleCopyLink(invite.signup_link, invite.id)
                              }
                              className="bg-neutral-50 hover:bg-neutral-100 text-neutral-700 rounded-lg p-2 px-3 text-xs font-bold border border-neutral-200 cursor-pointer flex items-center gap-1.5 transition"
                            >
                              {copiedId === invite.id ? (
                                <>
                                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                                  Copied
                                </>
                              ) : (
                                <>
                                  <Copy className="h-3.5 w-3.5" />
                                  Copy Link
                                </>
                              )}
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteInvite(invite.id)}
                            className="bg-white hover:bg-red-50 hover:border-red-200 text-neutral-400 hover:text-red-600 rounded-lg p-2 border border-neutral-200 cursor-pointer transition"
                            title="Revoke invitation"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
