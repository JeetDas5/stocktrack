"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Reveal } from "@/components/site/Reveal";

export default function FinalCTA() {
  return (
    <section className="py-24 lg:py-32 bg-neutral-950 text-white text-center">
      <div className="max-w-4xl mx-auto px-6 lg:px-10">
        <Reveal>
          <div className="text-[12px] tracking-[0.2em] uppercase text-white/50">
            Get started
          </div>
        </Reveal>
        <Reveal delay={0.05}>
          <h2 className="mt-5 text-[40px] sm:text-[56px] md:text-[72px] font-semibold tracking-tightest leading-[1] text-balance">
            Interested in NexBrix?
          </h2>
        </Reveal>
        <Reveal delay={0.15}>
          <p className="mt-8 text-[18px] leading-relaxed text-white/70 max-w-2xl mx-auto">
            Learn how NexBrix can help simplify workforce management, inventory
            tracking and business operations.
          </p>
        </Reveal>
        <Reveal delay={0.25}>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/contact?demo=1"
              className="inline-flex items-center gap-2 bg-white text-neutral-900 px-6 py-3.5 rounded-full text-[15px] font-medium hover:bg-neutral-100 transition-all hover:gap-3"
            >
              Request a Demo <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 bg-transparent text-white px-6 py-3.5 rounded-full text-[15px] font-medium border border-white/20 hover:border-white/40 transition-colors"
            >
              Contact Us
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
