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
  formatBytes,
  SortingPreset
} from "./lib/wallhaven";
import { Slideshow } from "./components/Slideshow";
import { SettingsIcon, WallpaperIcon, Search, Pin, PinOff, Minus, BrushCleaning, ArrowBigDown } from "lucide-react";
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
  const [sorting, setSorting] = useState<SortingPreset>("date_added");
  const [page, setPage] = useState(1);

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

  async function runSearch(pageToLoad: number, append: boolean) {
    setLoading(true);
    try {
      const atleast = settings.useResolutionFilter
        ? await getPrimaryResolution() ?? undefined
        : undefined;
      const results = await searchWallpapers(query, atleast, sorting, pageToLoad, settings.apiKey);
      setWallpapers((prev) => (append ? [...prev, ...results] : results));
      setPage(pageToLoad);
    } finally {
      setLoading(false);
    }
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    await runSearch(1, false);
  }

  function handlePresetClick(value: SortingPreset) {
    setSorting(value);
  }

  useEffect(() => {
    runSearch(1, false);
  }, [sorting]);

  function handleLoadMore() {
    runSearch(page + 1, true);
  }

  function handleCloseWindow() {
    const win = getCurrentWindow();
    win.hide();
  }

  async function handleApiKeyChange(e: React.ChangeEvent<HTMLInputElement>) {
    const updated = { ...settings, apiKey: e.target.value || undefined };
    setSettings(updated);
    await saveSettings(updated);
  }

  const presets: { label: string; value: SortingPreset, color: string }[] = [
    { label: "Latest", value: "date_added", color: "#ad3" },
    { label: "Hot", value: "hot", color: "#f43" },
    { label: "Toplist", value: "toplist", color: "#b760f0" },
    { label: "Random", value: "random", color: "#e73" },
  ];

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
            onClick={handleCloseWindow}
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

          <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
            {presets.map((p) => (
              <button
                key={p.value}
                onClick={() => handlePresetClick(p.value)}
                className="tag-button"
                style={{ fontWeight: sorting === p.value ? "bold" : "normal", color: p.color, borderColor: p.color, '--hover-color': p.color  }}
              >
                {p.label}
              </button>
            ))}
          </div>

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

          {wallpapers.length > 0 && (
            <button
              onClick={handleLoadMore}
              disabled={loading}
              style={{ marginTop: 8, 
                display: "flex",
                alignItems: "center",
                gap: 4
              }}>
                <ArrowBigDown size={18} />
                <span>
                  {loading ? "Cargando..." : "Cargar más"}
                </span>
            </button>
          )}
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
          <hr style={{ backgroundColor: "#dfdfdf", border: "none", height: "2px" }} />
          <div style={{ marginTop: 16 }}>
            <label style={{ display: "block", marginBottom: 4 }}>
              API Key de Wallhaven (opcional)
            </label>
            <input
              type="password"
              value={settings.apiKey ?? ""}
              onChange={handleApiKeyChange}
              placeholder="Pega tu API key aquí"
              style={{ width: "400px" }}
            />
            <p style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>
              Desbloquea NSFW/Sketchy y mejores límites de resultados.{" "}
              <a
                href="https://wallhaven.cc/settings/account"
                target="_blank"
                rel="noreferrer"
              >
                Consigue la tuya aquí
              </a>
            </p>
          </div>
          <hr style={{ backgroundColor: "#dfdfdf", border: "none", height: "2px" }} />
          <div style={{ marginTop: 16 }}>
            <p style={{ margin: "0 0 8px" }}>
              {storageInfo
                ? `${storageInfo.count} wallpapers guardados (${formatBytes(storageInfo.totalBytes)})`
                : "Calculando..."}
            </p>
            <button
              onClick={handleClearStorage}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4
              }}
              >
              <BrushCleaning size={18} />
              <span>Limpiar almacenamiento</span>
            </button>
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
