"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { useLang } from "./LangProvider";
import { LANGS } from "./i18n";
import SakiaLogo from "./SakiaLogo";

const LINKS = [
  { href: "/", key: "navAdvice" },
  { href: "/backtest", key: "navProof" },
  { href: "/bulletin", key: "navBulletin" },
  { href: "/phone", key: "navPhone" },
  { href: "/telegram", key: "navTelegram" },
  { href: "/about", key: "navAbout" },
];

export default function Header() {
  const { lang, setLang, t } = useLang();
  const path = usePathname();
  const navRef = useRef<HTMLElement>(null);
  // Sur un téléphone, le menu est une bande qui défile au doigt : la page en cours est amenée dans la bande (sinon « À propos »,
  // tout au bout, resterait caché).
  useEffect(() => {
    navRef.current?.querySelector('[aria-current="page"]')?.scrollIntoView({ inline: "nearest", block: "nearest" });
  }, [path, lang]);
  if (path.startsWith("/story")) return null; // le film est une page à part
  return (
    <header className="bg-[#0d2e22] text-white">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 pt-3">
        <Link href="/" className="flex min-h-11 items-center gap-2.5 font-display text-2xl font-bold tracking-tight">
          <SakiaLogo size={38} className="text-white" />
          Sakia
        </Link>
        <div role="group" aria-label={t("language")} className="flex overflow-hidden rounded-lg border border-white/40">
          {LANGS.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => setLang(l.id)}
              aria-pressed={lang === l.id}
              aria-label={l.name}
              title={l.name}
              className={`min-h-11 min-w-12 px-3 text-base font-semibold ${
                lang === l.id ? "bg-white text-sakia-green" : "text-white hover:bg-white/15"
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>
      <nav ref={navRef} aria-label="Sakia" className="sk-noscrollbar mx-auto flex max-w-5xl gap-1 overflow-x-auto px-2 pb-2 pt-2">
        {LINKS.map((l) => {
          const active = l.href === "/" ? path === "/" : path.startsWith(l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-11 items-center whitespace-nowrap rounded-lg px-3 text-base font-medium ${
                active ? "bg-white text-sakia-green-deep" : "text-white/90 hover:bg-white/15"
              }`}
            >
              {t(l.key)}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
