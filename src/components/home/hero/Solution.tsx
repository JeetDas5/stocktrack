"use client";

import { Reveal } from "@/components/site/Reveal";

export default function Solution() {
  return (
    <section className="relative py-28 lg:py-40 bg-neutral-950 text-white overflow-hidden">
      <div className="absolute inset-0 z-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[900px] rounded-full bg-white/4 blur-3xl" />
        <div className="absolute inset-0 grain-bg opacity-[0.06]" />
      </div>
      <div className="relative max-w-7xl mx-auto px-6 lg:px-10">
        <Reveal>
          <div className="text-[12px] tracking-[0.2em] uppercase text-white/50">
            The solution
          </div>
        </Reveal>
        <Reveal delay={0.05}>
          <h2 className="mt-5 text-[44px] sm:text-[64px] md:text-[88px] font-semibold tracking-tightest leading-none max-w-5xl text-balance">
            Meet <span className="text-white">NexBrix.</span>
            <span className="block text-white/40 mt-2">
              One platform. Every operation.
            </span>
          </h2>
        </Reveal>
        <Reveal delay={0.15}>
          <p className="mt-8 max-w-2xl text-[19px] leading-relaxed text-white/70">
            Instead of juggling disconnected tools, businesses can manage every
            critical operation from a single, calm platform.
          </p>
        </Reveal>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-px bg-white/10 border border-white/10 rounded-3xl overflow-hidden">
          {[
            {
              t: "Simple",
              d: "Designed to be understood in minutes, not weeks.",
            },
            {
              t: "Unified",
              d: "Workforce, inventory and operations — in one place.",
            },
            {
              t: "Built to scale",
              d: "From a single location to multi-site operations.",
            },
          ].map((c, i) => (
            <Reveal key={i} delay={i * 0.08}>
              <div className="bg-neutral-950 p-10 h-full">
                <div className="text-[12px] tracking-[0.2em] uppercase text-white/40">
                  07
                </div>
                <h3 className="mt-4 text-[28px] font-semibold tracking-tight">
                  {c.t}
                </h3>
                <p className="mt-3 text-[15px] leading-relaxed text-white/60">
                  {c.d}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
