import type { Metadata } from "next";
import Link from "next/link";
import perf from "../../../scripts/perf-results-2026-10-04.json";

export const metadata: Metadata = {
  title: "Sakia on a weak connection, measured",
  description: "First visit, second visit and no connection at all: Sakia against five sites that serve a similar need, measured in a real browser on throttled 3G and 2G.",
};

type Visit = { kb: number; loadSeconds: number; loaded: boolean; note?: string };
type Row = { site: string; name: string; profile: "3G" | "2G"; cold: Visit; repeat: Visit; offline: { works: boolean } };
const rows = (perf as unknown as { results: Row[] }).results;
const get = (site: string, profile: "3G" | "2G") => rows.find((r) => r.site === site && r.profile === profile)!;

const ORDER = ["sakia", "yrno", "timeanddate", "wapor", "meteoblue", "meteotn"];
const SHORT: Record<string, string> = {
  sakia: "Sakia",
  yrno: "yr.no (a lean reference)",
  timeanddate: "timeanddate.com",
  wapor: "FAO WaPOR portal",
  meteoblue: "meteoblue",
  meteotn: "meteo.tn (national weather institute)",
};

function Bars({ title, unit, values, flag }: { title: string; unit: string; values: { id: string; v: number; note?: string }[]; flag?: (id: string) => boolean }) {
  const max = Math.max(...values.map((x) => x.v));
  return (
    <div className="space-y-2 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-black/5">
      <h3 className="font-display text-lg font-extrabold text-sakia-ink">{title}</h3>
      <ul className="space-y-2">
        {values.map((x) => (
          <li key={x.id} className="grid grid-cols-[minmax(0,9rem)_1fr] items-center gap-3 text-sm sm:grid-cols-[14rem_1fr]">
            <span className={`font-semibold ${x.id === "sakia" ? "text-sakia-green-deep" : "text-sakia-ink"}`}>{SHORT[x.id]}</span>
            <span className="flex items-center gap-2">
              <span
                className="h-4 min-w-1 rounded-full"
                style={{ width: `${Math.max(1, (x.v / max) * 70)}%`, background: x.id === "sakia" ? "var(--color-sakia-green, #2f7d4a)" : flag?.(x.id) ? "var(--color-sakia-alert, #b3261e)" : "var(--color-sakia-sand-dark, #cdbf9f)" }}
                aria-hidden
              />
              <span className="whitespace-nowrap font-bold text-sakia-ink">
                {x.v.toLocaleString("en-GB")} {unit}
              </span>
              {x.note && <span className="whitespace-nowrap text-xs text-sakia-brown">{x.note}</span>}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function SpeedPage() {
  const kb3 = ORDER.map((id) => ({ id, v: get(id, "3G").cold.kb }));
  const t3 = ORDER.map((id) => ({ id, v: get(id, "3G").cold.loadSeconds }));
  const t2 = ORDER.map((id) => {
    const r = get(id, "2G").cold;
    return { id, v: r.loadSeconds, note: r.loaded ? undefined : "did not finish" };
  });
  const sakia = get("sakia", "3G").cold.kb;
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 space-y-8 px-4 py-8" lang="en" dir="ltr">
      <header className="space-y-3">
        <p className="text-sm font-bold uppercase tracking-wide text-sakia-green">Measured, 4 October 2026</p>
        <h1 className="font-display text-3xl font-extrabold leading-tight text-sakia-ink sm:text-4xl">Sakia on a weak connection</h1>
        <p className="text-lg text-sakia-brown">
          A farmer on a poor mobile network will not wait for a heavy page, and cannot open anything with no network at all. We opened the home page of Sakia and of five sites that serve a similar need, in a real
          browser, on a throttled 3G and 2G network, with a processor slowed four times (an entry-level phone).
        </p>
      </header>

      <section aria-labelledby="first" className="space-y-3">
        <h2 id="first" className="font-display text-2xl font-extrabold text-sakia-ink">First visit</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Bars title="Downloaded, 3G" unit="KB" values={kb3} />
          <Bars title="Loaded after, 3G" unit="s" values={t3} />
        </div>
        <Bars title="Loaded after, 2G" unit="s" values={t2} flag={(id) => !get(id, "2G").cold.loaded} />
        <p className="text-sakia-brown">
          Sakia downloads <strong>{sakia} KB</strong>: about half of what the leanest sites download, 3 times less than meteoblue and 20 times less than the national weather site, which did not finish loading in 150
          seconds on 2G. For reference, the median mobile web page weighs about 2.56 MB (HTTP Archive, Web Almanac 2025).
        </p>
      </section>

      <section aria-labelledby="after" className="space-y-3">
        <h2 id="after" className="font-display text-2xl font-extrabold text-sakia-ink">Second visit, and no connection at all</h2>
        <div className="overflow-x-auto rounded-xl border border-sakia-sand-dark bg-white" role="region" aria-label="Second visit and offline" tabIndex={0}>
          <table className="w-full text-sm">
            <thead className="bg-sakia-sand">
              <tr>
                <th className="p-2 text-start">Site</th>
                <th className="p-2 text-start">Second visit (3G)</th>
                <th className="p-2 text-start">Works with no connection</th>
              </tr>
            </thead>
            <tbody>
              {ORDER.map((id) => {
                const r = get(id, "3G");
                return (
                  <tr key={id} className="border-t border-sakia-sand-dark">
                    <td className="p-2 font-semibold">{SHORT[id]}</td>
                    <td className="p-2">{r.repeat.kb.toLocaleString("en-GB")} KB</td>
                    <td className={`p-2 font-bold ${r.offline.works ? "text-sakia-green-deep" : "text-sakia-brown"}`}>{r.offline.works ? "Yes" : "No"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-sakia-brown">
          After the first visit Sakia opens with <strong>zero data</strong>, and <strong>it is the only one of these sites that still works with no connection</strong>: the plan is recomputed on the phone from the
          last saved forecast. A day&apos;s advice then costs about 1 KB of plan data, plus about 76 KB if the farmer plays the spoken advice.
        </p>
      </section>

      <section aria-labelledby="fair" className="space-y-2">
        <h2 id="fair" className="font-display text-2xl font-extrabold text-sakia-ink">What this does not say</h2>
        <ul className="list-disc space-y-1 ps-6 text-sakia-brown">
          <li>One run per site, from Tunis, on one day; sites change and results move.</li>
          <li>The other sites do other things (maps, radar, global coverage). This compares the first page a farmer would open for a forecast, not their features.</li>
          <li>Sakia is not ten times lighter than every lean site, and the lean sites are also quick on a second visit. The real difference is the lack of a connection.</li>
          <li>The WaPOR portal is a map application: it painted no text before the load event, so its time is not a time to useful content.</li>
        </ul>
        <p className="text-sakia-brown">
          Method, script and raw results: <a className="font-semibold text-sakia-water underline underline-offset-2" href="https://github.com/ag-algolab/sakia/blob/main/scripts/perf-compare.mjs">scripts/perf-compare.mjs</a>.{" "}
          <Link className="font-semibold text-sakia-water underline underline-offset-2" href="/lab">The research model that also runs in your browser</Link>.
        </p>
      </section>
    </main>
  );
}
