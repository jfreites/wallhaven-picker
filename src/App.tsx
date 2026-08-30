import { useState, useEffect } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { searchWallpapers, Wallpaper, listLocalWallpapers, LocalWallpaper } from "./lib/wallhaven";
import { Slideshow } from "./components/Slideshow";
import "./App.css";

function App() {
  const [query, setQuery] = useState("nature");
  const [wallpapers, setWallpapers] = useState<Wallpaper[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"search" | "local">("search");
  const [localWallpapers, setLocalWallpapers] = useState<LocalWallpaper[]>([]);

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
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <button
          onClick={() => setActiveTab("search")}
          style={{ fontWeight: activeTab === "search" ? "bold" : "normal" }}
        >
          Buscar
        </button>
        <button
          onClick={() => setActiveTab("local")}
          style={{ fontWeight: activeTab === "local" ? "bold" : "normal" }}
        >
          Mis Wallpapers
        </button>
      </div>

      {activeTab === "search" && (
        <>
          <form onSubmit={handleSearch}>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="keyword..."
              />
            <button type="submit">Buscar</button>
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
              style={{ width: "100%", borderRadius: 4, cursor: "pointer" }}
            />
          ))}
        </div>
      )}

      {selectedIndex !== null && (
        <Slideshow
          wallpapers={wallpapers}
          currentIndex={selectedIndex}
          onClose={() => setSelectedIndex(null)}
          onNavigate={setSelectedIndex}
        />
      )}
    </div>
  );
}

export default App;
