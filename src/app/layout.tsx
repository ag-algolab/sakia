import type { Metadata, Viewport } from "next";
import { Cairo, Fraunces, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { LangProvider } from "@/components/ui/LangProvider";
import Header from "@/components/ui/Header";
import { MotionRoot } from "@/components/ui/motion";
import ServiceWorkerRegister from "@/components/phone/ServiceWorkerRegister";
import OfflineBanner from "@/components/phone/OfflineBanner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

// Cairo : lettres arabes et latines très lisibles sur un petit écran. Fraunces : serif chaleureuse pour les grands titres latins.
const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
  display: "swap",
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sakia — irrigation advice",
  description: "When and how much to irrigate over the next 7 days, from real weather data (Tunisia).",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0d2e22",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} ${cairo.variable} ${fraunces.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <LangProvider>
          <MotionRoot />
          <ServiceWorkerRegister />
          <OfflineBanner />
          <Header />
          {children}
        </LangProvider>
      </body>
    </html>
  );
}
