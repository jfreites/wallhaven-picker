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
