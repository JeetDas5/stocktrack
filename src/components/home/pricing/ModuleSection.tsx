"use client";

import { CheckCircle2 } from "lucide-react";
import { Reveal } from "@/components/site/Reveal";

interface ModuleSectionProps {
  badge: string;
  dot: string;
  title: string;
  subtitle: string;
  features: {
    icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
    t: string;
  }[];
  dashed?: boolean;
}

export default function ModuleSection({
  badge,
  dot,
  title,
  subtitle,
  features,
  dashed = false,
}: ModuleSectionProps) {
  return (
    <section
      className={`py-24 lg:py-32 ${dashed ? "bg-neutral-50" : "bg-white"}`}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <Reveal>
          <span
            className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[12px] tracking-wide font-medium border ${dashed ? "bg-white border-neutral-200 text-neutral-700" : "bg-emerald-50 border-emerald-100 text-emerald-700"}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${dot}`} /> {badge}
          </span>
        </Reveal>
        <Reveal delay={0.05}>
          <h2 className="mt-6 text-[40px] sm:text-[56px] md:text-[72px] font-semibold tracking-tightest leading-[1.05] text-neutral-900 text-balance">
            {title} <span className="text-neutral-400">{subtitle}</span>
          </h2>
        </Reveal>

        <div className="mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f, i) => (
            <Reveal key={i} delay={i * 0.04}>
              <div
                className={`group rounded-2xl ${dashed ? "border border-dashed border-neutral-300 bg-white/60" : "border border-neutral-200 bg-white"} p-6 hover:-translate-y-0.5 transition-all`}
              >
                <div className="flex items-center justify-between">
                  <f.icon
                    className={`w-5 h-5 ${dashed ? "text-neutral-400" : "text-neutral-500 group-hover:text-neutral-900"} transition-colors`}
                    strokeWidth={1.6}
                  />
                  {dashed ? (
                    <span className="text-[11px] tracking-wide text-amber-700">
                      In design
                    </span>
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  )}
                </div>
                <div className="mt-5 text-[17px] font-medium tracking-tight text-neutral-900">
                  {f.t}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
