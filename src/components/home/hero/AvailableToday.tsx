"use client";

import Image from "next/image";
import {
  Calendar,
  Workflow,
  ClipboardCheck,
  Eye,
  Users,
  Activity,
  CheckCircle2,
} from "lucide-react";
import { Reveal } from "@/components/site/Reveal";

const SECTION_IMG_1 = "/images/sec1.jpg";

export default function AvailableToday() {
  const features = [
    { icon: Calendar, t: "Staff Scheduling" },
    { icon: Workflow, t: "Shift Management" },
    { icon: ClipboardCheck, t: "Attendance Tracking" },
    { icon: Eye, t: "Workforce Visibility" },
    { icon: Users, t: "Team Coordination" },
    { icon: Activity, t: "Operational Oversight" },
  ];

  return (
    <section className="py-28 lg:py-40 bg-white">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <div className="grid lg:grid-cols-12 gap-12 items-end">
          <div className="lg:col-span-7">
            <Reveal>
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-[12px] tracking-wide text-emerald-700 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />{" "}
                Available Today
              </span>
            </Reveal>
            <Reveal delay={0.05}>
              <h2 className="mt-6 text-[40px] sm:text-[56px] md:text-[72px] font-semibold tracking-tightest leading-[1.05] text-neutral-900 text-balance">
                Workforce <span className="text-neutral-400">Management.</span>
              </h2>
            </Reveal>
          </div>
          <Reveal delay={0.1} className="lg:col-span-5">
            <p className="text-[17px] leading-relaxed text-neutral-600">
              Run shifts, attendance and team coordination with confidence —
              from a single, beautifully simple workspace.
            </p>
          </Reveal>
        </div>

        <Reveal delay={0.15}>
          <div className="mt-16 relative aspect-video rounded-3xl overflow-hidden border border-neutral-200">
            <Image
              src={SECTION_IMG_1}
              alt="Workforce"
              fill
              className="object-cover"
              sizes="100vw"
            />
            <div className="absolute inset-0 bg-linear-to-tr from-white/60 via-white/0 to-white/30" />
          </div>
        </Reveal>

        <div className="mt-12 grid grid-cols-2 md:grid-cols-3 gap-4">
          {features.map((f, i) => (
            <Reveal key={i} delay={i * 0.04}>
              <div className="group rounded-2xl border border-neutral-200 bg-white p-6 hover:border-neutral-300 hover:-translate-y-0.5 transition-all">
                <f.icon
                  className="w-5 h-5 text-neutral-500 group-hover:text-neutral-900 transition-colors"
                  strokeWidth={1.6}
                />
                <div className="mt-5 text-[17px] font-medium tracking-tight text-neutral-900">
                  {f.t}
                </div>
                <div className="mt-1 flex items-center gap-1 text-[12px] text-emerald-700">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Live
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
