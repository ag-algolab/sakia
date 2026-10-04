import type { Metadata } from "next";
import Link from "next/link";
import RetryButton from "@/components/phone/RetryButton";
import ServiceWorkerRegister from "@/components/phone/ServiceWorkerRegister";
import { STRINGS, UI_LANGS } from "@/components/phone/strings";
import type { Strings, UiLang } from "@/components/phone/strings";

export const metadata: Metadata = {
  title: "Sakia · Hors connexion",
  robots: { index: false },
};

// Un même libellé dans les trois langues, chacune isolée (bdi) : le sens de lecture de l'arabe ne déplace pas les séparateurs.
function Tri({ pick }: { pick: (s: Strings) => string }) {
  return (
    <>
      {UI_LANGS.map((l: UiLang, i) => (
        <span key={l}>
          {i > 0 && " · "}
          <bdi lang={l} dir={l === "ar" ? "rtl" : "ltr"}>
            {pick(STRINGS[l])}
          </bdi>
        </span>
      ))}
    </>
  );
}

// Page montrée quand une page demandée n'est pas gardée sur l'appareil et qu'il n'y a pas d'internet.
// Les trois langues sont écrites en même temps : cette page doit se lire sans aucun réglage.
// Un seul titre de page (h1, lu par les lecteurs d'écran), puis un bloc par langue avec son propre sous-titre.
export default function OfflinePage() {
  const link = "inline-flex min-h-11 items-center rounded-lg px-2 text-base font-semibold text-sakia-water-deep underline";
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12 text-sakia-ink">
      <div className="w-full max-w-xl space-y-8">
        <h1 className="sr-only">
          <Tri pick={(s) => s.offlineTitle} />
        </h1>
        {UI_LANGS.map((l) => (
          <section key={l} lang={l} dir={l === "ar" ? "rtl" : "ltr"} aria-labelledby={`offline-${l}`} className="space-y-2">
            <h2 id={`offline-${l}`} className="text-xl font-bold text-sakia-green">
              {STRINGS[l].offlineTitle}
            </h2>
            <p className="text-base leading-7">{STRINGS[l].offlineBody}</p>
            <p className="text-base font-semibold text-sakia-green-deep">{STRINGS[l].truth}</p>
          </section>
        ))}
        <div className="flex flex-wrap items-center gap-3">
          <RetryButton label="Réessayer · إعادة المحاولة · Try again" />
          <Link href="/" className={link}>
            <span>
              <Tri pick={(s) => s.home} />
            </span>
          </Link>
          <Link href="/phone" className={link}>
            <span>
              <Tri pick={(s) => s.openPhone} />
            </span>
          </Link>
        </div>
      </div>
      <ServiceWorkerRegister />
    </main>
  );
}
