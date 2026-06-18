"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { Reveal } from "@/components/site/Reveal";

const SECTION_IMG_3 = "/images/sec3.jpg";

export default function FinalCTA() {
  return (
    <section className="relative py-28 lg:py-40 bg-neutral-950 text-white overflow-hidden">
      <div className="absolute inset-0">
        <Image
          src={SECTION_IMG_3}
          alt=""
          fill
          className="object-cover opacity-25"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-linear-to-b from-neutral-950 via-neutral-950/80 to-neutral-950" />
      </div>
      <div className="relative max-w-5xl mx-auto px-6 lg:px-10 text-center">
        <Reveal>
          <h2 className="text-[44px] sm:text-[64px] md:text-[88px] font-semibold tracking-tightest leading-none text-balance">
            Ready to see{" "}
            <span className="text-white/50">what&apos;s next?</span>
          </h2>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="mt-8 text-[18px] sm:text-[20px] text-white/70 max-w-2xl mx-auto">
            Discover how NexBrix can help simplify your business operations.
          </p>
        </Reveal>
        <Reveal delay={0.2}>
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
