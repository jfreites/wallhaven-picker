import { load } from "@tauri-apps/plugin-store";

const STORE_FILE = "settings.json";

export interface Settings {
  useResolutionFilter: boolean;
  apiKey?: string;
}

const defaults: Settings = {
  useResolutionFilter: true,
  apiKey: undefined,
};

export async function getSettings(): Promise<Settings> {
  const store = await load(STORE_FILE, { autoSave: true });
  const stored = await store.get<Settings>("settings");
  return { ...defaults, ...stored };
}

export async function saveSettings(settings: Settings): Promise<void> {
  const store = await load(STORE_FILE, { autoSave: true });
  await store.set("settings", settings);
}