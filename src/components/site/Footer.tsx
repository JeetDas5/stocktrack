import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-neutral-200/70 bg-white">
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-16">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
          <div className="md:col-span-5">
            <Link href="/" className="flex items-center gap-2">
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
            <p className="mt-5 text-[15px] leading-relaxed text-neutral-600 max-w-sm">
              The Business Operating System for small businesses. Workforce,
              inventory and operations — unified.
            </p>
          </div>

          <div className="md:col-span-2">
            <h4 className="text-[13px] font-semibold tracking-wide text-neutral-900 uppercase">
              Company
            </h4>
            <ul className="mt-4 space-y-3 text-[14px] text-neutral-600">
              <li>
                <Link href="/" className="hover:text-neutral-900">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-neutral-900">
                  About
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-neutral-900">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          <div className="md:col-span-2">
            <h4 className="text-[13px] font-semibold tracking-wide text-neutral-900 uppercase">
              Legal
            </h4>
            <ul className="mt-4 space-y-3 text-[14px] text-neutral-600">
              <li>
                <Link href="/privacy-policy" className="hover:text-neutral-900">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-neutral-900">
                  Terms &amp; Conditions
                </Link>
              </li>
            </ul>
          </div>

          <div className="md:col-span-3">
            <h4 className="text-[13px] font-semibold tracking-wide text-neutral-900 uppercase">
              Get started
            </h4>
            <p className="mt-4 text-[14px] text-neutral-600">
              Discover how NexBrix can help simplify your operations.
            </p>
            <Link
              href="/contact?demo=1"
              className="inline-flex items-center gap-2 mt-5 bg-neutral-900 text-white px-4 py-2 rounded-full text-[13px] font-medium hover:bg-neutral-800 transition-colors"
            >
              Request a Demo
            </Link>
          </div>
        </div>

        <div className="mt-14 pt-6 border-t border-neutral-200/70 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <p className="text-[12px] text-neutral-500">
            © {new Date().getFullYear()} NexBrix. All rights reserved.
          </p>
          <p className="text-[12px] text-neutral-500">
            Early Access · Built for growing businesses, globally.
          </p>
        </div>
      </div>
    </footer>
  );
}
