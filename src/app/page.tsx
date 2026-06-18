"use client";
import Link from "next/link";
import Image from "next/image";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Users,
  Calendar,
  ClipboardCheck,
  Eye,
  Workflow,
  Activity,
  Boxes,
  ShoppingBag,
  Layers,
  MapPin,
  Repeat,
  Building2,
  Coffee,
  UtensilsCrossed,
  Store,
  Wrench,
  Network,
  Cog,
} from "lucide-react";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import { Reveal, RevealText } from "@/components/site/Reveal";

const HERO_IMG =
  "https://images.unsplash.com/photo-1520529890308-f503006340b4?auto=format&fit=crop&w=2000&q=80";
const SECTION_IMG_1 =
  "https://images.unsplash.com/photo-1548248823-ce16a73b6d49?auto=format&fit=crop&w=1800&q=80";
const SECTION_IMG_2 =
  "https://images.unsplash.com/photo-1524230572899-a752b3835840?auto=format&fit=crop&w=1800&q=80";
const SECTION_IMG_3 =
  "https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?auto=format&fit=crop&w=1800&q=80";

function Hero() {
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
      className="relative pt-32 pb-24 lg:pt-44 lg:pb-32 overflow-hidden"
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

        <h1 className="mt-6 text-[44px] leading-[1.02] sm:text-[64px] md:text-[88px] lg:text-[110px] font-semibold tracking-tightest text-neutral-900 text-balance">
          <RevealText text="Business Operating System" />
          <br />
          <RevealText
            text="for Small Businesses."
            delay={0.2}
            className="text-neutral-400"
          />
        </h1>

        <Reveal delay={0.5}>
          <p className="mt-8 max-w-2xl text-[18px] sm:text-[20px] leading-relaxed text-neutral-600 text-pretty">
            Helping businesses manage workforce, inventory, and operations from
            a single platform.
          </p>
        </Reveal>

        <Reveal delay={0.65}>
          <div className="mt-10 flex flex-wrap items-center gap-3">
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
        className="relative mt-20 max-w-7xl mx-auto px-6 lg:px-10"
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

function Problem() {
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
      body: "Tools that don&apos;t talk to each other create blind spots.",
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

function Solution() {
  return (
    <section className="relative py-28 lg:py-40 bg-neutral-950 text-white overflow-hidden">
      <div className="absolute inset-0 z-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[900px] rounded-full bg-white/4 blur-3xl" />
        <div className="absolute inset-0 grain-bg opacity-[0.06]" />
      </div>
      <div className="relative max-w-7xl mx-auto px-6 lg:px-10">
        <Reveal>
          <div className="text-[12px] tracking-[0.2em] uppercase text-white/50">
            The solution
          </div>
        </Reveal>
        <Reveal delay={0.05}>
          <h2 className="mt-5 text-[44px] sm:text-[64px] md:text-[88px] font-semibold tracking-tightest leading-none max-w-5xl text-balance">
            Meet <span className="text-white">NexBrix.</span>
            <span className="block text-white/40 mt-2">
              One platform. Every operation.
            </span>
          </h2>
        </Reveal>
        <Reveal delay={0.15}>
          <p className="mt-8 max-w-2xl text-[19px] leading-relaxed text-white/70">
            Instead of juggling disconnected tools, businesses can manage every
            critical operation from a single, calm platform.
          </p>
        </Reveal>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-px bg-white/10 border border-white/10 rounded-3xl overflow-hidden">
          {[
            {
              t: "Simple",
              d: "Designed to be understood in minutes, not weeks.",
            },
            {
              t: "Unified",
              d: "Workforce, inventory and operations — in one place.",
            },
            {
              t: "Built to scale",
              d: "From a single location to multi-site operations.",
            },
          ].map((c, i) => (
            <Reveal key={i} delay={i * 0.08}>
              <div className="bg-neutral-950 p-10 h-full">
                <div className="text-[12px] tracking-[0.2em] uppercase text-white/40">
                  07
                </div>
                <h3 className="mt-4 text-[28px] font-semibold tracking-tight">
                  {c.t}
                </h3>
                <p className="mt-3 text-[15px] leading-relaxed text-white/60">
                  {c.d}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function AvailableToday() {
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

function ComingSoon() {
  const features = [
    { icon: Boxes, t: "Stock Tracking" },
    { icon: ShoppingBag, t: "Purchase Management" },
    { icon: Eye, t: "Inventory Visibility" },
    { icon: MapPin, t: "Multi-location Inventory" },
    { icon: Repeat, t: "Reorder Management" },
    { icon: Layers, t: "SKU Management" },
  ];
  return (
    <section className="py-28 lg:py-40 bg-neutral-50">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <div className="grid lg:grid-cols-12 gap-12 items-end">
          <div className="lg:col-span-7">
            <Reveal>
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-neutral-200 text-[12px] tracking-wide text-neutral-700 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />{" "}
                Coming Soon
              </span>
            </Reveal>
            <Reveal delay={0.05}>
              <h2 className="mt-6 text-[40px] sm:text-[56px] md:text-[72px] font-semibold tracking-tightest leading-[1.05] text-neutral-900 text-balance">
                Inventory <span className="text-neutral-400">Management.</span>
              </h2>
            </Reveal>
          </div>
          <Reveal delay={0.1} className="lg:col-span-5">
            <p className="text-[17px] leading-relaxed text-neutral-600">
              The next module on the NexBrix roadmap. Designed for clarity
              across stock, purchasing and multi-location inventory.
            </p>
          </Reveal>
        </div>

        <div className="mt-16 grid grid-cols-2 md:grid-cols-3 gap-4">
          {features.map((f, i) => (
            <Reveal key={i} delay={i * 0.04}>
              <div className="rounded-2xl border border-dashed border-neutral-300 bg-white/60 p-6 backdrop-blur">
                <f.icon
                  className="w-5 h-5 text-neutral-400"
                  strokeWidth={1.6}
                />
                <div className="mt-5 text-[17px] font-medium tracking-tight text-neutral-900">
                  {f.t}
                </div>
                <div className="mt-1 text-[12px] text-amber-700">In design</div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function FutureVision() {
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

function Industries() {
  const items = [
    { icon: UtensilsCrossed, t: "Restaurants" },
    { icon: Coffee, t: "Cafés" },
    { icon: Building2, t: "Hospitality" },
    { icon: Store, t: "Retail Stores" },
    { icon: Wrench, t: "Service Businesses" },
    { icon: Network, t: "Multi-location Operators" },
  ];
  return (
    <section className="py-28 lg:py-40 bg-neutral-50">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <Reveal>
          <div className="text-[12px] tracking-[0.2em] uppercase text-neutral-500">
            Industries
          </div>
        </Reveal>
        <Reveal delay={0.05}>
          <h2 className="mt-5 text-[40px] sm:text-[56px] md:text-[72px] font-semibold tracking-tightest leading-[1.05] text-neutral-900 text-balance">
            Built for growing{" "}
            <span className="text-neutral-400">businesses.</span>
          </h2>
        </Reveal>

        <div className="mt-16 grid grid-cols-2 md:grid-cols-3 gap-4">
          {items.map((it, i) => (
            <Reveal key={i} delay={i * 0.05}>
              <div className="group rounded-2xl border border-neutral-200 bg-white p-8 hover:bg-neutral-900 hover:text-white transition-all duration-300">
                <it.icon
                  className="w-7 h-7 text-neutral-400 group-hover:text-white transition-colors"
                  strokeWidth={1.4}
                />
                <div className="mt-6 text-[22px] font-semibold tracking-tight">
                  {it.t}
                </div>
                <div className="mt-2 inline-flex items-center gap-1 text-[13px] text-neutral-500 group-hover:text-white/70">
                  Learn more <ArrowUpRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function Mission() {
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

function FinalCTA() {
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

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white">
      <Navbar />
      <Hero />
      <Problem />
      <Solution />
      <AvailableToday />
      <ComingSoon />
      <FutureVision />
      <Industries />
      <Mission />
      <FinalCTA />
      <Footer />
    </main>
  );
}
