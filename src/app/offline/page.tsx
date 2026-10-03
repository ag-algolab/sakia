import type { Metadata } from "next";
import Link from "next/link";
import RetryButton from "@/components/phone/RetryButton";
import ServiceWorkerRegister from "@/components/phone/ServiceWorkerRegister";
import { STRINGS, UI_LANGS } from "@/components/phone/strings";

export const metadata: Metadata = {
  title: "Sakia · Hors connexion",
  robots: { index: false },
};

// Page montrée quand une page demandée n'est pas gardée sur l'appareil et qu'il n'y a pas d'internet.
// Les trois langues sont écrites en même temps : cette page doit se lire sans aucun réglage.
export default function OfflinePage() {
  return (
    <main className="flex flex-1 items-center justify-center bg-[#f4efe6] px-4 py-12 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
      <div className="w-full max-w-xl space-y-8">
        {UI_LANGS.map((l) => (
          <section key={l} lang={l} dir={l === "ar" ? "rtl" : "ltr"} className="space-y-2">
            <h1 className="text-xl font-semibold">{STRINGS[l].offlineTitle}</h1>
            <p className="leading-7">{STRINGS[l].offlineBody}</p>
            <p className="text-sm font-medium text-[#2f6b3a] dark:text-[#9ccfa6]">{STRINGS[l].truth}</p>
          </section>
        ))}
        <div className="flex flex-wrap items-center gap-3">
          <RetryButton label="Réessayer · إعادة المحاولة · Try again" />
          <Link href="/" className="text-sm underline">
            {STRINGS.fr.home}
          </Link>
          <Link href="/phone" className="text-sm underline">
            {STRINGS.fr.openPhone}
          </Link>
        </div>
      </div>
      <ServiceWorkerRegister />
    </main>
  );
}
