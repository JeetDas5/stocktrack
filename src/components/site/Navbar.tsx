"use client";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

const LINKS = [
  { href: "/home", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 ${scrolled ? "backdrop-blur-xl bg-white/70 border-b border-neutral-200/60" : "bg-transparent"}`}
    >
      <nav className="max-w-7xl mx-auto px-6 lg:px-10 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <span className="relative inline-flex items-center justify-center w-7 h-7">
            <span className="absolute inset-0 rounded-md bg-neutral-900" />
            <span className="relative text-white font-bold text-[13px] tracking-tight">
              N
            </span>
          </span>
          <span className="font-semibold tracking-tight text-[15px]">
            NexBrix
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-1">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`px-4 py-2 text-[14px] rounded-full transition-colors ${pathname === l.href ? "text-neutral-900" : "text-neutral-600 hover:text-neutral-900"}`}
            >
              {l.label}
            </Link>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/contact?demo=1"
            className="inline-flex items-center gap-2 bg-neutral-900 text-white px-4 py-2 rounded-full text-[14px] font-medium hover:bg-neutral-800 transition-colors"
          >
            Request a Demo
          </Link>
        </div>

        <button
          className="md:hidden p-2 -mr-2"
          onClick={() => setOpen((v) => !v)}
          aria-label="Menu"
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="md:hidden bg-white/95 backdrop-blur-xl border-b border-neutral-200/60"
          >
            <div className="px-6 py-6 flex flex-col gap-4">
              {LINKS.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="text-lg font-medium text-neutral-900"
                >
                  {l.label}
                </Link>
              ))}
              <Link
                href="/contact?demo=1"
                onClick={() => setOpen(false)}
                className="mt-2 inline-flex items-center justify-center bg-neutral-900 text-white px-5 py-3 rounded-full text-[15px] font-medium"
              >
                Request a Demo
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
