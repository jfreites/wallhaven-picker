import type { ReactNode } from "react";
import type { Attribution } from "../lib/sources";

export interface CardAction {
  label: string;
  icon: ReactNode;
  onClick: () => void;
}

interface WallpaperCardProps {
  src: string;
  alt: string;
  /** Acción principal al pulsar la imagen. */
  onOpen: () => void;
  openLabel: string;
  actions: CardAction[];
  /** Espacio de atribución (autor/fuente); aparece en el overlay. */
  attribution?: Attribution;
  detail?: string;
}

export function WallpaperCard({ src, alt, onOpen, openLabel, actions, attribution, detail }: WallpaperCardProps) {
  return (
    <div className="card">
      <button type="button" className="card__image-btn" onClick={onOpen} aria-label={openLabel}>
        <img className="card__image" src={src} alt={alt} loading="lazy" draggable={false} />
      </button>
      <div className="card__overlay">
        <div className="card__attribution">
          <span className="card__source">
            {attribution ? attribution.author ?? attribution.source : ""}
          </span>
          <span className="card__detail">{detail}</span>
        </div>
        <div className="card__actions">
          {actions.map((a) => (
            <button
              key={a.label}
              type="button"
              className="card__action"
              aria-label={`${a.label}: ${alt}`}
              title={a.label}
              onClick={a.onClick}
            >
              {a.icon}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function SkeletonGrid({ count = 12 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="skeleton" aria-hidden />
      ))}
    </>
  );
}
