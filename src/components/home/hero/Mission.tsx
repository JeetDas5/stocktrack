"use client";

import { Reveal } from "@/components/site/Reveal";

export default function Mission() {
  return (
    <section className="relative py-32 lg:py-48 bg-white">
      <div className="max-w-5xl mx-auto px-6 lg:px-10 text-center">
        <Reveal>
          <div className="text-[12px] tracking-[0.2em] uppercase text-neutral-500">
            Our mission
          </div>
        </Reveal>
        <Reveal delay={0.05}>
          <h2 className="mt-6 text-[40px] sm:text-[56px] md:text-[80px] font-semibold tracking-tightest leading-[1.05] text-neutral-900 text-balance">
            Why <span className="text-neutral-400">NexBrix</span> exists.
          </h2>
        </Reveal>
        <Reveal delay={0.15}>
          <p className="mt-10 text-[20px] sm:text-[24px] leading-normal text-neutral-700 text-pretty">
            Small businesses power economies, yet many still rely on
            disconnected tools and manual processes.
          </p>
        </Reveal>
        <Reveal delay={0.25}>
          <p className="mt-6 text-[20px] sm:text-[24px] leading-normal text-neutral-500 text-pretty">
            NexBrix exists to help growing businesses operate with the same
            clarity, structure, and efficiency enjoyed by larger enterprises.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
