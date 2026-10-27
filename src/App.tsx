import { useState, useEffect, useRef } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import {
  searchWallpapers,
  Wallpaper,
  listLocalWallpapers,
  LocalWallpaper,
  applyLocalWallpaper,
  setWallpaper,
  saveWallpaper,
  getPrimaryResolution,
  getStorageInfo,
  clearStorage,
  SortingPreset
} from "./lib/wallhaven";
import { Slideshow } from "./components/Slideshow";
import { SegmentedControl } from "./components/SegmentedControl";
import { IconButton } from "./components/IconButton";
import { SearchBar } from "./components/SearchBar";
import { SortChips } from "./components/SortChips";
import { SourceSelector } from "./components/SourceSelector";
import { WallpaperCard, SkeletonGrid } from "./components/WallpaperGrid";
import { EmptyState } from "./components/EmptyState";
import { SettingsPanel } from "./components/SettingsPanel";
import { Toast, ToastState } from "./components/Toast";
import { SOURCES, SourceId } from "./lib/sources";
import {
  SettingsIcon, WallpaperIcon, Search, Pin, PinOff, Minus,
  ArrowDown, Check, Download, Eye, ImageOff, WifiOff,
} from "lucide-react";
import { getSettings, saveSettings, Settings } from "./lib/settings";
import { confirm } from "@tauri-apps/plugin-dialog";
import "./components/ui.css";
import "./components/content.css";

type Tab = "search" | "local" | "settings";

const TABS = [
  { id: "search" as const, label: "Buscar", icon: <Search size={14} aria-hidden /> },
  { id: "local" as const, label: "Mis Wallpapers", icon: <WallpaperIcon size={14} aria-hidden /> },
  { id: "settings" as const, label: "Ajustes", icon: <SettingsIcon size={14} aria-hidden /> },
];

function App() {
  const [query, setQuery] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  const [wallpapers, setWallpapers] = useState<Wallpaper[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchFailed, setSearchFailed] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("search");
  const [localWallpapers, setLocalWallpapers] = useState<LocalWallpaper[]>([]);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [settings, setSettings] = useState<Settings>({ useResolutionFilter: true });
  const [storageInfo, setStorageInfo] = useState<{ count: number; totalBytes: number } | null>(null);
  const [pinned, setPinned] = useState(false);
  const [sorting, setSorting] = useState<SortingPreset>("date_added");
  const [source, setSource] = useState<SourceId>(SOURCES[0].id);
  const [page, setPage] = useState(1);
  const [focusTick, setFocusTick] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  function showToast(next: ToastState | null, autoHideMs?: number) {
    clearTimeout(toastTimer.current);
    setToast(next);
    if (next && autoHideMs) {
      toastTimer.current = setTimeout(() => setToast(null), autoHideMs);
    }
  }

  async function runWithToast(busy: string, done: string, task: () => Promise<void>) {
    showToast({ kind: "busy", message: busy });
    try {
      await task();
      showToast({ kind: "success", message: done }, 1500);
    } catch (err) {
      console.error(err);
      showToast({ kind: "error", message: "Algo salió mal. Inténtalo de nuevo." }, 2000);
    }
  }

  const handleApplyLocal = (path: string) =>
    runWithToast("Aplicando wallpaper…", "Wallpaper aplicado", () => applyLocalWallpaper(path));

  const handleApplyRemote = (wallpaper: Wallpaper) =>
    runWithToast("Aplicando wallpaper…", "Wallpaper aplicado", () => setWallpaper(wallpaper));

  const handleSave = (wallpaper: Wallpaper) =>
    runWithToast("Guardando…", "Guardado en Mis Wallpapers", () => saveWallpaper(wallpaper));

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

  // ⌘K: ir a Buscar y enfocar la barra.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.metaKey && e.key.toLowerCase() === "k" && selectedIndex === null) {
        e.preventDefault();
        setActiveTab("search");
        setFocusTick((t) => t + 1);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedIndex]);

  useEffect(() => {
    if (focusTick > 0) {
      searchRef.current?.focus();
      searchRef.current?.select();
    }
  }, [focusTick]);

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

  async function runSearch(pageToLoad: number, append: boolean, searchQuery: string) {
    setLoading(true);
    setLoadingMore(append);
    setSearchFailed(false);
    try {
      const atleast = settings.useResolutionFilter
        ? await getPrimaryResolution() ?? undefined
        : undefined;
      const results = await searchWallpapers(searchQuery, atleast, sorting, pageToLoad, settings.apiKey);
      setWallpapers((prev) => (append ? [...prev, ...results] : results));
      setPage(pageToLoad);
      setActiveQuery(searchQuery);
    } catch (err) {
      console.error(err);
      setSearchFailed(true);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  async function handleSearch() {
    await runSearch(1, false, query);
  }

  useEffect(() => {
    runSearch(1, false, "");
  }, [sorting]);

  function handleLoadMore() {
    runSearch(page + 1, true, activeQuery);
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

  const showSkeleton = loading && !loadingMore;

  return (
    <div className="app">
      <header className="titlebar">
        <SegmentedControl
          label="Secciones"
          idPrefix="nav"
          items={TABS}
          value={activeTab}
          onChange={setActiveTab}
        />
        <div className="titlebar__actions">
          <IconButton
            label={pinned ? "Desfijar ventana" : "Fijar ventana"}
            pressed={pinned}
            active={pinned}
            onClick={() => setPinned((p) => !p)}
          >
            {pinned ? <Pin size={16} /> : <PinOff size={16} />}
          </IconButton>
          <IconButton label="Ocultar ventana" onClick={handleCloseWindow}>
            <Minus size={16} />
          </IconButton>
        </div>
      </header>

      <section
        className="panel"
        role="tabpanel"
        id="nav-panel-search"
        aria-labelledby="nav-tab-search"
        hidden={activeTab !== "search"}
      >
        <div className="toolbar">
          <SearchBar ref={searchRef} value={query} onChange={setQuery} onSubmit={handleSearch} />
          <div className="toolbar__row">
            <SourceSelector value={source} onChange={setSource} />
            <SortChips value={sorting} onChange={setSorting} />
          </div>
        </div>

        <div className="scroll" aria-busy={loading}>
          {!showSkeleton && searchFailed && wallpapers.length === 0 ? (
            <EmptyState
              icon={<WifiOff size={26} />}
              title="No se pudo conectar con Wallhaven"
              text="Revisa tu conexión y vuelve a intentarlo."
              action={<button type="button" className="btn" onClick={handleSearch}>Reintentar</button>}
            />
          ) : !showSkeleton && wallpapers.length === 0 ? (
            <EmptyState
              icon={<ImageOff size={26} />}
              title="Sin resultados"
              text="Prueba con otra palabra clave o cambia el orden."
            />
          ) : (
            <>
              <div className="grid">
                {showSkeleton ? (
                  <SkeletonGrid />
                ) : (
                  wallpapers.map((w, i) => (
                    <WallpaperCard
                      key={w.id}
                      src={w.thumbs.small}
                      alt={w.resolution}
                      detail={w.resolution}
                      attribution={{ source: SOURCES[0].label }}
                      openLabel={`Ver wallpaper ${w.resolution}`}
                      onOpen={() => setSelectedIndex(i)}
                      actions={[
                        { label: "Aplicar", icon: <Check size={14} />, onClick: () => handleApplyRemote(w) },
                        { label: "Guardar", icon: <Download size={14} />, onClick: () => handleSave(w) },
                        { label: "Ver", icon: <Eye size={14} />, onClick: () => setSelectedIndex(i) },
                      ]}
                    />
                  ))
                )}
                {loadingMore && <SkeletonGrid count={4} />}
              </div>
              {!showSkeleton && wallpapers.length > 0 && (
                <div className="load-more">
                  <button type="button" className="btn" onClick={handleLoadMore} disabled={loading}>
                    <ArrowDown size={14} aria-hidden />
                    {loadingMore ? "Cargando…" : "Cargar más"}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {activeTab === "local" && (
        <section
          className="panel"
          role="tabpanel"
          id="nav-panel-local"
          aria-labelledby="nav-tab-local"
        >
          <div className="scroll">
            {localWallpapers.length === 0 ? (
              <EmptyState
                icon={<WallpaperIcon size={26} />}
                title="Aún no tienes wallpapers"
                text="Los que apliques o guardes desde Buscar aparecerán aquí."
                action={
                  <button type="button" className="btn btn--primary" onClick={() => setActiveTab("search")}>
                    Explorar wallpapers
                  </button>
                }
              />
            ) : (
              <div className="grid">
                {localWallpapers.map((w) => (
                  <WallpaperCard
                    key={w.path}
                    src={w.url}
                    alt={w.name}
                    openLabel={`Aplicar ${w.name}`}
                    onOpen={() => handleApplyLocal(w.path)}
                    actions={[
                      { label: "Aplicar", icon: <Check size={14} />, onClick: () => handleApplyLocal(w.path) },
                    ]}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {activeTab === "settings" && (
        <section
          className="panel"
          role="tabpanel"
          id="nav-panel-settings"
          aria-labelledby="nav-tab-settings"
        >
          <div className="scroll">
            <SettingsPanel
              settings={settings}
              storageInfo={storageInfo}
              onToggleResolutionFilter={handleToggleResolutionFilter}
              onApiKeyChange={handleApiKeyChange}
              onClearStorage={handleClearStorage}
            />
          </div>
        </section>
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

      <Toast toast={toast} />
    </div>
  );
}

export default App;
