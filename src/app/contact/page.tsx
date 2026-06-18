"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRight, CheckCircle2, Mail, Phone, MapPin } from "lucide-react";

import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import { Reveal, RevealText } from "@/components/site/Reveal";

const BUSINESS_TYPES = [
  "Restaurant",
  "Café",
  "Hospitality",
  "Retail Store",
  "Service Business",
  "Multi-location",
  "Other",
];

export default function ContactPage() {
  const params = useSearchParams();
  const isDemo = params?.get("demo") === "1";

  const [form, setForm] = useState({
    name: "",
    business: "",
    email: "",
    phone: "",
    businessType: "",
    message: "",
    intent: "contact",
  });
  const [status, setStatus] = useState("idle"); // idle | loading | success | error
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (isDemo) setForm((f) => ({ ...f, intent: "demo" }));
  }, [isDemo]);

  const update =
    (k: keyof typeof form) =>
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >,
    ) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!form.name || !form.email) {
      setStatus("error");
      setErrorMsg("Please provide your name and email.");
      return;
    }
    setStatus("loading");
    setErrorMsg("");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Something went wrong");
      }
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  return (
    <main className="min-h-screen bg-white">
      <Navbar />

      <section className="pt-36 lg:pt-48 pb-12 lg:pb-20">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <Reveal>
            <div className="text-[12px] tracking-[0.2em] uppercase text-neutral-500">
              Contact
            </div>
          </Reveal>
          <h1 className="mt-6 text-[44px] sm:text-[64px] md:text-[96px] font-semibold tracking-tightest leading-none text-neutral-900 max-w-5xl text-balance">
            <RevealText text="Let's start the" />
            <br />
            <RevealText
              text="conversation."
              delay={0.15}
              className="text-neutral-400"
            />
          </h1>
          <Reveal delay={0.4}>
            <p className="mt-8 max-w-2xl text-[19px] leading-relaxed text-neutral-600">
              Tell us a little about your business. We&apos;ll be in touch with
              next steps and an Early Access invitation.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="pb-28 lg:pb-40">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 grid lg:grid-cols-12 gap-12">
          <Reveal className="lg:col-span-4">
            <aside className="space-y-8">
              <div>
                <div className="text-[12px] tracking-[0.2em] uppercase text-neutral-500">
                  Primary CTA
                </div>
                <div className="mt-3 text-[26px] font-semibold tracking-tight text-neutral-900">
                  {isDemo ? "Request a Demo" : "Get in touch"}
                </div>
                <p className="mt-3 text-[15px] leading-relaxed text-neutral-600">
                  We respond within one business day. Tell us what you&apos;re
                  running today — we&apos;ll show you what&apos;s possible with
                  NexBrix.
                </p>
              </div>

              <div className="space-y-4 text-[14px] text-neutral-700">
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-neutral-400" />{" "}
                  hello@nexbrix.com
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-neutral-400" /> Available on
                  request
                </div>
                <div className="flex items-center gap-3">
                  <MapPin className="w-4 h-4 text-neutral-400" /> Global ·
                  Remote-first
                </div>
              </div>

              <div className="rounded-2xl border border-neutral-200 p-6 bg-neutral-50">
                <div className="text-[12px] tracking-[0.2em] uppercase text-neutral-500">
                  What you&apos;ll get
                </div>
                <ul className="mt-4 space-y-2.5 text-[14px] text-neutral-700">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5" />{" "}
                    A guided walkthrough of NexBrix
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5" />{" "}
                    Early Access invitation
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5" />{" "}
                    A roadmap aligned to your business
                  </li>
                </ul>
              </div>
            </aside>
          </Reveal>

          <Reveal delay={0.1} className="lg:col-span-8">
            <div>
              {status === "success" ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="rounded-3xl border border-neutral-200 p-10 lg:p-14 bg-white"
                >
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-50 text-emerald-600">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <h3 className="mt-6 text-[36px] sm:text-[44px] font-semibold tracking-tight text-neutral-900">
                    Thank you.
                  </h3>
                  <p className="mt-4 text-[17px] leading-relaxed text-neutral-600 max-w-xl">
                    Your request has been received. A member of the NexBrix team
                    will reach out within one business day.
                  </p>
                </motion.div>
              ) : (
                <form
                  onSubmit={submit}
                  className="rounded-3xl border border-neutral-200 p-8 lg:p-10 bg-white space-y-6"
                >
                  <div className="grid sm:grid-cols-2 gap-6">
                    <Field label="Name" required>
                      <input
                        value={form.name}
                        onChange={update("name")}
                        required
                        placeholder="Your full name"
                        className="input"
                      />
                    </Field>
                    <Field label="Business name">
                      <input
                        value={form.business}
                        onChange={update("business")}
                        placeholder="Company / Business"
                        className="input"
                      />
                    </Field>
                    <Field label="Email" required>
                      <input
                        type="email"
                        value={form.email}
                        onChange={update("email")}
                        required
                        placeholder="you@business.com"
                        className="input"
                      />
                    </Field>
                    <Field label="Phone number">
                      <input
                        value={form.phone}
                        onChange={update("phone")}
                        placeholder="+00 0000 000 000"
                        className="input"
                      />
                    </Field>
                    <Field label="Business type">
                      <select
                        value={form.businessType}
                        onChange={update("businessType")}
                        className="input"
                      >
                        <option value="">Select an option</option>
                        {BUSINESS_TYPES.map((b) => (
                          <option key={b} value={b}>
                            {b}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="I&apos;m interested in">
                      <select
                        value={form.intent}
                        onChange={update("intent")}
                        className="input"
                      >
                        <option value="demo">Requesting a demo</option>
                        <option value="contact">General contact</option>
                        <option value="early-access">Early access</option>
                      </select>
                    </Field>
                  </div>

                  <Field label="Message">
                    <textarea
                      value={form.message}
                      onChange={update("message")}
                      rows={5}
                      placeholder="Tell us about your business and what you’d like to solve."
                      className="input resize-none"
                    />
                  </Field>

                  {status === "error" && (
                    <div className="text-[13px] text-red-600">{errorMsg}</div>
                  )}

                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <button
                      type="submit"
                      disabled={status === "loading"}
                      className="inline-flex items-center gap-2 bg-neutral-900 text-white px-6 py-3.5 rounded-full text-[15px] font-medium hover:bg-neutral-800 transition-all hover:gap-3 disabled:opacity-60"
                    >
                      {status === "loading"
                        ? "Sending…"
                        : form.intent === "demo"
                          ? "Request Demo"
                          : "Send message"}{" "}
                      <ArrowRight className="w-4 h-4" />
                    </button>
                    <span className="text-[12px] text-neutral-500">
                      We respond within one business day.
                    </span>
                  </div>
                </form>
              )}
            </div>
          </Reveal>
        </div>
      </section>

      <Footer />

      <style jsx global>{`
        .input {
          width: 100%;
          padding: 0.85rem 1rem;
          border: 1px solid rgb(229 229 229);
          border-radius: 0.75rem;
          background: white;
          font-size: 15px;
          color: rgb(23 23 23);
          transition:
            border-color 0.2s,
            box-shadow 0.2s;
        }
        .input:focus {
          outline: none;
          border-color: rgb(23 23 23);
          box-shadow: 0 0 0 4px rgba(23, 23, 23, 0.06);
        }
        .input::placeholder {
          color: rgb(163 163 163);
        }
      `}</style>
    </main>
  );
}

interface FieldProps {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}

function Field({ label, required, children }: FieldProps) {
  return (
    <label className="block">
      <span className="text-[12px] font-medium tracking-wide text-neutral-700">
        {label} {required && <span className="text-neutral-400">*</span>}
      </span>
      <div className="mt-2">{children}</div>
    </label>
  );
}
