import { sourceFetch } from "../sources/http";
import { getSource, SourceError } from "../sources";
import type { Wallpaper } from "../sources";
import { getLibrary, recordWallpaper, forgetWallpaper, clearLibrary } from "./library";
import { Command } from "@tauri-apps/plugin-shell";
import { homeDir } from "@tauri-apps/api/path";
import { convertFileSrc } from "@tauri-apps/api/core";
import { mkdir, exists, readDir , writeFile, stat, remove } from "@tauri-apps/plugin-fs";
import { primaryMonitor } from "@tauri-apps/api/window";

export async function getPrimaryResolution(): Promise<string | null> {
  const monitor = await primaryMonitor();
  if (!monitor) return null;

  const { width, height } = monitor.size;
  return `${width}x${height}`;
}

export interface LocalWallpaper {
  name: string;
  path: string;
  url: string; // URL usable for <img src>
  /** Metadatos de origen, si el archivo se descargó desde Wallflow. */
  wallpaper?: Wallpaper;
}

export async function listLocalWallpapers(): Promise<LocalWallpaper[]> {
  const dir = await ensureAppFolder();

  const [entries, library] = await Promise.all([readDir(dir), getLibrary()]);
  return entries
    .filter((e) => !e.isDirectory)
    .map((e) => {
      const fullPath = `${dir}/${e.name}`;
      return {
        name: e.name!,
        path: fullPath,
        url: convertFileSrc(fullPath),
        wallpaper: library[e.name!],
      };
    });
}

export async function ensureAppFolder(): Promise<string> {
  const home = await homeDir();
  const appDir = `${home}/Wallflow`;
  const wallpapersDir = `${appDir}/Wallpapers`;

  if (!(await exists(wallpapersDir))) {
    await mkdir(wallpapersDir, { recursive: true });
  }

  return wallpapersDir;
}

async function applyWallpaperFromPath(filePath: string): Promise<void> {
  // Apply as wallpaper via AppleScript
  const script = `tell application "System Events" to tell every desktop to set picture to "${filePath}"`;
  const command = Command.create("osascript", ["-e", script]);
  await command.execute();
}

// Descarga la imagen completa al almacenamiento local. Devuelve un aviso opcional.
async function downloadWallpaper(wallpaper: Wallpaper): Promise<{ path: string; warning?: string }> {
  const dir = await ensureAppFolder();
  const source = getSource(wallpaper.sourceId);

  // Fuentes que solo conocen URL final y dimensiones al resolver: validar antes de bajar nada.
  let warning: string | undefined;
  if (source.resolveFull) {
    wallpaper = await source.resolveFull(wallpaper);
    if (wallpaper.width && wallpaper.height > wallpaper.width) {
      throw new SourceError("unsuitable", source.name);
    }
    warning = await undersizedWarning(wallpaper);
  }

  const res = await sourceFetch(source.name, wallpaper.fullUrl, { headers: source.requestHeaders });
  const bytes = new Uint8Array(await res.arrayBuffer());

  const ext = wallpaper.fullUrl.split(".").pop();
  const fileName = `${wallpaper.sourceId}-${wallpaper.id.replace(/[^\w.-]+/g, "_")}.${ext}`;

  await writeFile(`${dir}/${fileName}`, bytes);
  await recordWallpaper(fileName, wallpaper);
  return { path: `${dir}/${fileName}`, warning };
}

export async function undersizedWarning(w: Wallpaper): Promise<string | undefined> {
  const screen = await getPrimaryResolution();
  if (!screen || !w.width) return undefined;
  const [sw, sh] = screen.split("x").map(Number);
  return w.width < sw || w.height < sh
    ? `Es menor que tu pantalla (${w.width}×${w.height} vs ${sw}×${sh})`
    : undefined;
}

/** Aplica el wallpaper; devuelve un aviso si la imagen no es ideal para la pantalla. */
export async function setWallpaper(wallpaper: Wallpaper): Promise<string | undefined> {
  const { path, warning } = await downloadWallpaper(wallpaper);
  await applyWallpaperFromPath(path);
  return warning;
}

// Descarga el wallpaper al almacenamiento local sin aplicarlo.
export async function saveWallpaper(wallpaper: Wallpaper): Promise<string | undefined> {
  return (await downloadWallpaper(wallpaper)).warning;
}

export async function applyLocalWallpaper(filePath: string): Promise<void> {
  await applyWallpaperFromPath(filePath);
}

export async function deleteLocalWallpaper(filePath: string): Promise<void> {
  await remove(filePath);
  await forgetWallpaper(filePath.split("/").pop()!);
}

export async function getStorageInfo(): Promise<{ count: number; totalBytes: number }> {
  const dir = await ensureAppFolder();
  const entries = await readDir(dir);
  const files = entries.filter((e) => !e.isDirectory);

  let totalBytes = 0;
  for (const file of files) {
    const info = await stat(`${dir}/${file.name}`);
    totalBytes += info.size;
  }

  return { count: files.length, totalBytes };
}

export async function clearStorage(): Promise<void> {
  const dir = await ensureAppFolder();
  const entries = await readDir(dir);
  const files = entries.filter((e) => !e.isDirectory);

  for (const file of files) {
    await remove(`${dir}/${file.name}`);
  }
  await clearLibrary();
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}