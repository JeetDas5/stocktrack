"use client";

import { Reveal } from "@/components/site/Reveal";

export default function WhyNoPricing() {
  return (
    <section className="py-24 lg:py-32 bg-white border-t border-neutral-200/70">
      <div className="max-w-7xl mx-auto px-6 lg:px-10 grid lg:grid-cols-12 gap-12">
        <Reveal className="lg:col-span-5">
          <div>
            <div className="text-[12px] tracking-[0.2em] uppercase text-neutral-500">
              Transparency
            </div>
            <h2 className="mt-5 text-[36px] sm:text-[48px] md:text-[56px] font-semibold tracking-tightest leading-[1.05] text-neutral-900 text-balance">
              Why pricing isn’t available yet.
            </h2>
          </div>
        </Reveal>
        <Reveal delay={0.1} className="lg:col-span-7">
          <div className="space-y-6 text-[18px] leading-relaxed text-neutral-700">
            <p>
              NexBrix is currently being tested in real business environments as
              part of our Early Access program.
            </p>
            <p>
              We’re focused on delivering a reliable product experience before
              finalising public pricing plans.
            </p>
            <p>
              This allows us to ensure that future pricing reflects real
              customer value rather than assumptions.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
