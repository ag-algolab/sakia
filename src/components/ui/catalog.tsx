"use client";

import { CROPS } from "@/lib/crops";
import { REGIONS } from "@/lib/regions";
import { CROP_AEB } from "@/lib/voice/aeb";
import { isArabic } from "./i18n";
import type { Lang } from "./i18n";
import { useLang } from "./LangProvider";

export type CatalogRegion = { id: string; nameFr: string; nameAr: string };
export type CatalogCrop = {
  id: string;
  nameFr: string;
  nameAr: string;
  nameEn: string;
  kind: "annual" | "perennial";
  status: string;
};
export type Catalog = { regions: CatalogRegion[]; crops: CatalogCrop[] };

// Le catalogue vient du code (src/lib/crops.ts et regions.ts, déjà embarqués pour le calcul hors connexion) : aucune
// requête réseau, donc la liste est là instantanément et même sans internet.
const STATIC_CATALOG: Catalog = {
  regions: REGIONS.map(({ id, nameFr, nameAr }) => ({ id, nameFr, nameAr })),
  crops: CROPS.map(({ id, nameFr, nameAr, nameEn, kind, status }) => ({ id, nameFr, nameAr, nameEn, kind, status })),
};

export function useCatalog(): Catalog | null {
  return STATIC_CATALOG;
}

export const selectClass =
  "min-h-12 w-full rounded-lg border border-sakia-sand-dark bg-white px-3 text-base text-sakia-ink";

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm font-semibold text-sakia-brown">{label}</span>
      {children}
      {hint && <span className="text-xs text-sakia-brown/80">{hint}</span>}
    </label>
  );
}

// Darija : les noms de cultures comme les agriculteurs les disent (src/lib/voice/aeb.ts, source unique).
export function cropName(c: CatalogCrop, lang: Lang): string {
  if (lang === "aeb") return CROP_AEB[c.id] ?? c.nameAr;
  return lang === "ar" ? c.nameAr : lang === "en" ? c.nameEn : c.nameFr;
}

export const regionName = (r: CatalogRegion, lang: Lang): string => (isArabic(lang) ? r.nameAr : r.nameFr);

export function CropSelect({
  catalog,
  value,
  onChange,
}: {
  catalog: Catalog | null;
  value: string;
  onChange: (id: string) => void;
}) {
  const { lang, t } = useLang();
  const crops = catalog?.crops ?? [];
  const group = (kind: "annual" | "perennial", label: string) => (
    <optgroup label={label}>
      {crops
        .filter((c) => c.kind === kind)
        .map((c) => (
          <option key={c.id} value={c.id}>
            {cropName(c, lang)}
          </option>
        ))}
    </optgroup>
  );
  return (
    <Field label={t("crop")}>
      <select className={selectClass} value={value} onChange={(e) => onChange(e.target.value)}>
        {!catalog && <option value={value}>{value}</option>}
        {catalog && group("annual", t("annuals"))}
        {catalog && group("perennial", t("perennials"))}
      </select>
    </Field>
  );
}
