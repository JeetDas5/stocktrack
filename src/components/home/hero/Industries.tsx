"use client";

import {
  UtensilsCrossed,
  Coffee,
  Building2,
  Store,
  Wrench,
  Network,
  ArrowUpRight,
} from "lucide-react";
import { Reveal } from "@/components/site/Reveal";

export default function Industries() {
  const items = [
    { icon: UtensilsCrossed, t: "Restaurants" },
    { icon: Coffee, t: "Cafés" },
    { icon: Building2, t: "Hospitality" },
    { icon: Store, t: "Retail Stores" },
    { icon: Wrench, t: "Service Businesses" },
    { icon: Network, t: "Multi-location Operators" },
  ];

  return (
    <section className="py-28 lg:py-40 bg-neutral-50">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <Reveal>
          <div className="text-[12px] tracking-[0.2em] uppercase text-neutral-500">
            Industries
          </div>
        </Reveal>
        <Reveal delay={0.05}>
          <h2 className="mt-5 text-[40px] sm:text-[56px] md:text-[72px] font-semibold tracking-tightest leading-[1.05] text-neutral-900 text-balance">
            Built for growing{" "}
            <span className="text-neutral-400">businesses.</span>
          </h2>
        </Reveal>

        <div className="mt-16 grid grid-cols-2 md:grid-cols-3 gap-4">
          {items.map((it, i) => (
            <Reveal key={i} delay={i * 0.05}>
              <div className="group rounded-2xl border border-neutral-200 bg-white p-8 hover:bg-neutral-900 hover:text-white transition-all duration-300">
                <it.icon
                  className="w-7 h-7 text-neutral-400 group-hover:text-white transition-colors"
                  strokeWidth={1.4}
                />
                <div className="mt-6 text-[22px] font-semibold tracking-tight">
                  {it.t}
                </div>
                <div className="mt-2 inline-flex items-center gap-1 text-[13px] text-neutral-500 group-hover:text-white/70">
                  Learn more <ArrowUpRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
