import type { ReactNode } from "react";
import { Lock } from "lucide-react";
import { ProBadge } from "./ProBadge";

interface LockedFeatureProps {
  title: string;
  description: string;
  icon?: ReactNode;
  /** Vista previa opcional de la feature; se muestra atenuada e inerte. */
  children?: ReactNode;
  onUnlock?: () => void;
}

/** Estado bloqueado reutilizable para features Pro aún no implementadas. */
export function LockedFeature({ title, description, icon, children, onUnlock }: LockedFeatureProps) {
  return (
    <button
      type="button"
      className="locked"
      aria-disabled="true"
      aria-label={`${title}. ${description}. Requiere Wallflow Pro`}
      onClick={onUnlock}
    >
      {icon && <span className="locked__icon" aria-hidden>{icon}</span>}
      <span className="locked__text">
        <span className="locked__title">
          {title} <ProBadge />
        </span>
        <span className="locked__desc">{description}</span>
        {children && <span className="locked__preview" aria-hidden>{children}</span>}
      </span>
      <Lock size={14} className="locked__lock" aria-hidden />
    </button>
  );
}
