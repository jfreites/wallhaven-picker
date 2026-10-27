import { sourceJson } from "./http";
import type { SearchFilters, SearchResult, WallpaperSource } from "./types";

const NAME = "Wallhaven";
const API = "https://wallhaven.cc/api/v1/search";

interface RawWallhaven {
  id: string;
  url: string;
  path: string;
  dimension_x: number;
  dimension_y: number;
  thumbs: { small: string; original: string };
}

interface RawResponse {
  data: RawWallhaven[];
  meta: { current_page: number; last_page: number };
}

async function search(query: string, page: number, filters: SearchFilters): Promise<SearchResult> {
  const params = new URLSearchParams({
    q: query,
    sorting: filters.sorting ?? "date_added",
    page: String(page),
  });
  if (filters.atleast) params.set("atleast", filters.atleast);
  if (filters.colors) params.set("colors", filters.colors);
  if (filters.apiKey) params.set("apikey", filters.apiKey);

  const json = await sourceJson<RawResponse>(NAME, `${API}?${params.toString()}`);
  return {
    items: json.data.map((w) => ({
      id: w.id,
      sourceId: "wallhaven",
      thumbUrl: w.thumbs.small,
      previewUrl: w.thumbs.original,
      fullUrl: w.path,
      width: w.dimension_x,
      height: w.dimension_y,
      pageUrl: w.url,
    })),
    hasMore: json.meta.current_page < json.meta.last_page,
  };
}

export const wallhaven: WallpaperSource = {
  id: "wallhaven",
  name: NAME,
  requiresApiKey: false, // opcional: desbloquea NSFW/Sketchy y mejores límites
  capabilities: { search: true, featured: true, resolutionFilter: true, colorFilter: true, sorting: true },
  emptyHint: "Prueba con otra palabra clave o cambia el orden.",
  search,
  // Sin búsqueda, Wallhaven lista según el orden elegido (Latest/Hot/Toplist/Random).
  featured: (page, filters) => search("", page, filters),
};
