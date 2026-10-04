"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { predict } from "@/lib/ml/catboost";
import type { CompactModel } from "@/lib/ml/catboost";

type Meta = { climatologyMmPerDay: Record<string, number>; model: { trees: number; kb: number; kbGzip: number } };
type Api = { region: string; start: string; end: string; month: number; features: Record<string, number> };
type Region = { id: string; name: string };
type Result = { regionId: string; start: string; end: string; modelMmPerDay: number; usualMmPerDay: number };

// La prédiction est calculée ICI, dans le navigateur, avec un modèle de quelques dizaines de Ko : le serveur ne fournit que la météo.
// Le modèle a appris sur des pixels de cultures de Kairouan (2019-2023) : il a été essayé en Tunisie centrale et au Maroc, et il ÉCHOUE au Sahel.
export default function LabLive({ regions }: { regions: Region[] }) {
  const [regionId, setRegionId] = useState("kairouan");
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");
  const [result, setResult] = useState<Result | null>(null);
  const [meta, setMeta] = useState<Meta | null>(null);
  const modelRef = useRef<CompactModel | null>(null);
  const runRef = useRef(0);

  const run = useCallback(async (id: string) => {
    const my = ++runRef.current;
    setState("loading");
    try {
      const [model, m, api] = await Promise.all([
        modelRef.current ? Promise.resolve(modelRef.current) : fetch("/ml/m1.json").then((r) => r.json() as Promise<CompactModel>),
        fetch("/ml/meta.json").then((r) => r.json() as Promise<Meta>),
        fetch(`/api/lab/m1?region=${encodeURIComponent(id)}`).then(async (r) => {
          if (!r.ok) throw new Error(String(r.status));
          return (await r.json()) as Api;
        }),
      ]);
      if (my !== runRef.current) return;
      modelRef.current = model;
      setMeta(m);
      setResult({
        regionId: id,
        start: api.start,
        end: api.end,
        modelMmPerDay: predict(model, api.features),
        usualMmPerDay: m.climatologyMmPerDay[String(api.month)],
      });
      setState("ok");
    } catch {
      if (my === runRef.current) setState("error");
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- première requête au chargement de la page (démo sur Kairouan), volontaire
    void run("kairouan");
  }, [run]);

  const diff = result ? result.modelMmPerDay - result.usualMmPerDay : 0;
  return (
    <div className="space-y-4 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/5">
      <div className="flex flex-wrap items-end gap-3">
        <label className="grow text-sm font-semibold text-sakia-ink">
          Governorate
          <select
            value={regionId}
            onChange={(e) => {
              setRegionId(e.target.value);
              void run(e.target.value);
            }}
            className="mt-1 block min-h-11 w-full rounded-xl border border-sakia-sand-dark bg-white px-3 text-base"
          >
            {regions.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </label>
        {meta && (
          <p className="text-sm text-sakia-brown">
            Model: {meta.model.trees} trees, {meta.model.kb} KB ({meta.model.kbGzip} KB compressed), run in your browser.
          </p>
        )}
      </div>

      {state === "loading" && <p className="text-sakia-brown">Loading the weather and running the model…</p>}
      {state === "error" && (
        <p role="alert" className="rounded-xl bg-sakia-alert-light p-3 font-semibold text-sakia-alert">
          The weather could not be loaded just now. Nothing is guessed: try again in a moment.
        </p>
      )}
      {state === "ok" && result && (
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl bg-sakia-green-light p-4">
            <p className="text-sm font-semibold text-sakia-green-deep">Model, {result.start} to {result.end}</p>
            <p className="font-display text-3xl font-extrabold text-sakia-green-deep">{result.modelMmPerDay.toFixed(2)} <span className="text-base font-semibold">mm/day</span></p>
          </div>
          <div className="rounded-2xl bg-sakia-sand p-4">
            <p className="text-sm font-semibold text-sakia-brown">Usual for this month (Kairouan, 2019–2023)</p>
            <p className="font-display text-3xl font-extrabold text-sakia-ink">{result.usualMmPerDay.toFixed(2)} <span className="text-base font-semibold">mm/day</span></p>
          </div>
          <div className="rounded-2xl bg-sakia-water-light p-4">
            <p className="text-sm font-semibold text-sakia-water-deep">This week against usual</p>
            <p className="font-display text-3xl font-extrabold text-sakia-water-deep">
              {diff >= 0 ? "+" : "−"}
              {Math.abs(diff).toFixed(2)} <span className="text-base font-semibold">mm/day</span>
            </p>
          </div>
        </div>
      )}
      <p className="text-sm text-sakia-brown">
        What the model estimates is the <strong>average evapotranspiration of cropland</strong> around this place as a satellite would see it, from the weather alone. It is not your crop, not
        your field, and it <strong>does not change any irrigation advice</strong>.
      </p>
    </div>
  );
}
