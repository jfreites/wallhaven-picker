export type SourceId = string;

export type SortingPreset = "date_added" | "hot" | "toplist" | "random";

/** Modelo normalizado: descarga, Mis Wallpapers y aplicar solo conocen este tipo. */
export interface Wallpaper {
  id: string;
  sourceId: SourceId;
  thumbUrl: string;
  /** Imagen intermedia para el slideshow (evita bajar la completa solo para ver). */
  previewUrl: string;
  fullUrl: string;
  /** 0 si la fuente aún no conoce las dimensiones (ver `resolveFull`). */
  width: number;
  height: number;
  pageUrl: string;
  author?: string;
  authorUrl?: string;
  license?: string;
}

export interface SearchFilters {
  sorting?: SortingPreset;
  /** Resolución mínima "WxH". Solo si la fuente soporta resolutionFilter. */
  atleast?: string;
  /** Color hex sin "#". Solo si la fuente soporta colorFilter. */
  colors?: string;
  apiKey?: string;
}

export interface SearchResult {
  items: Wallpaper[];
  hasMore: boolean;
}

export interface SourceCapabilities {
  search: boolean;
  featured: boolean;
  resolutionFilter: boolean;
  colorFilter: boolean;
  sorting: boolean;
}

export interface WallpaperSource {
  id: SourceId;
  name: string;
  requiresApiKey: boolean;
  capabilities: SourceCapabilities;
  /** Mensaje del estado "cero resultados", específico de la fuente. */
  emptyHint: string;
  /** Headers que la fuente exige al descargar sus imágenes. */
  requestHeaders?: Record<string, string>;
  search(query: string, page: number, filters: SearchFilters): Promise<SearchResult>;
  /** Contenido a mostrar cuando no hay búsqueda. */
  featured?(page: number, filters: SearchFilters): Promise<SearchResult>;
  /**
   * Completa lo que la búsqueda no trae (URL de alta resolución, dimensiones).
   * Se llama solo al abrir el slideshow, descargar o aplicar; nunca para todo el grid.
   */
  resolveFull?(wallpaper: Wallpaper): Promise<Wallpaper>;
}
