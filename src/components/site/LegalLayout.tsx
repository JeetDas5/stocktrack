import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import { Reveal } from "@/components/site/Reveal";

interface LegalLayoutProps {
  eyebrow: string;
  title: React.ReactNode;
  effectiveDate?: string;
  children: React.ReactNode;
}

export default function LegalLayout({
  eyebrow,
  title,
  effectiveDate,
  children,
}: LegalLayoutProps) {
  return (
    <main className="min-h-screen bg-white">
      <Navbar />

      <section className="pt-36 lg:pt-44 pb-16 border-b border-neutral-200/70">
        <div className="max-w-5xl mx-auto px-6 lg:px-10">
          <Reveal>
            <div className="text-[12px] tracking-[0.2em] uppercase text-neutral-500">
              {eyebrow}
            </div>
          </Reveal>
          <Reveal delay={0.05}>
            <h1 className="mt-5 text-[40px] sm:text-[56px] md:text-[72px] font-semibold tracking-tightest leading-[1.05] text-neutral-900 text-balance">
              {title}
            </h1>
          </Reveal>
          {effectiveDate && (
            <Reveal delay={0.15}>
              <p className="mt-6 text-[14px] text-neutral-500">
                Effective Date:{" "}
                <span className="text-neutral-800 font-medium">
                  {effectiveDate}
                </span>
              </p>
            </Reveal>
          )}
        </div>
      </section>

      <section className="py-16 lg:py-24">
        <div className="max-w-3xl mx-auto px-6 lg:px-10">
          <Reveal>
            <article className="legal-content space-y-8 text-[16px] leading-[1.75] text-neutral-700">
              {children}
            </article>
          </Reveal>
        </div>
      </section>
    </main>
  );
}
