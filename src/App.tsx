import { useState, useEffect, useRef } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import {
  listLocalWallpapers,
  LocalWallpaper,
  applyLocalWallpaper,
  deleteLocalWallpaper,
  setWallpaper,
  saveWallpaper,
  getPrimaryResolution,
  getStorageInfo,
  clearStorage,
} from "./lib/storage";
import {
  getSource,
  DEFAULT_SOURCE_ID,
  describeError,
  SourceError,
} from "./sources";
import type { Wallpaper, SearchFilters, SortingPreset, SourceId } from "./sources";
import { creditFor, sizeLabel, altFor } from "./lib/attribution";
import { Slideshow } from "./components/Slideshow";
import { SegmentedControl } from "./components/SegmentedControl";
import { IconButton } from "./components/IconButton";
import { SearchBar } from "./components/SearchBar";
import { SortChips } from "./components/SortChips";
import { SourceSelector } from "./components/SourceSelector";
import { WallpaperCard, SkeletonGrid } from "./components/WallpaperGrid";
import { EmptyState } from "./components/EmptyState";
import { SettingsPanel } from "./components/SettingsPanel";
import { Logo } from "./components/Logo";
import { Toast, ToastState } from "./components/Toast";
import {
  SettingsIcon, WallpaperIcon, Search, Pin, PinOff, Minus,
  ArrowDown, Check, Download, Eye, ImageOff, WifiOff, Trash2, Clock, TriangleAlert,
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
  const [searchError, setSearchError] = useState<unknown>(null);
  const [hasMore, setHasMore] = useState(false);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("search");
  const [localWallpapers, setLocalWallpapers] = useState<LocalWallpaper[]>([]);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [settings, setSettings] = useState<Settings>({ useResolutionFilter: true });
  const [storageInfo, setStorageInfo] = useState<{ count: number; totalBytes: number } | null>(null);
  const [pinned, setPinned] = useState(false);
  const [sorting, setSorting] = useState<SortingPreset>("date_added");
  const [sourceId, setSourceId] = useState<SourceId>(DEFAULT_SOURCE_ID);
  const [page, setPage] = useState(1);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [focusTick, setFocusTick] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);
  const requestId = useRef(0);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  function showToast(next: ToastState | null, autoHideMs?: number) {
    clearTimeout(toastTimer.current);
    setToast(next);
    if (next && autoHideMs) {
      toastTimer.current = setTimeout(() => setToast(null), autoHideMs);
    }
  }

  async function runWithToast(busy: string, done: string, task: () => Promise<string | void>) {
    showToast({ kind: "busy", message: busy });
    try {
      const warning = await task();
      if (warning) {
        showToast({ kind: "warning", message: `${done}. ${warning}` }, 4500);
      } else {
        showToast({ kind: "success", message: done }, 1500);
      }
    } catch (err) {
      console.error(err);
      const message = err instanceof SourceError ? describeError(err).title : "Algo salió mal. Inténtalo de nuevo.";
      showToast({ kind: "error", message }, 3000);
    }
  }

  const handleApplyLocal = (path: string) =>
    runWithToast("Aplicando wallpaper…", "Wallpaper aplicado", () => applyLocalWallpaper(path));

  const handleApplyRemote = (wallpaper: Wallpaper) =>
    runWithToast("Aplicando wallpaper…", "Wallpaper aplicado", () => setWallpaper(wallpaper));

  async function handleDeleteLocal(path: string) {
    setPendingDelete(null);
    try {
      await deleteLocalWallpaper(path);
      setLocalWallpapers((prev) => prev.filter((w) => w.path !== path));
      showToast({ kind: "success", message: "Wallpaper eliminado" }, 1500);
    } catch (err) {
      console.error(err);
      showToast({ kind: "error", message: "No se pudo eliminar." }, 2000);
    }
  }

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
    getSettings()
      .then((s) => {
        setSettings(s);
        setSourceId(getSource(s.sourceId).id);
      })
      .catch(console.error)
      .finally(() => setSettingsLoaded(true));
  }, []);

  useEffect(() => {
    setPendingDelete(null);
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
    const id = ++requestId.current;
    const src = getSource(sourceId);
    setLoading(true);
    setLoadingMore(append);
    setSearchError(null);
    try {
      const filters: SearchFilters = { sorting, apiKey: settings.apiKey };
      if (src.capabilities.resolutionFilter && settings.useResolutionFilter) {
        filters.atleast = (await getPrimaryResolution()) ?? undefined;
      }
      const q = searchQuery.trim();
      const result =
        !q && src.capabilities.featured && src.featured
          ? await src.featured(pageToLoad, filters)
          : await src.search(q, pageToLoad, filters);
      if (id !== requestId.current) return; // llegó tarde: ya hay otra búsqueda o fuente
      setWallpapers((prev) => {
        if (!append) return result.items;
        const seen = new Set(prev.map((w) => w.id));
        return [...prev, ...result.items.filter((w) => !seen.has(w.id))];
      });
      setHasMore(result.hasMore);
      setPage(pageToLoad);
      setActiveQuery(searchQuery);
    } catch (err) {
      if (id !== requestId.current) return;
      console.error(err);
      if (append) {
        showToast({ kind: "error", message: describeError(err, src.name).title }, 3000);
      } else {
        setWallpapers([]);
        setHasMore(false);
        setSearchError(err);
      }
    } finally {
      if (id === requestId.current) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }

  async function handleSearch() {
    await runSearch(1, false, query);
  }

  useEffect(() => {
    if (!settingsLoaded) return; // esperar la API key y la última fuente guardadas
    runSearch(1, false, "");
  }, [settingsLoaded, sourceId, sorting]);

  async function handleSourceChange(id: SourceId) {
    if (id === sourceId) return;
    setQuery("");
    setSourceId(id);
    const updated = { ...settings, sourceId: id };
    setSettings(updated);
    await saveSettings(updated);
  }

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

  const source = getSource(sourceId);
  const showSkeleton = loading && !loadingMore;
  const errorInfo = searchError ? describeError(searchError, source.name) : null;
  const errorKind = searchError instanceof SourceError ? searchError.kind : "http";
  const errorIcon =
    errorKind === "offline" ? <WifiOff size={26} /> : errorKind === "rate_limit" ? <Clock size={26} /> : <TriangleAlert size={26} />;

  return (
    <div className="app">
      <header className="titlebar">
        <Logo />
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
          {source.capabilities.search && (
            <SearchBar
              ref={searchRef}
              value={query}
              onChange={setQuery}
              onSubmit={handleSearch}
              placeholder={`Buscar en ${source.name}…`}
            />
          )}
          <div className="toolbar__row">
            <SourceSelector value={sourceId} onChange={handleSourceChange} />
            {source.capabilities.sorting && <SortChips value={sorting} onChange={setSorting} />}
          </div>
        </div>

        <div className="scroll" aria-busy={loading}>
          {!showSkeleton && errorInfo ? (
            <EmptyState
              icon={errorIcon}
              title={errorInfo.title}
              text={errorInfo.text}
              action={<button type="button" className="btn" onClick={handleSearch}>Reintentar</button>}
            />
          ) : !showSkeleton && wallpapers.length === 0 ? (
            <EmptyState
              icon={<ImageOff size={26} />}
              title={`Sin resultados en ${source.name}`}
              text={source.emptyHint}
              action={
                hasMore ? (
                  <button type="button" className="btn" onClick={handleLoadMore}>Cargar más</button>
                ) : undefined
              }
            />
          ) : (
            <>
              <div className="grid">
                {showSkeleton ? (
                  <SkeletonGrid />
                ) : (
                  wallpapers.map((w, i) => (
                    <WallpaperCard
                      key={`${w.sourceId}-${w.id}`}
                      src={w.thumbUrl}
                      sourceId={w.sourceId}
                      alt={altFor(w)}
                      detail={sizeLabel(w)}
                      attribution={creditFor(w)}
                      openLabel={`Ver wallpaper ${altFor(w)}`}
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
              {!showSkeleton && wallpapers.length > 0 && hasMore && (
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
                    detail={w.wallpaper ? sizeLabel(w.wallpaper) : undefined}
                    attribution={w.wallpaper ? creditFor(w.wallpaper) : undefined}
                    openLabel={`Aplicar ${w.name}`}
                    onOpen={() => handleApplyLocal(w.path)}
                    actions={[
                      { label: "Aplicar", icon: <Check size={14} />, onClick: () => handleApplyLocal(w.path) },
                      { label: "Eliminar", icon: <Trash2 size={14} />, onClick: () => setPendingDelete(w.path) },
                    ]}
                    confirm={{
                      active: pendingDelete === w.path,
                      message: "¿Eliminar este wallpaper?",
                      confirmLabel: "Eliminar",
                      onConfirm: () => handleDeleteLocal(w.path),
                      onCancel: () => setPendingDelete(null),
                    }}
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
