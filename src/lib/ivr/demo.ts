// Formes partagées par les scripts d'enregistrement, la page /call et la route de pas à pas :
// manifeste des phrases fixes (public/audio/ivr/manifest.json) et index des lectures de démonstration (public/audio/ivr/demo/index.json).
// Pur : aucun accès fichier ici.

import type { IvrLang } from "./menu";

export type ManifestItem = {
  id: string;
  lang: IvrLang;
  file: string;
  text: string;
  en: string;
  hash: string; // empreinte du texte enregistré (textHash)
  chars: number;
  bytes: number;
  durationMs: number;
  recordedAt: string;
};
export type Manifest = { voiceId: string; voiceName: string; modelId: string; format: string; items: ManifestItem[] };

// Lecture de plan enregistrée à l'avance : c'est un REJEU (météo observée à `asOf`), pas la météo du jour.
export type DemoItem = {
  id: string;
  region: string;
  crop: string;
  lang: IvrLang;
  ago: number | null; // réponse à « quand avez-vous arrosé ? » pour laquelle la lecture a été faite
  detail: boolean; // true = le détail de la semaine (touche 3)
  asOf: string;
  file: string;
  json: string;
  bytes: number;
  durationMs: number;
  level: "ok" | "low" | "none";
  askAPerson: boolean;
  reasons: string[];
  status: "ok" | "hors_vegetation";
  voiceId: string;
  modelId: string;
  recordedAt: string;
};

export function findDemo(demos: DemoItem[], regionId: string, cropId: string, lang: IvrLang, ago: number | null, detail = false): DemoItem | undefined {
  return demos.find((d) => d.region === regionId && d.crop === cropId && d.lang === lang && d.ago === ago && !!d.detail === detail);
}

// Contenu du fichier .json d'une lecture enregistrée.
export type DemoClipFile = {
  lines: { id: string; text: string; en: string; startMs: number; endMs: number }[];
  subtitles: { id: string; text: string; en: string }[];
  durationMs: number;
};
