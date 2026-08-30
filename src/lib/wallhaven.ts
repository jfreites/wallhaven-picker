import { fetch } from "@tauri-apps/plugin-http";
import { Command } from "@tauri-apps/plugin-shell";
import { homeDir } from "@tauri-apps/api/path";
import { convertFileSrc } from "@tauri-apps/api/core";
import { mkdir, exists, readDir , writeFile } from "@tauri-apps/plugin-fs";

export interface Wallpaper {
  id: string;
  path: string;
  thumbs: { small: string; original: string };
  resolution: string;
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
  atleast?: string
): Promise<Wallpaper[]> {
  const params = new URLSearchParams({ q: query });
  if (atleast) params.set("atleast", atleast);

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

export async function applyLocalWallpaper(filePath: string): Promise<void> {
  await applyWallpaperFromPath(filePath);
}