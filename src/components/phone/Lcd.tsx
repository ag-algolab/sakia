// Écran LCD du téléphone à touches : une vue par état (accueil, nouveau message, message, menus, envoi, appel).
// Purement visuel : la logique (touches, minuteries, envoi au serveur) est dans FeaturePhone.tsx.

import { smsInfo } from "@/lib/sms/encoding";
import s from "./phone.module.css";
import type { SmsLang } from "./smsKeys";
import type { Strings } from "./strings";

export type Msg = { id: string; kind: "daily" | "reply"; text: string; lang: SmsLang; time: string };

export type Screen =
  | { id: "idle" }
  | { id: "wait" } // le SMS attend la météo
  | { id: "notice"; text: string } // aucun SMS possible (pas de météo, météo trop ancienne, calcul impossible)
  | { id: "alert"; msgId: string } // « 1 nouveau message »
  | { id: "msg"; msgId: string }
  | { id: "lang" }
  | { id: "stop" }
  | { id: "sending"; text: string }
  | { id: "error"; text: string }
  | { id: "ring"; phase: "ringing" | "connecting" };

export type KeyDef = { key: string; label: string };

export type LcdProps = {
  t: Strings;
  ready: boolean;
  stopped: boolean;
  screen: Screen;
  msg: Msg | null;
  clock: string;
  dateLabel: string;
  cropName: string;
  regionName: string;
  keys: KeyDef[]; // touches utiles sur cet écran
  soft: { left: string; right: string };
};

export function Envelope({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 44" width="56" height="39" aria-hidden="true" className={className} fill="none" stroke="currentColor" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round">
      <rect x="4" y="4" width="56" height="36" rx="3" />
      <path d="M5 8l27 20L59 8" />
    </svg>
  );
}

export function Handset({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width="48" height="48" aria-hidden="true" className={className} fill="currentColor">
      <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
    </svg>
  );
}

function StatusBar() {
  return (
    <div className={`${s.rule} flex items-center justify-between border-b px-2 py-1 text-[0.6875rem] font-bold leading-none`} aria-hidden="true">
      <span className="flex items-end gap-[2px]">
        {[4, 7, 10, 13].map((h) => (
          <span key={h} style={{ height: h }} className={`${s.inv} w-[3px]`} />
        ))}
      </span>
      <span className="tracking-[0.25em]">SAKIA</span>
      <span className="flex items-center">
        <span className={`${s.inv} h-[9px] w-[18px]`} />
        <span className={`${s.inv} h-[4px] w-[2px]`} />
      </span>
    </div>
  );
}

function KeyChip({ k }: { k: string }) {
  return <b className={`${s.inv} inline-flex h-[1.1rem] min-w-[1.1rem] items-center justify-center px-[0.2rem] text-[0.7rem] leading-none`}>{k}</b>;
}

function Legend({ keys }: { keys: KeyDef[] }) {
  return (
    <ul className={`${s.rule} grid grid-cols-2 gap-x-2 gap-y-[0.2rem] border-t pb-0.5 pt-1 text-[0.72rem] font-bold leading-none`}>
      {keys.map((k) => (
        <li key={k.key} className="flex items-center gap-1">
          <KeyChip k={k.key} />
          <span className="truncate">{k.label}</span>
        </li>
      ))}
    </ul>
  );
}

function ListView({ title, keys }: { title: string; keys: KeyDef[] }) {
  return (
    <div className="flex h-full flex-col">
      <p className={`${s.rule} border-b pb-1 text-[0.8rem] font-bold leading-tight`}>{title}</p>
      <ul className="mt-1.5 space-y-1.5 text-[0.875rem] leading-tight">
        {keys.map((k) => (
          <li key={k.key} className="flex items-center gap-2">
            <KeyChip k={k.key} />
            <span className="min-w-0 break-words" dir="auto">
              {k.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Dots() {
  return (
    <span aria-hidden="true" className="inline-flex gap-[0.15rem]">
      <span className={`${s.dot} h-1.5 w-1.5 ${s.inv}`} />
      <span className={`${s.dot} ${s.dot2} h-1.5 w-1.5 ${s.inv}`} />
      <span className={`${s.dot} ${s.dot3} h-1.5 w-1.5 ${s.inv}`} />
    </span>
  );
}

function View({ p }: { p: LcdProps }) {
  const { t, screen, msg } = p;

  if (!p.ready && screen.id !== "ring") {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
        <div className="text-[2.25rem] font-bold leading-none tabular-nums">{p.clock}</div>
        <p className="max-w-[14rem] text-[0.8125rem] leading-snug">{t.lcdPickChoice}</p>
      </div>
    );
  }

  switch (screen.id) {
    case "idle":
      return (
        <div className="flex h-full flex-col items-center justify-center text-center">
          <div className="text-[2.25rem] font-bold leading-none tabular-nums" dir="ltr">
            {p.clock}
          </div>
          <div className="mt-1 text-[0.8125rem] leading-tight first-letter:uppercase" dir="auto">
            {p.dateLabel}
          </div>
          {p.stopped ? (
            <div className={`${s.inv} mt-3 px-2 py-0.5 text-[0.8125rem] font-bold`}>{t.lcdStopped}</div>
          ) : (
            <div className="mt-3 flex items-center gap-1.5 text-[0.8125rem] leading-tight">
              <Envelope className="h-4 w-auto" />
              <span>{t.lcdNextSms}</span>
            </div>
          )}
          <div className={`${s.dim} mt-1.5 text-[0.75rem] leading-tight`} dir="auto">
            {p.cropName} · {p.regionName}
          </div>
        </div>
      );

    case "wait":
      return (
        <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
          <Envelope className="h-8 w-auto" />
          <p className="flex items-center gap-2 text-[0.875rem] font-bold">
            {t.lcdWaitingPlan} <Dots />
          </p>
        </div>
      );

    case "notice":
      return (
        <div className="flex h-full items-center justify-center text-center">
          <p className="text-[0.8125rem] leading-snug" dir="auto">
            {screen.text}
          </p>
        </div>
      );

    case "alert":
      return (
        <div className="flex h-full flex-col items-center justify-center text-center">
          <span className={s.bob}>
            <Envelope />
          </span>
          <p className="mt-3 text-[1rem] font-bold leading-tight">{t.lcdNewMsg}</p>
          <p className="mt-0.5 text-[0.8125rem]" dir="auto">
            Sakia · {msg?.time}
          </p>
        </div>
      );

    case "msg": {
      const info = msg ? smsInfo(msg.text) : null;
      return (
        <div className="flex h-full flex-col">
          <div className={`${s.rule} flex items-center justify-between border-b pb-0.5 text-[0.72rem] font-bold leading-none`}>
            <span className="flex items-center gap-1">
              <Envelope className="h-3 w-auto" />
              Sakia
            </span>
            <span className="tabular-nums" dir="ltr">
              {msg?.time}
            </span>
          </div>
          {/* le texte du SMS, tel que reçu ; défilable au doigt, à la molette et au clavier si le message est long */}
          <div
            tabIndex={0}
            role="region"
            aria-label={t.screenLabel}
            lang={msg?.lang}
            dir="auto"
            className="min-h-0 flex-1 overflow-y-auto whitespace-pre-line break-words py-1 text-start text-[0.8125rem] leading-[1.3]"
          >
            {msg?.text}
          </div>
          {info && (
            <div className={`${s.dim} flex justify-between pb-0.5 text-[0.68rem] leading-none`} dir="ltr">
              <span>
                {info.units}/{info.perSms} · {t.smsCount(info.segments)}
              </span>
              <span>{info.encoding === "ucs2" ? "Unicode" : "GSM"}</span>
            </div>
          )}
          <Legend keys={p.keys} />
        </div>
      );
    }

    case "lang":
      return <ListView title={t.lcdLangTitle} keys={p.keys} />;
    case "stop":
      return <ListView title={t.lcdStopQ} keys={p.keys} />;

    case "sending":
      return (
        <div className="flex h-full flex-col justify-center">
          <p className="flex items-center gap-2 text-[0.9rem] font-bold">
            {t.lcdSending} <Dots />
          </p>
          <p className="mt-3 text-[0.72rem]">{t.lcdSentText}</p>
          <p className="mt-0.5 break-words border-2 border-[#1a2410] px-1.5 py-1 text-[0.8125rem] font-bold leading-snug" dir="auto">
            {screen.text}
          </p>
        </div>
      );

    case "error":
      return (
        <div className="flex h-full flex-col justify-center">
          <p className="text-[0.9rem] font-bold leading-tight">⚠ {t.lcdFailed}</p>
          <p className="mt-1.5 text-[0.8125rem] leading-snug">{t.lcdFailedWhy}</p>
          <p className="mt-2 break-words border border-[#1a2410] px-1.5 py-1 text-[0.75rem] leading-snug" dir="auto">
            {screen.text}
          </p>
        </div>
      );

    case "ring":
      return (
        <div className="flex h-full flex-col items-center justify-center text-center">
          <div className="relative flex h-24 w-24 items-center justify-center">
            {screen.phase === "ringing" && (
              <>
                <span aria-hidden="true" className={`${s.wave} absolute inset-0 rounded-full border-2 border-[#1a2410]`} />
                <span aria-hidden="true" className={`${s.wave} ${s.wave2} absolute inset-0 rounded-full border-2 border-[#1a2410]`} />
                <span aria-hidden="true" className={`${s.wave} ${s.wave3} absolute inset-0 rounded-full border-2 border-[#1a2410]`} />
              </>
            )}
            <span className={screen.phase === "ringing" ? s.wiggle : ""}>
              <Handset />
            </span>
          </div>
          <p className="mt-2 text-[1.0625rem] font-bold leading-tight">Sakia</p>
          <p className="mt-0.5 flex items-center gap-2 text-[0.8125rem]">
            {screen.phase === "ringing" ? t.lcdRinging : t.lcdConnecting}
          </p>
        </div>
      );
  }
}

export default function Lcd(p: LcdProps) {
  return (
    <div className={`${s.lcd} flex h-[15rem] flex-col overflow-hidden rounded-md border-[3px] border-[#0d110e]`}>
      <StatusBar />
      {/* la clé fait rejouer l'apparition à chaque changement d'écran */}
      <div key={p.screen.id + ("msgId" in p.screen ? p.screen.msgId : "")} className={`${s.screenIn} min-h-0 flex-1 px-2 py-1.5`}>
        <View p={p} />
      </div>
      <div className={`${s.rule} flex min-h-[1.5rem] items-center justify-between border-t px-2 text-[0.75rem] font-bold leading-none`} aria-hidden="true">
        <span dir="auto">{p.soft.left}</span>
        <span dir="auto">{p.soft.right}</span>
      </div>
    </div>
  );
}
