"use client";

import React, { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { useSearchParams } from "next/navigation";
import { ArrowRight, CheckCircle2, Mail, Phone, MapPin, Search, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/services/api";

import { Reveal, RevealText } from "@/components/site/Reveal";

interface Country {
  name: string;
  alpha2Code: string;
  callingCodes: string[];
  flag: string;
  flags?: {
    png?: string;
    svg?: string;
  };
}

const POPULAR_COUNTRIES: Country[] = [
  { name: "Australia", alpha2Code: "AU", callingCodes: ["61"], flag: "🇦🇺", flags: { svg: "https://flagcdn.com/au.svg", png: "https://flagcdn.com/w320/au.png" } },
  { name: "New Zealand", alpha2Code: "NZ", callingCodes: ["64"], flag: "🇳🇿", flags: { svg: "https://flagcdn.com/nz.svg", png: "https://flagcdn.com/w320/nz.png" } },
  { name: "United States", alpha2Code: "US", callingCodes: ["1"], flag: "🇺🇸", flags: { svg: "https://flagcdn.com/us.svg", png: "https://flagcdn.com/w320/us.png" } },
  { name: "United Kingdom", alpha2Code: "GB", callingCodes: ["44"], flag: "🇬🇧", flags: { svg: "https://flagcdn.com/gb.svg", png: "https://flagcdn.com/w320/gb.png" } },
  { name: "Canada", alpha2Code: "CA", callingCodes: ["1"], flag: "🇨🇦", flags: { svg: "https://flagcdn.com/ca.svg", png: "https://flagcdn.com/w320/ca.png" } },
  { name: "India", alpha2Code: "IN", callingCodes: ["91"], flag: "🇮🇳", flags: { svg: "https://flagcdn.com/in.svg", png: "https://flagcdn.com/w320/in.png" } },
];

const CountryFlag = ({ country, className = "w-5 h-3.5 object-cover rounded-[2px]" }: { country: Country; className?: string }) => {
  const [imgError, setImgError] = useState(false);
  const flagUrl = country.flags?.svg || country.flags?.png;

  if (flagUrl && !imgError) {
    return (
      <img
        src={flagUrl}
        alt={country.name}
        className={className}
        onError={() => setImgError(true)}
      />
    );
  }

  return <span className="text-base leading-none">{country.flag}</span>;
};

const BUSINESS_TYPES = [
  "Restaurant",
  "Café",
  "Hospitality",
  "Retail Store",
  "Service Business",
  "Multi-location",
  "Other",
];
const INTENTS = [
  { value: "demo", label: "Requesting a demo" },
  { value: "contact", label: "General contact" },
  { value: "early-access", label: "Early access" },
];

export default function ContactPage() {
  const params = useSearchParams();
  const isDemo = params?.get("demo") === "1";

  const [form, setForm] = useState({
    name: "",
    business: "",
    email: "",
    countryCode: "+61",
    phone: "",
    businessType: "",
    message: "",
    intent: "contact",
  });
  const [status, setStatus] = useState("idle"); // idle | loading | success | error

  const [countries, setCountries] = useState<Country[]>(POPULAR_COUNTRIES);
  const [selectedCountry, setSelectedCountry] = useState<Country>(POPULAR_COUNTRIES[0]);
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [isBusinessTypeOpen, setIsBusinessTypeOpen] = useState(false);
  const [isIntentOpen, setIsIntentOpen] = useState(false);

  const businessTypeRef = useRef<HTMLDivElement>(null);
  const intentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isDemo) setForm((f) => ({ ...f, intent: "demo" }));
  }, [isDemo]);

  useEffect(() => {
    const fetchCountries = async () => {
      try {
        const response = await fetch(
          "https://countries.dev/countries?fields=name,alpha2Code,callingCodes,flag,flags"
        );
        if (!response.ok) throw new Error("Failed to fetch");
        const data = (await response.json()) as Country[];
        
        const validCountries = data.filter(
          (c) => c.name && c.alpha2Code && c.callingCodes && c.callingCodes.length > 0
        );

        if (validCountries.length > 0) {
          validCountries.sort((a, b) => a.name.localeCompare(b.name));

          const popularCodes = POPULAR_COUNTRIES.map((c) => c.alpha2Code);
          const rest = validCountries.filter((c) => !popularCodes.includes(c.alpha2Code));
          
          setCountries([...POPULAR_COUNTRIES, ...rest]);

          const foundDefault = validCountries.find(
            (c) => c.alpha2Code === "AU"
          );
          if (foundDefault) {
            setSelectedCountry(foundDefault);
          }
        }
      } catch (error) {
        console.error("Error fetching country codes:", error);
      }
    };

    fetchCountries();
  }, []);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
      if (businessTypeRef.current && !businessTypeRef.current.contains(e.target as Node)) {
        setIsBusinessTypeOpen(false);
      }
      if (intentRef.current && !intentRef.current.contains(e.target as Node)) {
        setIsIntentOpen(false);
      }
    };
    if (isOpen || isBusinessTypeOpen || isIntentOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isOpen, isBusinessTypeOpen, isIntentOpen]);

  const selectCountry = (country: Country) => {
    setSelectedCountry(country);
    const code = country.callingCodes[0] ? `+${country.callingCodes[0]}` : "";
    setForm((f) => ({ ...f, countryCode: code }));
    setIsOpen(false);
    setSearchQuery("");
  };

  const update =
    (k: keyof typeof form) =>
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >,
    ) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const sanitized = value.replace(/[^\d]/g, "");
    setForm((f) => ({ ...f, phone: sanitized }));
  };

  const filteredCountries = countries.filter((c) => {
    const q = searchQuery.toLowerCase();
    const matchesName = c.name.toLowerCase().includes(q);
    const matchesAlpha = c.alpha2Code.toLowerCase().includes(q);
    const matchesCode = c.callingCodes.some((code) => code.includes(q.replace("+", "")));
    return matchesName || matchesAlpha || matchesCode;
  });

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!form.name || !form.email) {
      setStatus("error");
      toast.error("Please provide your name and email.");
      return;
    }

    if (!form.name) {
      setStatus("error");
      toast.error("Please provide your name.");
      return;
    }

    if (!form.email) {
      setStatus("error");
      toast.error("Please provide your email.");
      return;
    }

    if (!form.phone) {
      setStatus("error");
      toast.error("Please provide your phone.");
      return;
    }

    if (!form.business) {
      setStatus("error");
      toast.error("Please provide your business.");
      return;
    }

    if (form.message.length < 5) {
      setStatus("error");
      toast.error("Message must be at least 5 characters long.");
      return;
    }

    if (!form.businessType) {
      setStatus("error");
      toast.error("Please provide your business type.");
      return;
    }

    if (!form.message) {
      setStatus("error");
      toast.error("Please provide your message.");
      return;
    }

    if (!form.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      setStatus("error");
      toast.error("Please provide a valid email.");
      return;
    }

    setStatus("loading");
    try {
      const payload = {
        ...form,
        phone: form.phone ? `${form.countryCode} ${form.phone}`.trim() : "",
      };
      const { countryCode: _, ...submitData } = payload as any;

      await api.post("/api/contact", submitData);

      toast.success("Message sent successfully!");
      setStatus("success");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setStatus("error");
      toast.error(msg);
    }
  };

  return (
    <main className="min-h-screen bg-white">
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
              Tell us a little about your business. We’ll be in touch with next
              steps and an Early Access invitation.
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
                  Ready to build?
                </div>
                <div className="mt-3 text-[26px] font-semibold tracking-tight text-neutral-900">
                  {isDemo ? "Request a Demo" : "Get in touch"}
                </div>
                <p className="mt-3 text-[15px] leading-relaxed text-neutral-600">
                  We respond within one business day. Tell us what you’re
                  running today — we’ll show you what’s possible with NexBrix.
                </p>
              </div>

              <div className="space-y-4 text-[14px] text-neutral-700">
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-neutral-400" />{" "}
                  info@nexbrix.com.au
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
                  What you’ll get
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
                      <div className="flex gap-0 items-center border border-neutral-200 bg-white rounded-xl focus-within:border-neutral-900 focus-within:ring-4 focus-within:ring-neutral-900/5 transition-all relative">
                        <div ref={dropdownRef} className="relative shrink-0">
                          <button
                            type="button"
                            onClick={() => setIsOpen(!isOpen)}
                            className="flex items-center gap-1.5 px-3 py-3.5 bg-transparent border-none outline-none focus:outline-none cursor-pointer select-none text-[15px] font-medium text-neutral-900 rounded-l-xl hover:bg-neutral-50 transition-colors h-full"
                          >
                            <CountryFlag country={selectedCountry} />
                            <span className="text-neutral-500 font-normal text-[14px]">
                              +{selectedCountry.callingCodes[0]}
                            </span>
                            <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
                          </button>

                          {isOpen && (
                            <motion.div
                              initial={{ opacity: 0, y: 5 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="absolute top-full left-0 mt-1.5 w-72 max-h-80 overflow-hidden bg-white border border-neutral-200 rounded-2xl shadow-xl z-50 flex flex-col"
                            >
                              <div className="flex items-center gap-2 px-3 py-2 border-b border-neutral-100 bg-neutral-50">
                                <Search className="w-4 h-4 text-neutral-400 shrink-0" />
                                <input
                                  type="text"
                                  placeholder="Search country or code..."
                                  value={searchQuery}
                                  onChange={(e) => setSearchQuery(e.target.value)}
                                  className="w-full bg-transparent border-none outline-none text-[14px] text-neutral-900 placeholder-neutral-400 focus:ring-0 p-0"
                                  autoFocus
                                />
                              </div>

                              <div className="flex-1 overflow-y-auto py-1 max-h-56">
                                {filteredCountries.length > 0 ? (
                                  filteredCountries.map((c, index) => {
                                    const isSelected = c.alpha2Code === selectedCountry.alpha2Code;
                                    return (
                                      <button
                                        key={`${c.alpha2Code}-${index}`}
                                        type="button"
                                        onClick={() => selectCountry(c)}
                                        className={`w-full flex items-center justify-between px-3.5 py-2 text-left text-[14px] transition-colors ${
                                          isSelected
                                            ? "bg-neutral-100 text-neutral-900 font-medium"
                                            : "text-neutral-700 hover:bg-neutral-50"
                                        }`}
                                      >
                                        <div className="flex items-center gap-2.5 min-w-0">
                                          <CountryFlag country={c} />
                                          <span className="truncate">{c.name}</span>
                                        </div>
                                        <span className="text-[13px] text-neutral-500 ml-2 shrink-0 font-normal">
                                          +{c.callingCodes[0]}
                                        </span>
                                      </button>
                                    );
                                  })
                                ) : (
                                  <div className="px-3.5 py-6 text-center text-[14px] text-neutral-500">
                                    No countries found
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </div>

                        <div className="h-6 w-px bg-neutral-200 shrink-0" />
                        
                        <input
                          value={form.phone}
                          onChange={handlePhoneChange}
                          placeholder="XXX XXX XXX"
                          className="flex-1 bg-transparent border-none outline-none focus:outline-none focus:ring-0 py-3.5 px-3 text-[15px] text-neutral-900"
                        />
                      </div>
                    </Field>
                    <Field label="Business type">
                      <div ref={businessTypeRef} className="relative w-full">
                        <button
                          type="button"
                          onClick={() => setIsBusinessTypeOpen(!isBusinessTypeOpen)}
                          className={`w-full flex items-center justify-between px-4 py-3.5 border rounded-xl bg-white text-[15px] transition-all cursor-pointer text-left focus:outline-none ${
                            isBusinessTypeOpen 
                              ? "border-neutral-900 ring-4 ring-neutral-900/5" 
                              : "border-neutral-200"
                          } ${
                            !form.businessType ? "text-neutral-400" : "text-neutral-900"
                          }`}
                        >
                          <span>{form.businessType || "Select an option"}</span>
                          <ChevronDown className={`w-4 h-4 text-neutral-400 transition-transform duration-200 ${isBusinessTypeOpen ? "rotate-180" : ""}`} />
                        </button>

                        {isBusinessTypeOpen && (
                          <motion.div
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="absolute top-full left-0 mt-1.5 w-full max-h-60 overflow-y-auto bg-white border border-neutral-200 rounded-xl shadow-xl z-50 py-1"
                          >
                            {BUSINESS_TYPES.map((b) => {
                              const isSelected = form.businessType === b;
                              return (
                                <button
                                  key={b}
                                  type="button"
                                  onClick={() => {
                                    setForm((f) => ({ ...f, businessType: b }));
                                    setIsBusinessTypeOpen(false);
                                  }}
                                  className={`w-full flex items-center justify-between px-4 py-2.5 text-left text-[14px] transition-colors ${
                                    isSelected
                                      ? "bg-neutral-100 text-neutral-900 font-medium"
                                      : "text-neutral-700 hover:bg-neutral-50"
                                  }`}
                                >
                                  <span>{b}</span>
                                </button>
                              );
                            })}
                          </motion.div>
                        )}
                      </div>
                    </Field>
                    <Field label="I’m interested in">
                      <div ref={intentRef} className="relative w-full">
                        <button
                          type="button"
                          onClick={() => setIsIntentOpen(!isIntentOpen)}
                          className={`w-full flex items-center justify-between px-4 py-3.5 border rounded-xl bg-white text-[15px] transition-all cursor-pointer text-left focus:outline-none ${
                            isIntentOpen 
                              ? "border-neutral-900 ring-4 ring-neutral-900/5" 
                              : "border-neutral-200"
                          } ${
                            !form.intent ? "text-neutral-400" : "text-neutral-900"
                          }`}
                        >
                          <span>{INTENTS.find((i) => i.value === form.intent)?.label || "Select an option"}</span>
                          <ChevronDown className={`w-4 h-4 text-neutral-400 transition-transform duration-200 ${isIntentOpen ? "rotate-180" : ""}`} />
                        </button>

                        {isIntentOpen && (
                          <motion.div
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="absolute top-full left-0 mt-1.5 w-full max-h-60 overflow-y-auto bg-white border border-neutral-200 rounded-xl shadow-xl z-50 py-1"
                          >
                            {INTENTS.map((i) => {
                              const isSelected = form.intent === i.value;
                              return (
                                <button
                                  key={i.value}
                                  type="button"
                                  onClick={() => {
                                    setForm((f) => ({ ...f, intent: i.value }));
                                    setIsIntentOpen(false);
                                  }}
                                  className={`w-full flex items-center justify-between px-4 py-2.5 text-left text-[14px] transition-colors ${
                                    isSelected
                                      ? "bg-neutral-100 text-neutral-900 font-medium"
                                      : "text-neutral-700 hover:bg-neutral-50"
                                  }`}
                                >
                                  <span>{i.label}</span>
                                </button>
                              );
                            })}
                          </motion.div>
                        )}
                      </div>
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
        .select-trigger {
          width: 100%;
          padding: 0.85rem 1rem;
          height: auto;
          border: 1px solid rgb(229 229 229);
          border-radius: 0.75rem;
          background: white;
          font-size: 15px;
          color: rgb(23 23 23);
          transition:
            border-color 0.2s,
            box-shadow 0.2s;
        }
        .select-trigger:focus {
          outline: none;
          border-color: rgb(23 23 23);
          box-shadow: 0 0 0 4px rgba(23, 23, 23, 0.06);
        }
        .select-trigger[data-placeholder] {
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
