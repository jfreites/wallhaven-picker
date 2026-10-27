import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Check, X } from "lucide-react";
import { getSource } from "../sources";
import type { Wallpaper } from "../sources";
import { creditFor, sizeLabel, altFor } from "../lib/attribution";
import { getPrimaryResolution } from "../lib/storage";
import { SourceImage } from "./SourceImage";

interface SlideshowProps {
  wallpapers: Wallpaper[];
  currentIndex: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
  onApply: (wallpaper: Wallpaper) => void;
}

const EXIT_MS = 150;

function SlideImage({ wallpaper, dir }: { wallpaper: Wallpaper; dir: "next" | "prev" }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <div className={`slideshow__stage slide-${dir}`}>
      <SourceImage
        className={`slideshow__img${loaded ? " is-loaded" : ""}`}
        sourceId={wallpaper.sourceId}
        eager
        src={wallpaper.previewUrl}
        alt={altFor(wallpaper)}
        onLoad={() => setLoaded(true)}
      />
    </div>
  );
}

export function Slideshow({ wallpapers, currentIndex, onClose, onNavigate, onApply }: SlideshowProps) {
  const [dir, setDir] = useState<"next" | "prev">("next");
  const [closing, setClosing] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const current = wallpapers[currentIndex];
  // Fuentes con resolveFull: dimensiones y URL final se completan al abrir cada imagen.
  const [resolved, setResolved] = useState<Record<string, Wallpaper>>({});
  const [screen, setScreen] = useState<[number, number] | null>(null);

  const goPrev = () => {
    setDir("prev");
    onNavigate((currentIndex - 1 + wallpapers.length) % wallpapers.length);
  };
  const goNext = () => {
    setDir("next");
    onNavigate((currentIndex + 1) % wallpapers.length);
  };
  const close = () => {
    if (closing) return;
    setClosing(true);
    setTimeout(onClose, EXIT_MS);
  };

  useEffect(() => {
    getPrimaryResolution()
      .then((r) => r && setScreen(r.split("x").map(Number) as [number, number]))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const resolveFull = current && getSource(current.sourceId).resolveFull;
    if (!current || !resolveFull || resolved[current.id]) return;
    let cancelled = false;
    resolveFull(current)
      .then((r) => !cancelled && setResolved((prev) => ({ ...prev, [r.id]: r })))
      .catch(() => {}); // el aviso es opcional; descargar/aplicar reintenta y reporta el error
    return () => {
      cancelled = true;
    };
  }, [current?.id]);

  // Foco al abrir y restauración al cerrar.
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    rootRef.current?.focus();
    return () => previous?.focus?.();
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goNext();
      } else if (e.key === "Tab" && rootRef.current) {
        // Trampa de foco dentro del diálogo.
        const focusables = rootRef.current.querySelectorAll<HTMLElement>("button, a[href]");
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  if (!current) return null;
  const shown = resolved[current.id] ?? current;
  const credit = creditFor(current);
  const isVertical = !!shown.width && shown.height > shown.width;
  const isSmall = !!shown.width && !!screen && (shown.width < screen[0] || shown.height < screen[1]);
  const warning = isVertical
    ? "Vertical: no sirve como wallpaper"
    : isSmall
      ? `Menor que tu pantalla (${screen![0]}×${screen![1]})`
      : undefined;
  const sourceName = getSource(current.sourceId).name;

  return (
    <div
      ref={rootRef}
      className={`slideshow${closing ? " is-closing" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label={`Vista previa, ${currentIndex + 1} de ${wallpapers.length}`}
      tabIndex={-1}
    >
      <SlideImage key={current.id} wallpaper={current} dir={dir} />

      <button type="button" className="slideshow__btn slideshow__close" onClick={close} aria-label="Cerrar (Esc)">
        <X size={18} />
      </button>
      <button type="button" className="slideshow__btn slideshow__nav slideshow__nav--prev" onClick={goPrev} aria-label="Anterior (←)">
        <ChevronLeft size={22} />
      </button>
      <button type="button" className="slideshow__btn slideshow__nav slideshow__nav--next" onClick={goNext} aria-label="Siguiente (→)">
        <ChevronRight size={22} />
      </button>

      <div className="slideshow__bar">
        <div className="slideshow__credit">
          <span className="slideshow__credit-line">
            {credit.href ? (
              <a href={credit.href} target="_blank" rel="noreferrer">{credit.label}</a>
            ) : (
              credit.label
            )}
            {current.author && <> · <a href={current.pageUrl} target="_blank" rel="noreferrer">{sourceName}</a></>}
            {current.license && <> · {current.license}</>}
          </span>
          {warning && <span className="slideshow__warn" role="status">{warning}</span>}
        </div>
        <div className="slideshow__right">
          <span className="slideshow__meta" aria-live="polite">
            {sizeLabel(shown) && `${sizeLabel(shown)} · `}{currentIndex + 1}/{wallpapers.length}
          </span>
          <button
            type="button"
            className="btn btn--primary"
            disabled={isVertical}
            title={isVertical ? warning : undefined}
            onClick={() => onApply(current)}
          >
            <Check size={14} aria-hidden />
            Usar como wallpaper
          </button>
        </div>
      </div>
    </div>
  );
}
