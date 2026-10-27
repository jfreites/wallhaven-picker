import type { SourceId, WallpaperSource } from "./types";
import { wallhaven } from "./wallhaven";
import { artic } from "./artic";
import { nasa } from "./nasa";

/** Para sumar una fuente: importarla aquí y agregarla a la lista. */
export const SOURCES: WallpaperSource[] = [wallhaven, artic, nasa];

export const DEFAULT_SOURCE_ID: SourceId = SOURCES[0].id;

export function getSource(id: SourceId | undefined): WallpaperSource {
  return SOURCES.find((s) => s.id === id) ?? SOURCES[0];
}

export type { Wallpaper, WallpaperSource, SearchFilters, SortingPreset, SourceId } from "./types";
export { SourceError, describeError } from "./errors";
