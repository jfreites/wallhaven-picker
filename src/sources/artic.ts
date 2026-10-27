import { sourceJson } from "./http";
import type { SearchFilters, SearchResult, Wallpaper, WallpaperSource } from "./types";

const NAME = "Art Institute of Chicago";
const API = "https://api.artic.edu/api/v1/artworks/search";
const IIIF = "https://www.artic.edu/iiif/2";
const WEBSITE = "https://www.artic.edu";

// La API pide identificar a la app con este header (no tiene API key).
const HEADERS = { "AIC-User-Agent": "Wallflow/0.1 (macOS wallpaper app)" };

// Solo imágenes aptas como wallpaper: grandes y horizontales.
const MIN_WIDTH = 2560;
const MIN_HEIGHT = 1440;
const MIN_RATIO = 1.3; // ancho / alto
// Máximo ancho que pedimos; el IIIF redirige a 843 px si se pide más que el original.
const MAX_FULL_WIDTH = 3840;
const PAGE_SIZE = 100;

// Campos donde buscar el texto. Va dentro de `query` como condición obligatoria:
// el parámetro `q` de la API solo refuerza el ranking y devuelve todo el catálogo sin coincidencias.
const SEARCH_FIELDS = [
  "title^4",
  "artist_title^3",
  "subject_titles^2",
  "style_title^2",
  "classification_title",
  "category_titles",
  "place_of_origin",
  "description",
  "short_description",
];

interface RawArtwork {
  id: number;
  image_id: string;
  artist_id: number | null;
  artist_title: string | null;
  thumbnail: { width: number; height: number } | null;
}

interface RawResponse {
  data: RawArtwork[];
  pagination: { current_page: number; total_pages: number };
}

const iiif = (imageId: string, width: number) => `${IIIF}/${imageId}/full/${width},/0/default.jpg`;

function normalize(a: RawArtwork): Wallpaper | null {
  if (!a.image_id || !a.thumbnail) return null;
  const { width, height } = a.thumbnail;
  if (width < MIN_WIDTH || height < MIN_HEIGHT || width / height < MIN_RATIO) return null;

  return {
    id: String(a.id),
    sourceId: "artic",
    thumbUrl: iiif(a.image_id, 400),
    previewUrl: iiif(a.image_id, 843),
    fullUrl: iiif(a.image_id, Math.min(width, MAX_FULL_WIDTH)),
    width,
    height,
    pageUrl: `${WEBSITE}/artworks/${a.id}`,
    author: a.artist_title ?? undefined,
    authorUrl: a.artist_id ? `${WEBSITE}/artists/${a.artist_id}` : undefined,
    license: "Dominio público (CC0)",
  };
}

async function search(query: string, page: number, _filters: SearchFilters): Promise<SearchResult> {
  const body = {
    query: {
      bool: {
        ...(query
          ? { must: [{ multi_match: { query, fields: SEARCH_FIELDS, operator: "and" } }] }
          : {}),
        filter: [
          { term: { is_public_domain: true } },
          { exists: { field: "image_id" } },
          { range: { "thumbnail.width": { gte: MIN_WIDTH } } },
          { range: { "thumbnail.height": { gte: MIN_HEIGHT } } },
        ],
      },
    },
    fields: ["id", "image_id", "artist_id", "artist_title", "thumbnail.width", "thumbnail.height"],
    limit: PAGE_SIZE,
    page,
  };

  const json = await sourceJson<RawResponse>(NAME, API, {
    method: "POST",
    headers: { ...HEADERS, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  return {
    items: json.data.map(normalize).filter((w): w is Wallpaper => w !== null),
    hasMore: json.pagination.current_page < json.pagination.total_pages,
  };
}

export const artic: WallpaperSource = {
  id: "artic",
  name: NAME,
  requiresApiKey: false,
  capabilities: { search: true, featured: true, resolutionFilter: false, colorFilter: false, sorting: false },
  emptyHint: "El catálogo del museo está en inglés: prueba con “landscape”, “water lilies” o “Monet”.",
  requestHeaders: HEADERS,
  search,
  featured: (page, filters) => search("", page, filters),
};
