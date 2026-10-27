import { sourceFetch, sourceJson } from "./http";
import type { SearchResult, Wallpaper, WallpaperSource } from "./types";

const NAME = "NASA";
const API = "https://images-api.nasa.gov";
const DETAILS = "https://images.nasa.gov/details";
const PAGE_SIZE = 100;

// Con dimensiones conocidas en la búsqueda, solo pasan imágenes horizontales y grandes.
const MIN_WIDTH = 1920;
const MIN_RATIO = 1.3; // ancho / alto

// Sin búsqueda se muestra uno de estos términos, elegido al azar al empezar.
const FEATURED_TERMS = ["hubble", "james webb", "nebula", "earth from space", "galaxy"];

// Logos, insignias, eventos, personas y fotos de prensa. Se evalúa sobre título y keywords.
// Frases acotadas a propósito: palabras sueltas como "portrait" o "crew" descartarían
// imágenes científicas válidas ("Hubble Portrait of Jupiter").
const JUNK =
  /\b(logos?|insignias?|emblems?|badges?|mission patch|patch|crest|town hall|panel|press conference|news conference|press briefing|media briefing|briefing|ceremony|awards?|awarded|reception|meeting|visits?|visiting|tour|signing|interviews?|workshop|symposium|employees?|technicians?|engineers?|administrator|congress\w*|senators?|secretary|president|dignitar\w*|speakers?|keynote|ribbon[- ]cutting|groundbreaking|media day|press release|photo ?op|official portrait|crew portrait|group photo|team photo|class photo|fact sheet|infographic|poster|chart|diagram|graph|slide|webcast|livestream|workforce|hall of fame|plaque|exhibit|booth|gala|banquet|conference|forum|lecture|talk)\b/i;

// Códigos de centro de la NASA -> nombre legible para la atribución.
const CENTERS: Record<string, string> = {
  ARC: "Ames Research Center",
  AFRC: "Armstrong Flight Research Center",
  GRC: "Glenn Research Center",
  GSFC: "Goddard Space Flight Center",
  HQ: "NASA Headquarters",
  JPL: "Jet Propulsion Laboratory",
  JSC: "Johnson Space Center",
  KSC: "Kennedy Space Center",
  LARC: "Langley Research Center",
  MSFC: "Marshall Space Flight Center",
  SSC: "Stennis Space Center",
};

interface RawLink {
  href: string;
  rel: string;
  width?: number;
  height?: number;
}

interface RawItem {
  data: {
    nasa_id: string;
    title?: string;
    center?: string;
    photographer?: string;
    secondary_creator?: string;
    keywords?: string[];
  }[];
  links?: RawLink[];
}

interface RawSearch {
  collection: { items: RawItem[]; links?: { rel: string }[] };
}

interface RawManifest {
  collection: { items: { href: string }[] };
}

type Variant = "orig" | "large" | "medium" | "small" | "thumb";

const toHttps = (url: string) => url.replace(/^http:\/\//, "https://");
const variantOf = (href: string) => href.match(/~(orig|large|medium|small|thumb)\.\w+$/)?.[1] as Variant | undefined;
const isWebImage = (href: string) => /\.(jpe?g|png)$/i.test(href);

/** Prefiere orig; si no es JPG/PNG o no existe, large y luego medium. */
function pickFull<T extends { href: string }>(variants: Partial<Record<Variant, T>>): T | undefined {
  const orig = variants.orig;
  if (orig && isWebImage(orig.href)) return orig;
  return variants.large ?? variants.medium ?? orig;
}

function normalize(item: RawItem): Wallpaper | null {
  const d = item.data[0];
  if (!d?.nasa_id) return null;
  if (JUNK.test(`${d.title ?? ""} | ${(d.keywords ?? []).join(" | ")}`)) return null;

  const variants: Partial<Record<Variant, RawLink>> = {};
  for (const l of item.links ?? []) {
    const v = variantOf(l.href);
    if (v) variants[v] = { ...l, href: toHttps(l.href) };
  }
  const thumb = variants.thumb ?? variants.small ?? variants.medium;
  if (!thumb) return null;

  // La búsqueda ya incluye la URL (y casi siempre las dimensiones) de cada variante.
  const full = pickFull(variants);
  const width = full?.width ?? 0;
  const height = full?.height ?? 0;
  if (width && width < MIN_WIDTH) return null;

  // Aunque el original no traiga dimensiones, las demás variantes conservan su proporción.
  const sized = [variants.orig, variants.large, variants.medium, variants.small, variants.thumb].find(
    (l) => l?.width && l?.height,
  );
  if (sized && sized.width! / sized.height! < MIN_RATIO) return null;

  const author = d.photographer || d.secondary_creator || CENTERS[(d.center ?? "").toUpperCase()] || d.center;
  return {
    id: d.nasa_id,
    sourceId: "nasa",
    thumbUrl: thumb.href,
    previewUrl: (variants.medium ?? variants.large ?? variants.small ?? thumb).href,
    fullUrl: full?.href ?? "",
    width,
    height,
    pageUrl: `${DETAILS}/${encodeURIComponent(d.nasa_id)}`,
    author: author || undefined,
    license: "Pautas de uso de medios de la NASA",
  };
}

async function fetchPage(term: string, page: number): Promise<SearchResult> {
  const params = new URLSearchParams({ q: term, media_type: "image", page: String(page), page_size: String(PAGE_SIZE) });
  const json = await sourceJson<RawSearch>(NAME, `${API}/search?${params}`);
  return {
    items: json.collection.items.map(normalize).filter((w): w is Wallpaper => w !== null),
    hasMore: !!json.collection.links?.some((l) => l.rel === "next"),
  };
}

let featuredTerm = FEATURED_TERMS[0];

async function featured(page: number): Promise<SearchResult> {
  // Al empezar (página 1) se sortea el término; las páginas siguientes siguen con el mismo.
  if (page === 1) featuredTerm = FEATURED_TERMS[Math.floor(Math.random() * FEATURED_TERMS.length)];
  return fetchPage(featuredTerm, page);
}

// La API exige al menos un parámetro de búsqueda: sin texto se muestra lo destacado.
const search = (query: string, page: number): Promise<SearchResult> =>
  query ? fetchPage(query, page) : featured(page);

/** Dimensiones desde la cabecera de un JPEG o PNG; null si no alcanzan los bytes recibidos. */
export function parseImageSize(b: Uint8Array): [number, number] | null {
  const u16 = (i: number) => (b[i] << 8) | b[i + 1];
  const u32 = (i: number) => ((b[i] << 24) | (b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]) >>> 0;
  if (b.length > 24 && b[0] === 0x89 && b[1] === 0x50) return [u32(16), u32(20)]; // PNG: IHDR
  if (b[0] !== 0xff || b[1] !== 0xd8) return null;
  let i = 2;
  while (i + 9 < b.length) {
    if (b[i] !== 0xff) return null;
    const marker = b[i + 1];
    if (marker === 0xff) { i++; continue; } // relleno
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return [u16(i + 7), u16(i + 5)]; // SOF: ancho, alto
    }
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd9)) { i += 2; continue; }
    i += 2 + u16(i + 2);
  }
  return null;
}

// Pide solo el inicio del archivo (Range) para leer su tamaño sin bajar el original completo.
async function probeImageSize(url: string): Promise<[number, number] | null> {
  for (const bytes of [64 * 1024, 512 * 1024]) {
    const res = await sourceFetch(NAME, url, { headers: { Range: `bytes=0-${bytes - 1}` } });
    if (res.status !== 206) return null; // sin soporte de Range: no bajar el archivo entero
    const size = parseImageSize(new Uint8Array(await res.arrayBuffer()));
    if (size) return size;
  }
  return null;
}

const resolved = new Map<string, Promise<Wallpaper>>();

async function resolve(w: Wallpaper): Promise<Wallpaper> {
  let { fullUrl, previewUrl, width, height } = w;

  // Respaldo: sin URL completa en la búsqueda, se pide el manifiesto de assets.
  if (!fullUrl) {
    const manifest = await sourceJson<RawManifest>(NAME, `${API}/asset/${encodeURIComponent(w.id)}`);
    const variants: Partial<Record<Variant, { href: string }>> = {};
    for (const { href } of manifest.collection.items) {
      const v = variantOf(href);
      if (v) variants[v] = { href: toHttps(href) };
    }
    fullUrl = pickFull(variants)?.href ?? "";
    previewUrl = (variants.medium ?? variants.large ?? variants.small)?.href ?? previewUrl;
  }

  // La búsqueda no trae las dimensiones del ~33 % de las imágenes y su metadata.json tampoco:
  // se leen de la cabecera del archivo.
  if (fullUrl && !width) {
    try {
      [width, height] = (await probeImageSize(fullUrl)) ?? [0, 0];
    } catch {
      // Sin dimensiones se sigue adelante: no es motivo para bloquear descargar o aplicar.
    }
  }

  return { ...w, fullUrl, previewUrl, width, height };
}

// Cache en memoria de lo ya resuelto; un fallo no se cachea.
function resolveFull(w: Wallpaper): Promise<Wallpaper> {
  let hit = resolved.get(w.id);
  if (!hit) {
    hit = resolve(w).catch((err) => {
      resolved.delete(w.id);
      throw err;
    });
    resolved.set(w.id, hit);
  }
  return hit;
}

export const nasa: WallpaperSource = {
  id: "nasa",
  name: NAME,
  requiresApiKey: false,
  capabilities: { search: true, featured: true, resolutionFilter: false, colorFilter: false, sorting: false },
  emptyHint: "El catálogo de la NASA está en inglés: prueba con “mars”, “nebula” o “apollo”.",
  search,
  featured,
  resolveFull,
};
