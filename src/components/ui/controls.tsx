"use client";

// Choix tactiles à gros boutons (pas de menus déroulants quand il y a peu d'options) : plus rapides au pouce.

type Option = { value: string; label: string; wide?: boolean };

export function Chips({
  label,
  value,
  options,
  onChange,
  tone = "green",
}: {
  label: string;
  value: string;
  options: Option[];
  onChange: (v: string) => void;
  tone?: "green" | "alert";
}) {
  const on = tone === "alert" ? "border-sakia-alert bg-sakia-alert text-white" : "border-sakia-green bg-sakia-green text-white";
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={`sk-press min-h-11 rounded-full border-2 px-4 text-base font-bold first-letter:uppercase ${
              active ? on : "border-sakia-sand-dark bg-white text-sakia-ink hover:border-sakia-green"
            } ${o.wide ? "grow" : ""}`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function Segmented({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Option[];
  onChange: (v: string) => void;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="grid auto-cols-fr grid-flow-col overflow-hidden rounded-xl border-2 border-sakia-sand-dark bg-sakia-sand">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={`min-h-12 px-2 text-center text-sm font-bold leading-tight transition-colors ${
              active ? "bg-sakia-green text-white" : "text-sakia-ink hover:bg-white/60"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
