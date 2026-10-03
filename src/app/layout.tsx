import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { LangProvider } from "@/components/ui/LangProvider";
import Header from "@/components/ui/Header";
import ServiceWorkerRegister from "@/components/phone/ServiceWorkerRegister";
import OfflineBanner from "@/components/phone/OfflineBanner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
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
  themeColor: "#2f5d3a",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <LangProvider>
          <ServiceWorkerRegister />
          <OfflineBanner />
          <Header />
          {children}
        </LangProvider>
      </body>
    </html>
  );
}
