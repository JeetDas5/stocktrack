"use client";

import {
  Users,
  Calendar,
  ClipboardCheck,
  Layers,
  Building2,
  ShieldCheck,
  FileSpreadsheet,
  UserCheck,
  CheckCircle2,
  Boxes,
  Truck,
  Package,
  BookOpen,
  BarChart3,
  Handshake,
} from "lucide-react";
import {
  Hero,
  WhyNoPricing,
  ModuleSection,
  FutureModules,
  Philosophy,
  FinalCTA,
} from "@/components/home/pricing";

const WORKFORCE = [
  { icon: Users, t: "Employee Accounts" },
  { icon: FileSpreadsheet, t: "Manual Timesheet Entry" },
  { icon: ClipboardCheck, t: "Timesheet Submission" },
  { icon: UserCheck, t: "Timesheet Review" },
  { icon: CheckCircle2, t: "Timesheet Approval" },
  { icon: Calendar, t: "Staff Availability" },
  { icon: Building2, t: "Multi-Business Support" },
  { icon: Layers, t: "Multi-Location Support" },
  { icon: ShieldCheck, t: "Role-Based Permissions" },
];

const INVENTORY = [
  { icon: Boxes, t: "Stock Counts" },
  { icon: Truck, t: "Deliveries" },
  { icon: Package, t: "Products" },
  { icon: BookOpen, t: "Recipes" },
  { icon: BarChart3, t: "Variance Reporting" },
  { icon: Handshake, t: "Supplier Management" },
];

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-white">
      <Hero />
      <WhyNoPricing />
      <ModuleSection
        badge="Available Today"
        dot="bg-emerald-500"
        title="Workforce"
        subtitle="Management."
        features={WORKFORCE}
      />
      <ModuleSection
        badge="Coming Soon"
        dot="bg-amber-500"
        title="Inventory"
        subtitle="Management."
        features={INVENTORY}
        dashed
      />
      <FutureModules />
      <Philosophy />
      <FinalCTA />
    </main>
  );
}
