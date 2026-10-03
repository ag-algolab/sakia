// Script du bulletin pour une langue parlée. fr / ar / en : bulletinScript (src/lib/messages.ts) ;
// ko : src/lib/voice/ko.ts ; aeb (darija tunisien) : src/lib/voice/aeb.ts. Toujours les mêmes lignes et les mêmes `id`, pour les sous-titres anglais.
//
// Garde-fou « pas sûr : demandez à une personne » : quand le plan ne donne aucun conseil
// (plan.confidence.level === "none", jours vides), on ne lit QUE la phrase `unsure`. Le script de base
// y ajouterait sinon « pas d'irrigation nécessaire », fausse assurance sur un plan vide.

import { bulletinScript } from "../messages";
import type { BulletinLine } from "../messages";
import type { Plan } from "../plan";
import { bulletinScriptAeb } from "./aeb";
import { bulletinScriptKo } from "./ko";
import type { VoiceLang } from "./langs";
import { withReportsLine } from "./rainreports";
import { withSoilLine } from "./soil";
import type { SoilChoice } from "./soil";

// `choice` : sol et système réellement choisis (validés comme dans /api/plan) ; absent = valeurs par défaut du moteur.
export function bulletinScriptFor(plan: Plan, lang: VoiceLang, choice?: Partial<SoilChoice>): BulletinLine[] {
  const base = lang === "ko" ? bulletinScriptKo(plan) : lang === "aeb" ? bulletinScriptAeb(plan) : bulletinScript(plan, lang);
  // ligne « soil » avant l'avertissement : pour quel sol et quel système le conseil est calculé
  // ligne « reports » après la pluie : jours où la pluie vient de signalements d'agriculteurs et non du modèle
  const lines = withSoilLine(withReportsLine(base, lang, plan), lang, plan.status === "ok", choice);
  if (plan.confidence.level !== "none") return lines;
  const unsure = lines.filter((l) => l.id === "unsure");
  if (unsure.length === 0) throw new Error("plan sans conseil mais sans ligne « pas sûr » : script incohérent");
  return unsure;
}
