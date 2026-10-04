"use client";

export default function RetryButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      onClick={() => window.location.reload()}
      className="min-h-12 rounded-xl bg-sakia-green px-5 text-base font-bold text-white hover:bg-sakia-green-deep"
    >
      {label}
    </button>
  );
}
