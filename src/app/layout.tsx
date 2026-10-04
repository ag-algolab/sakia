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

// Lu AVANT la première image, pour que la page naisse directement dans la bonne langue et à la bonne taille (sans cela : un éclair
// d'anglais de gauche à droite, puis un saut de mise en page quand la langue gardée et le profil sont lus, plus d'une seconde
// sur un téléphone modeste). Il ne fait que lire l'appareil : rien n'est envoyé.
//  - langue gardée (ou ?lang=) autre que l'anglais : lang et dir de <html> tout de suite, et la page reste masquée jusqu'à ce que
//    LangProvider ait appliqué cette langue (data-lang-pending ; garde-fou en CSS : elle se démasque seule au bout de 2,5 s) ;
//  - profil complet (région et culture) gardé : data-profile, pour que l'espace réservé au questionnaire de l'accueil ait déjà
//    la hauteur du résumé et non celle du questionnaire (voir FieldQuestions).
// Même logique de lecture que LangProvider et components/ui/profile.tsx : à garder alignées.
const EARLY = `(function(){try{var d=document.documentElement,q=new URLSearchParams(location.search).get("lang"),l=q||localStorage.getItem("sakia-lang");if(l==="fr"||l==="ar"||l==="aeb"){d.lang=l==="aeb"?"ar-TN":l;d.dir=l==="fr"?"ltr":"rtl";d.setAttribute("data-lang-pending","")}var f=JSON.parse(localStorage.getItem("sakia-form")||"null");if(f&&f.region&&f.crop)d.setAttribute("data-profile","1")}catch(e){}})()`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${cairo.variable} ${fraunces.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: EARLY }} />
      </head>
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
