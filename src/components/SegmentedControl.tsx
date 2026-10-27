import { useRef } from "react";
import type { ReactNode } from "react";

export interface SegmentItem<T extends string> {
  id: T;
  label: string;
  icon?: ReactNode;
  disabled?: boolean;
  hint?: string;
}

interface SegmentedControlProps<T extends string> {
  items: SegmentItem<T>[];
  value: T;
  onChange: (id: T) => void;
  label: string;
  size?: "md" | "sm";
  /** Prefijo para enlazar cada pestaña con su panel (aria-controls). */
  idPrefix?: string;
}

export function SegmentedControl<T extends string>({
  items,
  value,
  onChange,
  label,
  size = "md",
  idPrefix,
}: SegmentedControlProps<T>) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});
  const enabled = items.filter((i) => !i.disabled);

  function handleKeyDown(e: React.KeyboardEvent) {
    const dir = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!dir) return;
    e.preventDefault();
    const idx = enabled.findIndex((i) => i.id === value);
    const next = enabled[(idx + dir + enabled.length) % enabled.length];
    onChange(next.id);
    refs.current[next.id]?.focus();
  }

  return (
    <div
      className={`segmented segmented--${size}`}
      role="tablist"
      aria-label={label}
      onKeyDown={handleKeyDown}
    >
      {items.map((item) => {
        const active = item.id === value;
        return (
          <button
            key={item.id}
            ref={(el) => {
              refs.current[item.id] = el;
            }}
            id={idPrefix ? `${idPrefix}-tab-${item.id}` : undefined}
            role="tab"
            type="button"
            aria-selected={active}
            aria-controls={idPrefix ? `${idPrefix}-panel-${item.id}` : undefined}
            aria-disabled={item.disabled || undefined}
            tabIndex={active ? 0 : -1}
            title={item.hint}
            className={`segmented__item${active ? " is-active" : ""}${item.disabled ? " is-disabled" : ""}`}
            onClick={() => !item.disabled && onChange(item.id)}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
