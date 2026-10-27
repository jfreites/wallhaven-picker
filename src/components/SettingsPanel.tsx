import { BrushCleaning, Layers, Monitor, RefreshCw } from "lucide-react";
import { Settings } from "../lib/settings";
import { formatBytes } from "../lib/storage";
import { LockedFeature } from "./LockedFeature";
import { Switch } from "./Switch";

interface SettingsPanelProps {
  settings: Settings;
  storageInfo: { count: number; totalBytes: number } | null;
  onToggleResolutionFilter: () => void;
  onApiKeyChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClearStorage: () => void;
}

export function SettingsPanel({
  settings,
  storageInfo,
  onToggleResolutionFilter,
  onApiKeyChange,
  onClearStorage,
}: SettingsPanelProps) {
  return (
    <div className="settings">
      <section className="settings__group" aria-labelledby="s-general">
        <h2 id="s-general" className="settings__heading">General</h2>
        <div className="settings__card">
          <div className="settings__row">
            <div className="settings__label">
              <span>Filtrar por resolución de mi pantalla</span>
              <span className="settings__hint">Muestra solo wallpapers que cubren tu monitor principal, en las fuentes que lo soportan.</span>
            </div>
            <Switch
              checked={settings.useResolutionFilter}
              onChange={onToggleResolutionFilter}
              label="Filtrar por resolución de mi pantalla"
            />
          </div>
          <div className="settings__row settings__row--stack">
            <label className="settings__label" htmlFor="api-key">
              <span>API Key de Wallhaven (opcional)</span>
              <span className="settings__hint">
                Desbloquea NSFW/Sketchy y mejores límites de resultados.{" "}
                <a href="https://wallhaven.cc/settings/account" target="_blank" rel="noreferrer">
                  Consigue la tuya aquí
                </a>
              </span>
            </label>
            <input
              id="api-key"
              className="settings__input"
              type="password"
              value={settings.apiKey ?? ""}
              onChange={onApiKeyChange}
              placeholder="Pega tu API key aquí"
              autoComplete="off"
            />
          </div>
        </div>
      </section>

      <section className="settings__group" aria-labelledby="s-storage">
        <h2 id="s-storage" className="settings__heading">Almacenamiento</h2>
        <div className="settings__card">
          <div className="settings__row">
            <div className="settings__label">
              <span>
                {storageInfo
                  ? `${storageInfo.count} wallpapers guardados`
                  : "Calculando…"}
              </span>
              {storageInfo && <span className="settings__hint">{formatBytes(storageInfo.totalBytes)} en disco</span>}
            </div>
            <button type="button" className="btn btn--danger" onClick={onClearStorage}>
              <BrushCleaning size={14} aria-hidden />
              Limpiar almacenamiento
            </button>
          </div>
        </div>
      </section>

      <section className="settings__group" aria-labelledby="s-pro">
        <h2 id="s-pro" className="settings__heading">Wallflow Pro</h2>
        <div className="settings__card settings__card--locked">
          <LockedFeature
            icon={<RefreshCw size={16} />}
            title="Rotación automática"
            description="Cambia el wallpaper cada cierto tiempo."
          />
          <LockedFeature
            icon={<Monitor size={16} />}
            title="Multi-monitor"
            description="Un wallpaper distinto para cada pantalla."
          />
          <LockedFeature
            icon={<Layers size={16} />}
            title="Colecciones"
            description="Organiza tus favoritos en colecciones."
          />
        </div>
      </section>

      <p className="settings__footer">Funciona con Wallhaven, museos y NASA</p>
    </div>
  );
}
