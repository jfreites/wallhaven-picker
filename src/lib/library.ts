import { load } from "@tauri-apps/plugin-store";
import type { Wallpaper } from "../sources";

// Metadatos (autor, fuente, licencia) de lo descargado, por nombre de archivo,
// para conservar la atribución en "Mis Wallpapers".
const STORE_FILE = "library.json";

async function open() {
  return load(STORE_FILE, { autoSave: true });
}

export async function getLibrary(): Promise<Record<string, Wallpaper>> {
  const store = await open();
  return (await store.get<Record<string, Wallpaper>>("items")) ?? {};
}

async function write(items: Record<string, Wallpaper>) {
  const store = await open();
  await store.set("items", items);
}

export async function recordWallpaper(fileName: string, wallpaper: Wallpaper): Promise<void> {
  await write({ ...(await getLibrary()), [fileName]: wallpaper });
}

export async function forgetWallpaper(fileName: string): Promise<void> {
  const { [fileName]: _removed, ...rest } = await getLibrary();
  await write(rest);
}

export async function clearLibrary(): Promise<void> {
  await write({});
}
