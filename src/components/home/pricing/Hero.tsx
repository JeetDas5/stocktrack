"use client";

import { Clock } from "lucide-react";
import { Reveal, RevealText } from "@/components/site/Reveal";

export default function Hero() {
  return (
    <section className="relative pt-36 lg:pt-48 pb-20 lg:pb-28 overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-neutral-50 via-white to-white" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[1200px] rounded-full bg-gradient-to-br from-neutral-100 to-transparent blur-3xl opacity-60" />
      </div>

      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <Reveal>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-neutral-200 bg-white/60 backdrop-blur text-[12px] tracking-wide text-neutral-600">
            <Clock className="w-3.5 h-3.5 text-neutral-500" />
            Pricing
          </div>
        </Reveal>
        <h1 className="mt-6 text-[44px] sm:text-[64px] md:text-[96px] font-semibold tracking-tightest leading-[1] text-neutral-900 max-w-5xl text-balance">
          <RevealText text="Simple, transparent" />
          <br />
          <RevealText
            text="pricing."
            delay={0.15}
            className="text-neutral-400"
          />
        </h1>
        <Reveal delay={0.4}>
          <p className="mt-8 max-w-2xl text-[19px] leading-relaxed text-neutral-600">
            Pricing will be announced once NexBrix completes its Early Access
            phase and additional modules become available.
          </p>
        </Reveal>
        <Reveal delay={0.5}>
          <p className="mt-4 max-w-2xl text-[17px] leading-relaxed text-neutral-500">
            Our focus today is delivering a reliable product experience and
            gathering real-world feedback before launching public pricing plans.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
