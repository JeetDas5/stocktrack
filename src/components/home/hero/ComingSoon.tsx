"use client";

import {
  Boxes,
  ShoppingBag,
  Eye,
  MapPin,
  Repeat,
  Layers,
} from "lucide-react";
import { Reveal } from "@/components/site/Reveal";

export default function ComingSoon() {
  const features = [
    { icon: Boxes, t: "Stock Tracking" },
    { icon: ShoppingBag, t: "Purchase Management" },
    { icon: Eye, t: "Inventory Visibility" },
    { icon: MapPin, t: "Multi-location Inventory" },
    { icon: Repeat, t: "Reorder Management" },
    { icon: Layers, t: "SKU Management" },
  ];

  return (
    <section className="py-28 lg:py-40 bg-neutral-50">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <div className="grid lg:grid-cols-12 gap-12 items-end">
          <div className="lg:col-span-7">
            <Reveal>
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-neutral-200 text-[12px] tracking-wide text-neutral-700 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />{" "}
                Coming Soon
              </span>
            </Reveal>
            <Reveal delay={0.05}>
              <h2 className="mt-6 text-[40px] sm:text-[56px] md:text-[72px] font-semibold tracking-tightest leading-[1.05] text-neutral-900 text-balance">
                Inventory <span className="text-neutral-400">Management.</span>
              </h2>
            </Reveal>
          </div>
          <Reveal delay={0.1} className="lg:col-span-5">
            <p className="text-[17px] leading-relaxed text-neutral-600">
              The next module on the NexBrix roadmap. Designed for clarity
              across stock, purchasing and multi-location inventory.
            </p>
          </Reveal>
        </div>

        <div className="mt-16 grid grid-cols-2 md:grid-cols-3 gap-4">
          {features.map((f, i) => (
            <Reveal key={i} delay={i * 0.04}>
              <div className="rounded-2xl border border-dashed border-neutral-300 bg-white/60 p-6 backdrop-blur">
                <f.icon
                  className="w-5 h-5 text-neutral-400"
                  strokeWidth={1.6}
                />
                <div className="mt-5 text-[17px] font-medium tracking-tight text-neutral-900">
                  {f.t}
                </div>
                <div className="mt-1 text-[12px] text-amber-700">In design</div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
