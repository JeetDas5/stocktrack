"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { Reveal, RevealText } from "@/components/site/Reveal";

const HERO_IMG =
  "https://images.unsplash.com/photo-1524230572899-a752b3835840?auto=format&fit=crop&w=2000&q=80";

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-white">
      <section className="pt-36 lg:pt-48 pb-20 lg:pb-28">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <Reveal>
            <div className="text-[12px] tracking-[0.2em] uppercase text-neutral-500">
              About NexBrix
            </div>
          </Reveal>
          <h1 className="mt-6 text-[44px] sm:text-[64px] md:text-[96px] font-semibold tracking-tightest leading-none text-neutral-900 max-w-5xl text-balance">
            <RevealText text="The future of small" />
            <br />
            <RevealText
              text="business operations."
              delay={0.15}
              className="text-neutral-400"
            />
          </h1>
          <Reveal delay={0.4}>
            <p className="mt-8 max-w-2xl text-[19px] leading-relaxed text-neutral-600">
              We’re building a calm, unified operating system for the businesses
              that power our streets, neighbourhoods and economies.
            </p>
          </Reveal>
          <Reveal delay={0.5}>
            <div className="mt-16 relative aspect-video rounded-3xl overflow-hidden border border-neutral-200">
              <Image
                src={HERO_IMG}
                alt="NexBrix vision"
                fill
                priority
                className="object-cover"
                sizes="100vw"
              />
            </div>
          </Reveal>
        </div>
      </section>

      <section className="py-24 lg:py-32 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 grid lg:grid-cols-12 gap-12">
          <Reveal className="lg:col-span-4">
            <div>
              <div className="text-[12px] tracking-[0.2em] uppercase text-neutral-500">
                Our story
              </div>
              <h2 className="mt-5 text-[36px] sm:text-[48px] font-semibold tracking-tightest leading-[1.05] text-neutral-900">
                Why we built NexBrix.
              </h2>
            </div>
          </Reveal>
          <Reveal delay={0.1} className="lg:col-span-8">
            <div className="space-y-6 text-[18px] leading-relaxed text-neutral-700">
              <p>
                We spent years watching small businesses run on a patchwork of
                spreadsheets, messaging apps and disconnected point solutions —
                each one solving a slice, none of them solving the whole.
              </p>
              <p>
                The teams that ran these businesses were brilliant, but they
                were drowning in admin. Their tools were designed for someone
                else.
              </p>
              <p>
                NexBrix started with a simple belief: small businesses deserve
                the same operational clarity that powers the largest enterprises
                — without the complexity, the cost, or the learning curve.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="py-24 lg:py-32 bg-neutral-50">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <Reveal>
            <div className="text-[12px] tracking-[0.2em] uppercase text-neutral-500">
              Our vision
            </div>
          </Reveal>
          <Reveal delay={0.05}>
            <h2 className="mt-5 text-[40px] sm:text-[56px] md:text-[72px] font-semibold tracking-tightest leading-[1.05] text-neutral-900 max-w-4xl text-balance">
              A unified operating system for growing businesses.
            </h2>
          </Reveal>
          <Reveal delay={0.15}>
            <p className="mt-8 max-w-2xl text-[19px] leading-relaxed text-neutral-600">
              One platform. One source of truth. From workforce to inventory,
              from a single location to many — everything in one place, working
              in concert.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="py-24 lg:py-32 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <Reveal>
            <div className="text-[12px] tracking-[0.2em] uppercase text-neutral-500">
              Our approach
            </div>
          </Reveal>
          <div className="mt-10 grid md:grid-cols-3 gap-4">
            {[
              {
                t: "Simple",
                d: "Interfaces that get out of your way. Every screen earns its place.",
              },
              {
                t: "Reliable",
                d: "Tools your team can depend on, every shift, every day.",
              },
              {
                t: "Scalable",
                d: "Grows from one location to many, without breaking what works.",
              },
            ].map((c, i) => (
              <Reveal key={i} delay={i * 0.08}>
                <div className="rounded-2xl border border-neutral-200 p-10 bg-white hover:border-neutral-300 transition">
                  <div className="text-[12px] tracking-[0.2em] uppercase text-neutral-400">
                    0{i + 1}
                  </div>
                  <div className="mt-3 text-[32px] font-semibold tracking-tight">
                    {c.t}
                  </div>
                  <div className="mt-3 text-[15px] leading-relaxed text-neutral-600">
                    {c.d}
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 lg:py-32 bg-neutral-50">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <Reveal>
            <div className="text-[12px] tracking-[0.2em] uppercase text-neutral-500">
              Long-term roadmap
            </div>
          </Reveal>
          <Reveal delay={0.05}>
            <h2 className="mt-5 text-[40px] sm:text-[56px] md:text-[64px] font-semibold tracking-tightest leading-[1.05] text-neutral-900 max-w-3xl text-balance">
              Where we&apos;re going next.
            </h2>
          </Reveal>

          <div className="mt-14 grid md:grid-cols-2 gap-px bg-neutral-200 border border-neutral-200 rounded-3xl overflow-hidden">
            {[
              {
                phase: "Now",
                title: "Workforce Management",
                body: "Shifts, attendance, team coordination.",
                tone: "emerald",
              },
              {
                phase: "Next",
                title: "Inventory Management",
                body: "Stock, purchasing, multi-location inventory.",
                tone: "amber",
              },
              {
                phase: "Later",
                title: "Reporting & Analytics",
                body: "A single source of operational truth.",
                tone: "neutral",
              },
              {
                phase: "Future",
                title: "Business Modules",
                body: "A platform of modules to extend NexBrix to every part of your business.",
                tone: "neutral",
              },
            ].map((c, i) => (
              <Reveal key={i} delay={i * 0.06}>
                <div className="bg-white p-10 h-full">
                  <div
                    className={`inline-flex items-center gap-2 text-[12px] tracking-wide px-2.5 py-0.5 rounded-full border ${c.tone === "emerald" ? "text-emerald-700 bg-emerald-50 border-emerald-100" : c.tone === "amber" ? "text-amber-700 bg-amber-50 border-amber-100" : "text-neutral-600 bg-neutral-50 border-neutral-200"}`}
                  >
                    {c.phase}
                  </div>
                  <div className="mt-5 text-[26px] font-semibold tracking-tight text-neutral-900">
                    {c.title}
                  </div>
                  <div className="mt-3 text-[15px] leading-relaxed text-neutral-600">
                    {c.body}
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 lg:py-32 bg-neutral-950 text-white text-center">
        <div className="max-w-4xl mx-auto px-6 lg:px-10">
          <Reveal>
            <h2 className="text-[40px] sm:text-[56px] md:text-[72px] font-semibold tracking-tightest leading-none text-balance">
              See where NexBrix is going.
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="mt-10">
              <Link
                href="/contact?demo=1"
                className="inline-flex items-center gap-2 bg-white text-neutral-900 px-6 py-3.5 rounded-full text-[15px] font-medium hover:bg-neutral-100 transition-all hover:gap-3"
              >
                Request a Demo <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </main>
  );
}
