import "./globals.css";
import { Toaster } from "sonner";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AuthProvider } from "@/providers/auth-provider";
import LayoutWrapper from "@/components/site/LayoutWrapper";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});
export const metadata: Metadata = {
  title: "NexBrix — Business Operating System for Small Businesses",
  description:
    "NexBrix is the Business Operating System for small businesses. Manage workforce, inventory and operations from a single platform.",
  openGraph: {
    title: "NexBrix — Business Operating System for Small Businesses",
    description:
      "One platform to manage workforce, inventory, and business operations.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-white text-zinc-900">
        <AuthProvider>
          <LayoutWrapper>{children}</LayoutWrapper>
          <Toaster position="bottom-right" duration={3000} richColors />
        </AuthProvider>
      </body>
    </html>
  );
}
