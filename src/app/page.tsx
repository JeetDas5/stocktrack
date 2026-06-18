"use client";

import {
  Hero,
  Problem,
  Solution,
  AvailableToday,
  ComingSoon,
  FutureVision,
  Industries,
  Mission,
  FinalCTA,
} from "@/components/home/hero";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white">
      <Hero />
      <Problem />
      <Solution />
      <AvailableToday />
      <ComingSoon />
      <FutureVision />
      <Industries />
      <Mission />
      <FinalCTA />
    </main>
  );
}
