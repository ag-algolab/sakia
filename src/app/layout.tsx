import type { Metadata, Viewport } from "next";
import { Cairo, Fraunces, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { LangProvider } from "@/components/ui/LangProvider";
import Header from "@/components/ui/Header";
import Footer from "@/components/ui/Footer";
import { MotionRoot } from "@/components/ui/motion";
import { ProfileSync } from "@/components/ui/profile";
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

const TITLE = "Sakia — one irrigation decision a day";
const DESCRIPTION =
  "Which day to irrigate and how much, 7 days ahead, for Tunisian smallholders: by voice, SMS or chat, with no smartphone and no reading needed. Indicative advice from real weather data.";

export const metadata: Metadata = {
  metadataBase: new URL("https://sakia-opal.vercel.app"),
  title: TITLE,
  description: DESCRIPTION,
  openGraph: { title: TITLE, description: DESCRIPTION, siteName: "Sakia", type: "website", locale: "en_US" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
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
          <ProfileSync />
          <ServiceWorkerRegister />
          <OfflineBanner />
          <Header />
          {children}
          <Footer />
        </LangProvider>
      </body>
    </html>
  );
}
