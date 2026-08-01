"use client";

import { useEffect } from "react";
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

  useEffect(() => {
    const handleWheel = () => {
      const activeEl = document.activeElement;
      if (
        activeEl &&
        activeEl.tagName === "INPUT" &&
        (activeEl as HTMLInputElement).type === "number"
      ) {
        (activeEl as HTMLInputElement).blur();
      }
    };

    window.addEventListener("wheel", handleWheel, { passive: true });
    return () => {
      window.removeEventListener("wheel", handleWheel);
    };
  }, []);

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
