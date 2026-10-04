// GET /api/advice?region=kairouan&crop=olivier[&lang=aeb][&ago=0..30][&soil=][&system=][&planting=][&asOf=AAAA-MM-JJ][&subs=en][&prefetch=1]
// Le conseil du jour dit à voix haute, version COURTE, renvoyé directement en mp3 (pas de JSON, pas de base64) :
// un seul aller-retour, un fichier de 50 à 100 Ko, lisible dès l'arrivée.
// Le fichier est celui qui a été préparé à l'avance (voir pregen/route.ts) ; à défaut il est fabriqué maintenant, dans la limite
// du plafond quotidien (503 « budget » au-delà : l'appli rejoue alors le dernier message gardé sur l'appareil).
// `prefetch=1` : chargement d'avance par le navigateur, NE FABRIQUE JAMAIS (204 si le message n'est pas encore prêt).
// `subs=en|fr|ar|aeb` : langue des sous-titres ; ils reviennent dans l'en-tête `x-advice-subs` (JSON en UTF-8, encodé en base64), phrase par
// phrase, construits à partir du MÊME plan que la voix (clipSubtitles). Jamais bloquant : si on ne peut pas les construire, le son part seul.
// Les paramètres sont validés comme dans /api/voice/bulletin et /api/plan : la voix vient du même plan que l'écran.
// Protection des crédits : `asOf` n'accepte que la date du rejeu de l'accueil ; avec une date de semis (rare) rien n'est fabriqué à
// la demande, seul un message déjà préparé est servi ; toute fabrication passe par un plafond par adresse (compteur « tts_ip »,
// adresse salée et hachée, jamais stockée) PUIS par le plafond commun du jour (usage.ts, atomique).

import { createHash } from "node:crypto";
import { ClipError, REPLAY_DATE, clipFor, clipSubtitles, planForQuery } from "@/lib/advice/clip";
import { getCrop } from "@/lib/crops";
import { getRegion } from "@/lib/regions";
import type { Plan } from "@/lib/plan";
import { chargeUsage, LIMITS } from "@/lib/usage";
import type { IrrigationSystem, SoilName } from "@/lib/waterBalance";
import { isVoiceLang } from "@/lib/voice/langs";
import type { VoiceLang } from "@/lib/voice/langs";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const SOILS = ["sableux", "limoneux", "argileux"];
const SYSTEMS = ["goutte", "aspersion", "gravitaire"];
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const NO_STORE = { "cache-control": "no-store" };

// Adresse du visiteur, hachée avec un sel : sert seulement de clé de compteur journalier.
function visitorKey(request: Request): string {
  const ip = request.headers.get("x-real-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "inconnue";
  return createHash("sha256").update(`${process.env.CRON_SECRET ?? "sakia"}|${ip}`).digest("hex").slice(0, 16);
}

const validDate = (s: string | null): string | undefined => {
  if (!s || !DATE.test(s)) return undefined;
  const d = new Date(`${s}T00:00:00Z`);
  return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== s ? undefined : s;
};

// En-tête des sous-titres (voir plus haut) : vide si non demandés ou si leur construction échoue (le son prime toujours).
function subtitleHeader(plan: Plan, spoken: VoiceLang, shown: VoiceLang | undefined, choice: { soil?: SoilName; system?: IrrigationSystem }): Record<string, string> {
  if (!shown) return {};
  try {
    return { "x-advice-subs": Buffer.from(JSON.stringify(clipSubtitles(plan, spoken, shown, choice)), "utf8").toString("base64") };
  } catch (e) {
    console.error("[advice] sous-titres non construits :", (e as Error).message);
    return {};
  }
}

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams;
  const region = q.get("region") ?? "kairouan";
  const crop = q.get("crop") ?? "olivier";
  const lang = q.get("lang") ?? "aeb";
  if (!getRegion(region)) return Response.json({ error: `région inconnue : ${region}` }, { status: 400, headers: NO_STORE });
  if (!getCrop(crop)) return Response.json({ error: `culture inconnue : ${crop}` }, { status: 400, headers: NO_STORE });
  if (!isVoiceLang(lang)) return Response.json({ error: "lang : fr, ar, aeb, en ou ko" }, { status: 400, headers: NO_STORE });

  const soilRaw = q.get("soil");
  const systemRaw = q.get("system");
  const soil = soilRaw && SOILS.includes(soilRaw) ? (soilRaw as SoilName) : undefined;
  const system = systemRaw && SYSTEMS.includes(systemRaw) ? (systemRaw as IrrigationSystem) : undefined;
  const agoRaw = q.get("ago");
  const ago = agoRaw != null && /^\d{1,2}$/.test(agoRaw) ? Number(agoRaw) : undefined; // le moteur borne la valeur
  const planting = validDate(q.get("planting"));
  const asOfRaw = q.get("asOf");
  if (asOfRaw && asOfRaw !== REPLAY_DATE) return Response.json({ error: "asOf : seule la date du rejeu est acceptée" }, { status: 400, headers: NO_STORE });
  const asOf = asOfRaw ? REPLAY_DATE : undefined;
  const prefetch = q.get("prefetch") === "1";
  const subsRaw = q.get("subs");
  const subsLang: VoiceLang | undefined = subsRaw && subsRaw !== "ko" && isVoiceLang(subsRaw) ? subsRaw : undefined;

  let plan;
  try {
    plan = await planForQuery({ region, crop, lang, ago, soil, system, planting, asOf });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 502, headers: NO_STORE });
  }

  try {
    const r = await clipFor(plan, lang, { soil, system }, {
      allowLive: !prefetch && !planting,
      beforeLive: (chars) => chargeUsage(`tts_ip:${visitorKey(request)}`, chars, LIMITS.ttsCharsPerIp),
    });
    return new Response(new Uint8Array(r.bytes), {
      headers: {
        "content-type": "audio/mpeg",
        "content-length": String(r.bytes.length),
        // pas de cache partagé : le texte suit la météo et le plan affiché (la copie gardée par l'appli est contrôlée par ces deux en-têtes)
        "cache-control": "private, no-cache",
        "x-advice-source": r.source,
        "x-advice-level": plan.confidence.level, // niveau de fiabilité et jour du plan qui a produit ce texte : l'appli ne rejoue
        "x-advice-today": plan.today, // une copie que si l'écran affiche le même niveau et le même jour
        ...subtitleHeader(plan, lang, subsLang, { soil, system }),
      },
    });
  } catch (e) {
    if (e instanceof ClipError && e.reason === "miss") {
      // chargement d'avance : 204 sans bruit ; appui réel avec date de semis : rien de prêt et rien fabriqué
      return prefetch ? new Response(null, { status: 204, headers: NO_STORE }) : Response.json({ error: "pas encore préparé" }, { status: 503, headers: NO_STORE });
    }
    if (e instanceof ClipError && e.reason === "budget") return Response.json({ error: "budget" }, { status: 503, headers: NO_STORE });
    console.error("[advice]", (e as Error).message);
    return Response.json({ error: "voix indisponible" }, { status: 502, headers: NO_STORE });
  }
}
