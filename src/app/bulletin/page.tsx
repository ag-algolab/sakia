import type { Metadata } from "next";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import BulletinPlayer from "@/components/bulletin/BulletinPlayer";
import type { DemoMeta } from "@/components/bulletin/BulletinPlayer";
import { CROPS } from "@/lib/crops";
import { REGIONS } from "@/lib/regions";
import { CROP_KO, REGION_KO } from "@/lib/voice/ko";

export const metadata: Metadata = {
  title: "Sakia · Bulletin",
  description: "Today's irrigation bulletin, read aloud in French, Arabic, English or Korean by a drawn presenter, with subtitles. Works offline with recorded bulletins.",
};

async function loadDemos(): Promise<DemoMeta[]> {
  try {
    return JSON.parse(await readFile(join(process.cwd(), "public", "audio", "demo-index.json"), "utf8")) as DemoMeta[];
  } catch {
    return [];
  }
}

export default async function BulletinPage() {
  const demos = await loadDemos();
  return (
    <BulletinPlayer
      regions={REGIONS.map((r) => ({ id: r.id, fr: r.nameFr, ar: r.nameAr, ko: REGION_KO[r.id] }))}
      crops={CROPS.map((c) => ({ id: c.id, fr: c.nameFr, ar: c.nameAr, en: c.nameEn, ko: CROP_KO[c.id] }))}
      demos={demos}
    />
  );
}
