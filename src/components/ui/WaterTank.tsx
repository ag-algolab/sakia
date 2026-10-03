"use client";

import { useLang } from "./LangProvider";
import type { PlanDay } from "@/lib/plan";

// « Réserve d'eau du sol » sur 7 jours : 100 % = plein, 0 % = le seuil où il faut arroser. Elle descend chaque jour avec
// la chaleur et remonte quand Sakia conseille d'arroser. C'est ce qui explique POURQUOI tel jour : on le voit venir.
// Valeur = 1 - épuisement / seuil (dr et raw du plan, rien d'inventé). Sous la ligne = stress possible.

const W = 360;
const H = 176;
const PAD_X = 22;
const TOP = 26;
const BOTTOM = 128; // niveau 0 % (ligne « arroser »)
const FLOOR = 142; // plancher du dessin (en dessous de 0 % : zone de stress)

export default function WaterTank({ days }: { days: PlanDay[] }) {
  const { t, fmtDate, fmtNum } = useLang();
  const n = days.length;
  if (n < 2) return null;

  const reserve = days.map((d) => (d.raw > 0 ? Math.max(-0.15, Math.min(1, 1 - d.dr / d.raw)) : 1));
  const x = (i: number) => PAD_X + (i * (W - 2 * PAD_X)) / (n - 1);
  const y = (r: number) => BOTTOM - r * (BOTTOM - TOP);
  const pts = reserve.map((r, i) => [x(i), y(r)] as const);
  const line = pts.map(([px, py], i) => `${i ? "L" : "M"}${px.toFixed(1)} ${py.toFixed(1)}`).join(" ");
  const area = `${line} L${pts[n - 1][0].toFixed(1)} ${FLOOR} L${pts[0][0].toFixed(1)} ${FLOOR}Z`;

  return (
    <figure className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-black/5">
      <figcaption className="mb-1">
        <h3 className="font-display text-xl font-bold text-sakia-green-deep">{t("tankTitle")}</h3>
        <p className="text-sm leading-snug text-sakia-brown">{t("tankHint")}</p>
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 w-full" style={{ direction: "ltr" }} role="img" aria-label={t("tankTitle")}>
        <defs>
          <linearGradient id="sk-tank-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#3f9bd8" stopOpacity=".55" />
            <stop offset="1" stopColor="#1d74b6" stopOpacity=".08" />
          </linearGradient>
        </defs>
        {/* repères */}
        <line x1={PAD_X} x2={W - PAD_X} y1={TOP} y2={TOP} stroke="#d8c7a4" strokeDasharray="2 5" />
        <text x={PAD_X} y={TOP - 8} fontSize="10.5" fontWeight="700" fill="#5a3d22">
          {t("tankFull")}
        </text>
        <rect x={PAD_X} y={BOTTOM} width={W - 2 * PAD_X} height={FLOOR - BOTTOM} fill="#fbe4d2" opacity=".7" rx="4" />
        <line x1={PAD_X} x2={W - PAD_X} y1={BOTTOM} y2={BOTTOM} stroke="#9a3f12" strokeWidth="1.6" strokeDasharray="5 4" />
        <text x={W - PAD_X} y={BOTTOM + 13} textAnchor="end" fontSize="10.5" fontWeight="700" fill="#9a3f12">
          {t("tankLine")}
        </text>

        {/* eau : surface et courbe qui se dessinent */}
        <path d={area} fill="url(#sk-tank-fill)" />
        <path d={line} pathLength={1000} className="sk-draw" style={{ ["--len" as string]: 1000 }} fill="none" stroke="#1d74b6" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />

        {/* jours */}
        {days.map((d, i) => {
          const [px, py] = pts[i];
          const irr = d.action === "irriguer";
          return (
            <g key={d.date}>
              <circle cx={px} cy={py} r={irr ? 5.5 : 4} fill={irr ? "#1d74b6" : "#fff"} stroke="#1d74b6" strokeWidth="2.4" />
              {irr && (
                <g transform={`translate(${px - 10} ${py - 32}) scale(.84)`}>
                  <path
                    d="M12 2.2c-.4 0-.8.2-1 .6C8.6 6.6 5 10.6 5 14.6a7 7 0 0 0 14 0c0-4-3.6-8-6-11.8-.2-.4-.6-.6-1-.6z"
                    fill="#1d74b6"
                    className="sk-sway"
                    style={{ transformBox: "fill-box", transformOrigin: "50% 100%" }}
                  />
                </g>
              )}
              <text x={px} y={H - 4} textAnchor="middle" fontSize="10.5" fontWeight={i === 0 ? 800 : 500} fill={i === 0 ? "#123524" : "#5a3d22"}>
                {fmtDate(d.date, { weekday: "short" })}
              </text>
            </g>
          );
        })}
      </svg>
      <p className="sr-only">
        {days.map((d, i) => `${fmtDate(d.date)} ${fmtNum(Math.max(0, reserve[i]) * 100)} %`).join(", ")}
      </p>
    </figure>
  );
}
