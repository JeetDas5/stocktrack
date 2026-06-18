"use client";

import {
  LayoutGrid,
  ShoppingCart,
  LineChart,
  Bot,
} from "lucide-react";
import { Reveal } from "@/components/site/Reveal";

const FUTURE = [
  { icon: LayoutGrid, t: "Rostering" },
  { icon: ShoppingCart, t: "Purchasing" },
  { icon: LineChart, t: "Business Intelligence" },
  { icon: Bot, t: "AI Business Assistant" },
];

export default function FutureModules() {
  return (
    <section className="py-24 lg:py-32 bg-neutral-950 text-white relative overflow-hidden">
      <div className="absolute inset-0 -z-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[900px] rounded-full bg-white/[0.04] blur-3xl" />
        <div className="absolute inset-0 grain-bg opacity-[0.06]" />
      </div>
      <div className="relative max-w-7xl mx-auto px-6 lg:px-10">
        <Reveal>
          <div className="text-[12px] tracking-[0.2em] uppercase text-white/50">
            On the horizon
          </div>
        </Reveal>
        <Reveal delay={0.05}>
          <h2 className="mt-5 text-[40px] sm:text-[56px] md:text-[72px] font-semibold tracking-tightest leading-[1.05] text-balance">
            Future <span className="text-white/40">modules.</span>
          </h2>
        </Reveal>

        <div className="mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {FUTURE.map((f, i) => (
            <Reveal key={i} delay={i * 0.06}>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 hover:bg-white/[0.06] transition-colors">
                <f.icon className="w-5 h-5 text-white/60" strokeWidth={1.5} />
                <div className="mt-5 text-[17px] font-medium tracking-tight">
                  {f.t}
                </div>
                <div className="mt-1 text-[12px] text-white/40">Planned</div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
