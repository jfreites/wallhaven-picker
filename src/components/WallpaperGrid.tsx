import type { ReactNode } from "react";
import type { Credit } from "../lib/attribution";
import { SourceImage } from "./SourceImage";

export interface CardAction {
  label: string;
  icon: ReactNode;
  onClick: () => void;
}

interface WallpaperCardProps {
  src: string;
  /** Fuente de la imagen, si requiere cargarse con headers propios. */
  sourceId?: string;
  alt: string;
  /** Acción principal al pulsar la imagen. */
  onOpen: () => void;
  openLabel: string;
  actions: CardAction[];
  /** Espacio de atribución (autor/fuente); aparece en el overlay. */
  attribution?: Credit;
  detail?: string;
  /** Confirmación inline para acciones destructivas (p. ej. eliminar). */
  confirm?: { active: boolean; message: string; confirmLabel: string; onConfirm: () => void; onCancel: () => void };
}

export function WallpaperCard({ src, sourceId, alt, onOpen, openLabel, actions, attribution, detail, confirm }: WallpaperCardProps) {
  return (
    <div className="card">
      <button type="button" className="card__image-btn" onClick={onOpen} aria-label={openLabel}>
        <SourceImage className="card__image" src={src} sourceId={sourceId} alt={alt} />
      </button>
      <div className="card__overlay">
        <div className="card__attribution">
          {attribution &&
            (attribution.href ? (
              <a
                className="card__source"
                href={attribution.href}
                target="_blank"
                rel="noreferrer"
                aria-label={`${attribution.label} (se abre en el navegador)`}
              >
                {attribution.label}
              </a>
            ) : (
              <span className="card__source">{attribution.label}</span>
            ))}
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
      {confirm?.active && (
        <div
          className="card__confirm"
          role="alertdialog"
          aria-label={confirm.message}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.stopPropagation();
              confirm.onCancel();
            }
          }}
        >
          <p>{confirm.message}</p>
          <div className="card__confirm-actions">
            <button type="button" className="btn" autoFocus onClick={confirm.onCancel}>Cancelar</button>
            <button type="button" className="btn btn--danger" onClick={confirm.onConfirm}>{confirm.confirmLabel}</button>
          </div>
        </div>
      )}
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
