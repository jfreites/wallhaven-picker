import { getSource } from "../sources";
import type { Wallpaper } from "../sources";

export interface Credit {
  label: string;
  href?: string;
}

/** Autor si existe; si no, la fuente. Enlaza al perfil del autor o a la página de la obra. */
export function creditFor(w: Wallpaper): Credit {
  return { label: w.author ?? getSource(w.sourceId).name, href: w.authorUrl ?? w.pageUrl };
}

/** "1920×1080", o undefined si la fuente aún no conoce las dimensiones. */
export function sizeLabel(w: Pick<Wallpaper, "width" | "height">): string | undefined {
  return w.width ? `${w.width}×${w.height}` : undefined;
}

export function altFor(w: Wallpaper): string {
  return sizeLabel(w) ?? `Imagen de ${getSource(w.sourceId).name}`;
}
