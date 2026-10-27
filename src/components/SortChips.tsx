import type { SortingPreset } from "../sources";

export const SORT_PRESETS: { label: string; value: SortingPreset; color: string }[] = [
  { label: "Latest", value: "date_added", color: "#a3d633" },
  { label: "Hot", value: "hot", color: "#ff5a44" },
  { label: "Toplist", value: "toplist", color: "#b760f0" },
  { label: "Random", value: "random", color: "#f08a33" },
];

interface SortChipsProps {
  value: SortingPreset;
  onChange: (value: SortingPreset) => void;
}

export function SortChips({ value, onChange }: SortChipsProps) {
  return (
    <div className="chips" role="group" aria-label="Ordenar por">
      {SORT_PRESETS.map((p) => (
        <button
          key={p.value}
          type="button"
          className={`chip${value === p.value ? " is-active" : ""}`}
          aria-pressed={value === p.value}
          onClick={() => onChange(p.value)}
        >
          <span className="chip__dot" style={{ background: p.color }} aria-hidden />
          {p.label}
        </button>
      ))}
    </div>
  );
}
