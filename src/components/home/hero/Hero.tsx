"use client";

import { useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Reveal, RevealText } from "@/components/site/Reveal";

const HERO_IMG = "/images/hero.jpg";

export default function Hero() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [0, 160]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.08]);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0.3]);

  return (
    <section
      ref={ref}
      className="relative pt-32 pb-24 lg:pt-28 lg:pb-32 overflow-hidden"
    >
      <motion.div style={{ opacity }} className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-linear-to-b from-neutral-50 via-white to-white" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[1200px] rounded-full bg-linear-to-br from-neutral-100 to-transparent blur-3xl opacity-60" />
      </motion.div>

      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <Reveal>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-neutral-200 bg-white/60 backdrop-blur text-[12px] tracking-wide text-neutral-600">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Early Access
          </div>
        </Reveal>

        <h1 className="mt-2 text-[44px] leading-[1.02] sm:text-[64px] md:text-[88px] lg:text-[110px] font-semibold tracking-tightest text-neutral-900 text-balance">
          <RevealText text="Business Operating System" />
          <br />
          <RevealText
            text="for Small Businesses."
            delay={0.2}
            className="text-neutral-400"
          />
        </h1>

        <Reveal delay={0.5}>
          <p className="mt-4 max-w-2xl text-[18px] sm:text-[20px] leading-relaxed text-neutral-600 text-pretty">
            Helping businesses manage workforce, inventory, and operations from
            a single platform.
          </p>
        </Reveal>

        <Reveal delay={0.5}>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <Link
              href="/contact?demo=1"
              className="inline-flex items-center gap-2 bg-neutral-900 text-white px-6 py-3.5 rounded-full text-[15px] font-medium hover:bg-neutral-800 transition-all hover:gap-3"
            >
              Request a Demo <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 bg-white text-neutral-900 px-6 py-3.5 rounded-full text-[15px] font-medium border border-neutral-200 hover:border-neutral-300 transition-colors"
            >
              Contact Us
            </Link>
          </div>
        </Reveal>
      </div>

      <motion.div
        style={{ y, scale }}
        className="relative mt-10 max-w-7xl mx-auto px-6 lg:px-10"
      >
        <Reveal delay={0.3}>
          <div className="relative aspect-video rounded-3xl overflow-hidden border border-neutral-200/80 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.15)]">
            <Image
              src={HERO_IMG}
              alt="NexBrix"
              fill
              priority
              className="object-cover"
              sizes="100vw"
            />
            <div className="absolute inset-0 bg-linear-to-t from-white/40 via-transparent to-transparent" />
            <div className="absolute bottom-6 left-6 right-6 sm:bottom-10 sm:left-10 sm:right-10 flex items-end justify-between">
              <div className="text-white drop-shadow-md">
                <div className="text-[11px] tracking-[0.2em] uppercase opacity-80">
                  NexBrix
                </div>
                <div className="text-2xl sm:text-3xl font-semibold tracking-tight">
                  One platform. Every operation.
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </motion.div>
    </section>
  );
}
