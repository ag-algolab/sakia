"use client";

export default function RetryButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      onClick={() => window.location.reload()}
      className="rounded-md bg-[#2f6b3a] px-4 py-2 text-sm font-semibold text-white hover:bg-[#25562e]"
    >
      {label}
    </button>
  );
}
