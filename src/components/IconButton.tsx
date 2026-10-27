import type { ReactNode } from "react";

interface IconButtonProps {
  label: string;
  onClick: () => void;
  children: ReactNode;
  active?: boolean;
  pressed?: boolean;
}

export function IconButton({ label, onClick, children, active, pressed }: IconButtonProps) {
  return (
    <button
      type="button"
      className={`icon-button${active ? " is-active" : ""}`}
      aria-label={label}
      aria-pressed={pressed}
      title={label}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
