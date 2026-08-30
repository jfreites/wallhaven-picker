import { useState, useEffect } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { searchWallpapers, Wallpaper, listLocalWallpapers, LocalWallpaper, applyLocalWallpaper, setWallpaper } from "./lib/wallhaven";
import { Slideshow } from "./components/Slideshow";
import { Settings, WallpaperIcon, Search } from "lucide-react";
import "./App.css";

function App() {
  const [query, setQuery] = useState("nature");
  const [wallpapers, setWallpapers] = useState<Wallpaper[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"search" | "local" | "settings">("search");
  const [localWallpapers, setLocalWallpapers] = useState<LocalWallpaper[]>([]);
  const [applyStatus, setApplyStatus] = useState<"idle" | "applying" | "error">("idle");

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
    if (activeTab === "local") {
      listLocalWallpapers().then(setLocalWallpapers);
    }
  }, [activeTab]);

  useEffect(() => {
    const win = getCurrentWindow();
    const unlisten = win.listen("tauri://blur", () => {
      win.hide();
    });
    return () => {
      unlisten.then((f) => f());
    };
  }, []);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const results = await searchWallpapers(query);
      setWallpapers(results);
    } finally {
      setLoading(false);
    }
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
          <Settings size={18} />
        </button>
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
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 8,
            maxHeight: 340,
            overflowY: "auto",
          }}
        >
          <h3>Ajustes</h3>
          <p>...</p>
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
