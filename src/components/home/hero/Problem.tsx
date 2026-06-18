"use client";

import {
  Calendar,
  Cog,
  Network,
  Boxes,
  Eye,
  Clock,
} from "lucide-react";
import { Reveal } from "@/components/site/Reveal";

export default function Problem() {
  const points = [
    {
      icon: Calendar,
      title: "Workforce scheduling complexity",
      body: "Endless spreadsheets, last-minute swaps, missed shifts.",
    },
    {
      icon: Cog,
      title: "Manual operations",
      body: "Repetitive tasks consume time that should fuel growth.",
    },
    {
      icon: Network,
      title: "Disconnected systems",
      body: "Tools that don't talk to each other create blind spots.",
    },
    {
      icon: Boxes,
      title: "Inventory uncertainty",
      body: "Stockouts, over-ordering and waste eat into margins.",
    },
    {
      icon: Eye,
      title: "Lack of visibility",
      body: "No single view of what is actually happening on the floor.",
    },
    {
      icon: Clock,
      title: "Time lost to admin",
      body: "Hours spent reconciling numbers instead of serving customers.",
    },
  ];

  return (
    <section className="relative py-28 lg:py-40 bg-white">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <Reveal>
          <div className="text-[12px] tracking-[0.2em] uppercase text-neutral-500">
            The problem
          </div>
        </Reveal>
        <Reveal delay={0.05}>
          <h2 className="mt-5 text-[40px] sm:text-[56px] md:text-[72px] font-semibold tracking-tightest leading-[1.05] text-neutral-900 max-w-4xl text-balance">
            Most businesses are{" "}
            <span className="text-neutral-400">flying blind.</span>
          </h2>
        </Reveal>
        <Reveal delay={0.15}>
          <p className="mt-6 max-w-2xl text-[18px] leading-relaxed text-neutral-600">
            Small businesses run on grit and instinct — but the systems they
            rely on were never designed for the way they operate today.
          </p>
        </Reveal>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-neutral-200 border border-neutral-200 rounded-3xl overflow-hidden">
          {points.map((p, i) => (
            <Reveal key={i} delay={i * 0.05}>
              <div className="bg-white p-8 lg:p-10 h-full hover:bg-neutral-50/60 transition-colors">
                <p.icon
                  className="w-6 h-6 text-neutral-400"
                  strokeWidth={1.5}
                />
                <h3 className="mt-6 text-[20px] font-semibold tracking-tight text-neutral-900">
                  {p.title}
                </h3>
                <p className="mt-3 text-[15px] leading-relaxed text-neutral-600">
                  {p.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
