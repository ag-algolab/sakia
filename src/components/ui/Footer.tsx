"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLang } from "./LangProvider";
import SakiaLogo from "./SakiaLogo";

// Pied de page de toutes les pages : les liens que le jury cherche (bot Telegram, code, fiche des données, preuve), la phrase
// d'honnêteté sur ce qui est simulé et ce qui est réel, et les limites du conseil.

const TELEGRAM_URL = "https://t.me/sakia_tn_bot";
const GITHUB_URL = "https://github.com/ag-algolab/sakia";

export default function Footer() {
  const { t } = useLang();
  const path = usePathname();
  if (path.startsWith("/story")) return null; // le film est une page à part
  const link = "inline-flex min-h-11 items-center text-base font-semibold text-white/90 underline-offset-2 hover:underline";
  return (
    <footer className="sk-type mt-10 bg-[#0d2e22] px-4 py-10 text-white">
      <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <p className="font-display flex items-center gap-2.5 text-2xl font-bold">
            <SakiaLogo size={34} className="text-white" />
            Sakia
          </p>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-white/80">{t("footerAbout")}</p>
          <p className="mt-3 max-w-md text-sm font-semibold leading-relaxed text-sakia-sun">{t("footerHonest")}</p>
        </div>
        <div className="grid grid-cols-2 gap-4 md:contents">
          <nav aria-label={t("footerNavProject")} className="flex flex-col">
            <a href={TELEGRAM_URL} target="_blank" rel="noopener noreferrer" className={link}>
              {t("footerBot")}
            </a>
            <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className={link}>
              {t("footerCode")}
            </a>
            <Link href="/about#data" className={link}>
              {t("dataCard")}
            </Link>
            <Link href="/backtest" className={link}>
              {t("navProof")}
            </Link>
            <Link href="/lab" className={link} hrefLang="en">
              Lab (research, English)
            </Link>
            <Link href="/speed" className={link} hrefLang="en">
              Speed, measured (English)
            </Link>
          </nav>
          <nav aria-label={t("footerNavChannels")} className="flex flex-col">
            <Link href="/bulletin" className={link}>
              {t("navBulletin")}
            </Link>
            <Link href="/call" className={link}>
              {t("door_call")}
            </Link>
            <Link href="/phone" className={link}>
              {t("door_sms")}
            </Link>
            <Link href="/about" className={link}>
              {t("navAbout")}
            </Link>
          </nav>
        </div>
      </div>
      <p className="mx-auto mt-8 max-w-5xl border-t border-white/15 pt-4 text-xs leading-relaxed text-white/65">{t("footerBuilt")}</p>
    </footer>
  );
}
