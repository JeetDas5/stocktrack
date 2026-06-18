"use client";

import { usePathname } from "next/navigation";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";

export default function LayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isDashboard = pathname?.startsWith("/dashboard");
  const isInvite = pathname?.startsWith("/invite");

  if (isDashboard || isInvite) {
    return <>{children}</>;
  }

  return (
    <>
      <Navbar />
      {children}
      <Footer />
    </>
  );
}
