import { useState, useEffect } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import {
  searchWallpapers,
  Wallpaper,
  listLocalWallpapers,
  LocalWallpaper,
  applyLocalWallpaper,
  setWallpaper,
  getPrimaryResolution,
  getStorageInfo,
  clearStorage,
  formatBytes
} from "./lib/wallhaven";
import { Slideshow } from "./components/Slideshow";
import { SettingsIcon, WallpaperIcon, Search, Pin, PinOff, Minus } from "lucide-react";
import { getSettings, saveSettings, Settings } from "./lib/settings";
import { confirm } from "@tauri-apps/plugin-dialog";
import "./App.css";

function App() {
  const [query, setQuery] = useState("nature");
  const [wallpapers, setWallpapers] = useState<Wallpaper[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"search" | "local" | "settings">("search");
  const [localWallpapers, setLocalWallpapers] = useState<LocalWallpaper[]>([]);
  const [applyStatus, setApplyStatus] = useState<"idle" | "applying" | "error">("idle");
  const [settings, setSettings] = useState<Settings>({ useResolutionFilter: true });
  const [storageInfo, setStorageInfo] = useState<{ count: number; totalBytes: number } | null>(null);
  const [pinned, setPinned] = useState(false);

  const toastStyle: React.CSSProperties = {
    position: "fixed",
    bottom: 12,
    left: "50%",
    transform: "translateX(-50%)",
    background: "#2c3e50",
    color: "#fff",
    padding: "6px 14px",
    borderRadius: 6,
    fontSize: 13,
    zIndex: 20,
  };

  async function handleApplyLocal(path: string) {
    setApplyStatus("applying");
    try {
      await applyLocalWallpaper(path);
      setApplyStatus("idle");
    } catch (err) {
      console.error(err);
      setApplyStatus("error");
      setTimeout(() => setApplyStatus("idle"), 2000);
    }
  }

  async function handleApplyRemote(wallpaper: Wallpaper) {
    setApplyStatus("applying");
    try {
      await setWallpaper(wallpaper);
      setApplyStatus("idle");
    } catch (err) {
      console.error(err);
      setApplyStatus("error");
      setTimeout(() => setApplyStatus("idle"), 2000);
    }
  }

  useEffect(() => {
    const win = getCurrentWindow();
    const unlisten = win.listen("tauri://blur", () => {
      if (!pinned) {
        win.hide();
      }
    });
    return () => {
      unlisten.then((f) => f());
    };
  }, [pinned]);

  useEffect(() => {
    getSettings().then(setSettings);
  }, []);

  useEffect(() => {
    if (activeTab === "local") {
      listLocalWallpapers().then(setLocalWallpapers);
    }

    if (activeTab === "settings") {
      getStorageInfo().then(setStorageInfo);
    }
  }, [activeTab]);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const atleast = settings.useResolutionFilter
        ? await getPrimaryResolution() ?? undefined
        : undefined;
      const results = await searchWallpapers(query, atleast);
      setWallpapers(results);
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleResolutionFilter() {
    const updated = { ...settings, useResolutionFilter: !settings.useResolutionFilter };
    setSettings(updated);
    await saveSettings(updated);
  }

  async function handleClearStorage() {
    const confirmed = await confirm(
      "¿Borrar todos los wallpapers guardados? Esta acción no se puede deshacer.",
      { title: "Confirmar", kind: "warning" }
    );
    if (!confirmed) return;

    await clearStorage();
    setStorageInfo({ count: 0, totalBytes: 0 });
    setLocalWallpapers([]);
  }

  return (
    <div style={{ padding: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => setActiveTab("search")}
            style={{
              fontWeight: activeTab === "search" ? "bold" : "normal",
              display: "flex",
              alignItems: "center",
              gap: 4
            }}
          >
            <Search size={18} />
            <span>Buscar</span>
          </button>
          <button
            onClick={() => setActiveTab("local")}
            style={{
              fontWeight: activeTab === "local" ? "bold" : "normal",
              display: "flex",
              alignItems: "center",
              gap: 4
            }}
          >
            <WallpaperIcon size={18} />
            <span>Mis Wallpapers</span>
          </button>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => setActiveTab("settings")}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 4,
              display: "flex",
              alignItems: "center",
            }}
            aria-label="Ajustes"
          >
            <SettingsIcon size={18} />
          </button>

          <button
            onClick={() => setPinned((p) => !p)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 4,
              display: "flex",
              alignItems: "center",
              color: pinned ? "#3498db" : "inherit",
            }}
            aria-label={pinned ? "Desfijar ventana" : "Fijar ventana"}
          >
            {pinned ? <Pin size={18} /> : <PinOff size={18} />}
          </button>

          <button
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 4,
              display: "flex",
              alignItems: "center",
            }}
          >
            <Minus size={18} />
          </button>
        </div>
      </div>

      {activeTab === "search" && (
        <>
          <form onSubmit={handleSearch} style={{ display: "flex", gap: 4 }}>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="keyword..."
            />
            <button type="submit" style={{ border: "none", backgroundImage: 'linear-gradient(to rigth, #4880EC, #019CAD)', color: "#CCCCCC" }}>Buscar</button>
          </form>

          {loading && <p>Cargando...</p>}

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 8,
            marginTop: 20,
            maxHeight: 340,
            overflowY: "auto",
          }}>
            {wallpapers.map((w) => (
              <img
                key={w.id}
                src={w.thumbs.small}
                alt={w.resolution}
                onClick={() => setSelectedIndex(wallpapers.indexOf(w))}
                style={{ width: "100%", borderRadius: 4, cursor: "pointer" }}
              />
            ))}
          </div>
        </>
      )}

      {activeTab === "local" && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 8,
            maxHeight: 340,
            overflowY: "auto",
          }}
        >
          {localWallpapers.map((w) => (
            <img
              key={w.path}
              src={w.url}
              alt={w.name}
              onClick={() => handleApplyLocal(w.path)}
              style={{ width: "100%", borderRadius: 4, cursor: "pointer" }}
            />
          ))}
        </div>
      )}

      {activeTab === "settings" && (
        <div>
          <h3>Ajustes</h3>
          <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="checkbox"
              checked={settings.useResolutionFilter}
              onChange={handleToggleResolutionFilter}
            />
            Filtrar por resolución de mi pantalla
          </label>
          <hr />
          <div style={{ marginTop: 16 }}>
            <p style={{ margin: "0 0 8px" }}>
              {storageInfo
                ? `${storageInfo.count} wallpapers guardados (${formatBytes(storageInfo.totalBytes)})`
                : "Calculando..."}
            </p>
            <button onClick={handleClearStorage}>Limpiar almacenamiento</button>
          </div>
        </div>
      )}

      {selectedIndex !== null && (
        <Slideshow
          wallpapers={wallpapers}
          currentIndex={selectedIndex}
          onClose={() => setSelectedIndex(null)}
          onNavigate={setSelectedIndex}
          onApply={handleApplyRemote}
        />
      )}

      {applyStatus === "applying" && (
        <div style={toastStyle}>Aplicando wallpaper...</div>
      )}
      {applyStatus === "error" && (
        <div style={{ ...toastStyle, background: "#c0392b" }}>
          Error al aplicar wallpaper
        </div>
      )}
    </div>
  );
}

export default App;
