"use client";

import { Reveal } from "@/components/site/Reveal";

export default function Philosophy() {
  const items = [
    { t: "Simple", d: "Plans you can understand at a glance." },
    { t: "Predictable", d: "No surprise costs as your business grows." },
    { t: "Aligned", d: "Pricing that scales with the value you receive." },
    { t: "Transparent", d: "We’ll communicate changes clearly, always." },
  ];

  return (
    <section className="py-24 lg:py-32 bg-white">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <Reveal>
          <div className="text-[12px] tracking-[0.2em] uppercase text-neutral-500">
            Our philosophy
          </div>
        </Reveal>
        <Reveal delay={0.05}>
          <h2 className="mt-5 text-[40px] sm:text-[56px] md:text-[64px] font-semibold tracking-tightest leading-[1.05] text-neutral-900 max-w-4xl text-balance">
            Future pricing,{" "}
            <span className="text-neutral-400">built on principles.</span>
          </h2>
        </Reveal>

        <div className="mt-12 grid lg:grid-cols-2 gap-12 items-start">
          <Reveal delay={0.1}>
            <div className="space-y-5 text-[17px] leading-relaxed text-neutral-700">
              <p>
                We believe software pricing should be simple, predictable and
                aligned with business growth.
              </p>
              <p>
                Future plans are expected to be based on business size,
                locations and platform usage rather than complex feature
                restrictions.
              </p>
              <p>
                Our goal is to provide affordable access for growing businesses
                while continuing to invest in new functionality.
              </p>
              <p>
                We are committed to maintaining transparent pricing as the
                platform evolves.
              </p>
            </div>
          </Reveal>

          <div className="grid grid-cols-2 gap-4">
            {items.map((it, i) => (
              <Reveal key={i} delay={0.15 + i * 0.05}>
                <div className="rounded-2xl border border-neutral-200 bg-white p-6 h-full">
                  <div className="text-[12px] tracking-[0.2em] uppercase text-neutral-400">
                    0{i + 1}
                  </div>
                  <div className="mt-3 text-[22px] font-semibold tracking-tight text-neutral-900">
                    {it.t}
                  </div>
                  <div className="mt-2 text-[14px] leading-relaxed text-neutral-600">
                    {it.d}
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
