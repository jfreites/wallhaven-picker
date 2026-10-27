import { fetch } from "@tauri-apps/plugin-http";
import { Command } from "@tauri-apps/plugin-shell";
import { homeDir } from "@tauri-apps/api/path";
import { convertFileSrc } from "@tauri-apps/api/core";
import { mkdir, exists, readDir , writeFile, stat, remove } from "@tauri-apps/plugin-fs";
import { primaryMonitor } from "@tauri-apps/api/window";

export type SortingPreset = "date_added" | "hot" | "toplist" | "random";

export interface Wallpaper {
  id: string;
  path: string;
  thumbs: { small: string; original: string };
  resolution: string;
}

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
}

export async function listLocalWallpapers(): Promise<LocalWallpaper[]> {
  const dir = await ensureAppFolder();

  const entries = await readDir(dir);
  return entries
    .filter((e) => !e.isDirectory)
    .map((e) => {
      const fullPath = `${dir}/${e.name}`;
      return {
        name: e.name!,
        path: fullPath,
        url: convertFileSrc(fullPath),
      };
    });
}

export async function searchWallpapers(
  query: string,
  atleast?: string,
  sorting: SortingPreset = "date_added",
  page: number = 1,
  apiKey?: string
): Promise<Wallpaper[]> {
  const params = new URLSearchParams({
    q: query,
    sorting,
    page: String(page),
  });
  if (atleast) params.set("atleast", atleast);
  if (apiKey) params.set("apikey", apiKey);

  const res = await fetch(
    `https://wallhaven.cc/api/v1/search?${params.toString()}`
  );
  const json = await res.json();
  return json.data;
}

export async function ensureAppFolder(): Promise<string> {
  const home = await homeDir();
  const appDir = `${home}/WallhavenPicker`;
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

export async function setWallpaper(wallpaper: Wallpaper): Promise<void> {
  const dir = await ensureAppFolder();

  // Download the image
  const res = await fetch(wallpaper.path);
  const arrayBuffer = await res.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);

  const ext = wallpaper.path.split(".").pop();
  const filePath = `${dir}/wallhaven-${wallpaper.id}.${ext}`;

  await writeFile(filePath, bytes);
  await applyWallpaperFromPath(filePath);
}

// Descarga el wallpaper al almacenamiento local sin aplicarlo.
export async function saveWallpaper(wallpaper: Wallpaper): Promise<void> {
  const dir = await ensureAppFolder();
  const res = await fetch(wallpaper.path);
  const bytes = new Uint8Array(await res.arrayBuffer());
  const ext = wallpaper.path.split(".").pop();
  await writeFile(`${dir}/wallhaven-${wallpaper.id}.${ext}`, bytes);
}

export async function applyLocalWallpaper(filePath: string): Promise<void> {
  await applyWallpaperFromPath(filePath);
}

export async function deleteLocalWallpaper(filePath: string): Promise<void> {
  await remove(filePath);
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
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}