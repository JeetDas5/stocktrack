"use client";

import Image from "next/image";
import { Reveal } from "@/components/site/Reveal";

const SECTION_IMG_2 = "/images/sec2.jpg";

export default function FutureVision() {
  const pillars = [
    "Workforce",
    "Inventory",
    "Operations",
    "Reporting",
    "Analytics",
    "Multi-location",
    "Future Modules",
  ];

  return (
    <section className="relative py-28 lg:py-44 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <Reveal>
          <div className="text-[12px] tracking-[0.2em] uppercase text-neutral-500">
            The vision
          </div>
        </Reveal>
        <Reveal delay={0.05}>
          <h2 className="mt-5 text-[44px] sm:text-[64px] md:text-[88px] font-semibold tracking-tightest leading-none text-neutral-900 max-w-5xl text-balance">
            The bigger <span className="text-neutral-400">picture.</span>
          </h2>
        </Reveal>
        <Reveal delay={0.15}>
          <p className="mt-8 max-w-2xl text-[19px] leading-relaxed text-neutral-600">
            Today, businesses rely on disconnected systems. Tomorrow, NexBrix
            becomes the central operating system connecting every part of the
            business.
          </p>
        </Reveal>

        <div className="mt-20 relative">
          <Reveal>
            <div className="relative aspect-video rounded-3xl overflow-hidden border border-neutral-200">
              <Image
                src={SECTION_IMG_2}
                alt="Vision"
                fill
                className="object-cover"
                sizes="100vw"
              />
              <div className="absolute inset-0 bg-linear-to-b from-white/0 via-white/0 to-white" />
            </div>
          </Reveal>

          <div className="mt-12 flex flex-wrap gap-3 justify-center">
            {pillars.map((p, i) => (
              <Reveal key={i} delay={i * 0.04}>
                <div className="px-5 py-2.5 rounded-full border border-neutral-200 bg-white text-[14px] text-neutral-700 hover:border-neutral-900 hover:text-neutral-900 transition-colors">
                  {p}
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
