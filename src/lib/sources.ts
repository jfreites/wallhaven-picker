export type SourceId = "wallhaven" | "museums" | "nasa";

export interface WallpaperSource {
  id: SourceId;
  label: string;
  enabled: boolean;
}

// Solo Wallhaven está implementado; el resto es el espacio reservado en el selector.
export const SOURCES: WallpaperSource[] = [
  { id: "wallhaven", label: "Wallhaven", enabled: true },
  { id: "museums", label: "Museos", enabled: false },
  { id: "nasa", label: "NASA", enabled: false },
];

export interface Attribution {
  source: string;
  author?: string;
}
