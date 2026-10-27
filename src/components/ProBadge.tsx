import { Sparkles } from "lucide-react";

export function ProBadge() {
  return (
    <span className="pro-badge" aria-label="Función Pro">
      <Sparkles size={10} aria-hidden />
      Pro
    </span>
  );
}
