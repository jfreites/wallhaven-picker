import { setWallpaper, Wallpaper } from "../lib/wallhaven";

interface SlideshowProps {
  wallpapers: Wallpaper[];
  currentIndex: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

export function Slideshow({
  wallpapers,
  currentIndex,
  onClose,
  onNavigate,
}: SlideshowProps) {
  const current = wallpapers[currentIndex];
  if (!current) return null;

  const goPrev = () => {
    onNavigate((currentIndex - 1 + wallpapers.length) % wallpapers.length);
  };

  const goNext = () => {
    onNavigate((currentIndex + 1) % wallpapers.length);
  };

  async function handleSetWallpaper() {
    try {
      await setWallpaper(current);
      alert("Wallpaper aplicado");
    } catch (err) {
      console.error("Error al aplicar wallpaper:", err);
      alert("Error: " + err);
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.9)",
        display: "flex",
        flexDirection: "column",
        zIndex: 10,
      }}
    >
      <button
        onClick={onClose}
        style={{ position: "absolute", top: 12, right: 12, zIndex: 11 }}
      >
        Cerrar ✕
      </button>

      {/* Área de imagen: ocupa todo el espacio disponible menos el footer */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 0, // importante para que el flex no desborde
          padding: "12px 12px 0",
        }}
      >
        <img
          src={current.thumbs.original}
          alt={current.resolution}
          style={{
            maxWidth: "100%",
            maxHeight: "100%",
            objectFit: "contain",
          }}
        />
      </div>

      {/* Footer fijo al fondo */}
      <div
        style={{
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 6,
          padding: "8px 0 12px",
          background: "rgba(0,0,0,0.6)",
        }}
      >
        <p style={{ color: "#fff", margin: 0, fontSize: 13 }}>
          {current.resolution}
        </p>
        <div style={{ display: "flex", gap: 12 }}>
          <button onClick={goPrev}>‹ Anterior</button>
          <button onClick={handleSetWallpaper}>Usar como wallpaper</button>
          <button onClick={goNext}>Siguiente ›</button>
        </div>
      </div>
    </div>
  );
}