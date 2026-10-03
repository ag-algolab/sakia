// Comptage SMS : un SMS tient 160 caractères en alphabet GSM, 70 dès qu'un caractère en sort (arabe, ê, î, ô, ³...).
// Plusieurs SMS collés : 153 (GSM) ou 67 (Unicode) par morceau. Utilisé par le serveur et par le faux téléphone.

const GSM_BASIC = new Set(
  "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà",
);
const GSM_EXTENDED = new Set("^{}\\[~]|€\f"); // chacun compte pour 2

export type SmsInfo = {
  encoding: "gsm7" | "ucs2";
  units: number; // septets (GSM) ou unités UTF-16 (Unicode)
  segments: number; // nombre de SMS facturés
  perSms: number; // taille d'un SMS seul : 160 ou 70
};

// Longueur en septets, ou null si le texte sort de l'alphabet GSM.
export function gsmLength(text: string): number | null {
  let n = 0;
  for (const ch of text) {
    if (GSM_BASIC.has(ch)) n += 1;
    else if (GSM_EXTENDED.has(ch)) n += 2;
    else return null;
  }
  return n;
}

export function smsInfo(text: string): SmsInfo {
  const gsm = gsmLength(text);
  if (gsm != null) return { encoding: "gsm7", units: gsm, segments: gsm === 0 ? 0 : gsm <= 160 ? 1 : Math.ceil(gsm / 153), perSms: 160 };
  const units = text.length;
  return { encoding: "ucs2", units, segments: units <= 70 ? 1 : Math.ceil(units / 67), perSms: 70 };
}

const REPLACEMENTS: Record<string, string> = {
  "³": "3",
  "²": "2",
  "’": "'",
  "‘": "'",
  "“": '"',
  "”": '"',
  "«": '"',
  "»": '"',
  "–": "-",
  "—": "-",
  "…": "...",
  "œ": "oe",
  "Œ": "OE",
  " ": " ",
  " ": " ",
  " ": " ",
  "‏": "",
};

// Ramène un texte français ou anglais à l'alphabet GSM (m³ -> m3, ê -> e...) pour qu'il tienne dans 160 caractères.
export function toGsm(text: string): string {
  let out = "";
  for (const raw of text) {
    const ch = REPLACEMENTS[raw] ?? raw;
    for (const c of ch) {
      if (GSM_BASIC.has(c) || GSM_EXTENDED.has(c)) {
        out += c;
        continue;
      }
      const base = c.normalize("NFD").replace(/[̀-ͯ]/g, "");
      out += [...base].every((b) => GSM_BASIC.has(b)) && base ? base : "?";
    }
  }
  return out;
}

// Ramène à `max` septets en gardant la première phrase (qui dit de quoi on parle) et la dernière (qui porte l'avertissement
// « pas sûr : demandez au technicien » quand il y en a un) : on retire d'abord les phrases du milieu, puis on raccourcit la première.
export function fitGsm(text: string, max = 160): string {
  const t = toGsm(text);
  const fits = (s: string) => (gsmLength(s) ?? Infinity) <= max;
  if (fits(t)) return t;
  const parts = t.split(/(?<=\.)\s+/);
  while (parts.length > 2 && !fits(parts.join(" "))) parts.splice(parts.length - 2, 1);
  if (fits(parts.join(" "))) return parts.join(" ");
  if (parts.length === 2) {
    let first = parts[0];
    while (first.length > 4 && !fits(`${first}.. ${parts[1]}`)) first = first.slice(0, -1);
    const joined = `${first.trimEnd()}.. ${parts[1]}`;
    if (fits(joined)) return joined;
  }
  let cut = t;
  while (!fits(`${cut}..`)) cut = cut.slice(0, -1);
  return `${cut.trimEnd()}..`;
}
