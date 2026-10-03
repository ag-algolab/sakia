"use client";

import { useEffect, useState } from "react";

// Tailles réelles mesurées en direct sur nos propres routes (octets reçus, avant compression).
const TARGETS = [
  { label: "7-day plan (JSON)", url: "/api/plan?region=kairouan&crop=olivier&ago=3" },
  { label: "Raw weather forecast kept for offline use (JSON)", url: "/api/forecast?region=kairouan" },
];

export default function LiveSizes() {
  const [sizes, setSizes] = useState<(number | null)[]>(TARGETS.map(() => null));

  useEffect(() => {
    let cancelled = false;
    TARGETS.forEach((t, i) => {
      fetch(t.url)
        .then(async (r) => {
          const text = await r.text();
          return r.ok ? new TextEncoder().encode(text).length : -1;
        })
        .catch(() => -1)
        .then((n) => {
          if (cancelled) return;
          setSizes((prev) => prev.map((v, j) => (j === i ? n : v)));
        });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <ul className="space-y-1 text-sm text-sakia-ink">
      {TARGETS.map((t, i) => (
        <li key={t.url} className="flex justify-between gap-3">
          <span>{t.label}</span>
          <span className="font-semibold" dir="ltr">
            {sizes[i] == null ? "…" : sizes[i]! < 0 ? "unavailable" : `${(sizes[i]! / 1024).toFixed(1)} KB`}
          </span>
        </li>
      ))}
    </ul>
  );
}
