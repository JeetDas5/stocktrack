import "./globals.css";
import { Toaster } from "sonner";
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { AuthProvider } from "@/providers/auth-provider";
import LayoutWrapper from "@/components/site/LayoutWrapper";
import { PwaInstallPrompt } from "@/components/pwa-install-prompt";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#0f172a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: "NexBrix | Business Operating System",
  description:
    "NexBrix is the Business Operating System. Manage workforce, inventory and operations from a single platform.",

  manifest: "/manifest.webmanifest",

  icons: {
    icon: [
      { url: "/homescreen/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/homescreen/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/homescreen/android-chrome-192x192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [
      { url: "/homescreen/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "NexBrix",
  },

  openGraph: {
    title: "NexBrix — Business Operating System",
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
          <PwaInstallPrompt />
          <Toaster position="bottom-right" duration={3000} richColors />
        </AuthProvider>
      </body>
    </html>
  );
}

