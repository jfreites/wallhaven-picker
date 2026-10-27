import { useEffect, useRef, useState } from "react";
import { sourceFetch } from "../sources/http";
import { getSource } from "../sources";

// Las <img> del webview no pueden enviar headers. Si la fuente exige uno
// (requestHeaders), la imagen se baja con plugin-http y se muestra como blob.

const BLANK = "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";
const MAX_CONCURRENT = 6;
const MAX_CACHED = 300;

const cache = new Map<string, Promise<string>>();
const queue: (() => void)[] = [];
let active = 0;

function pump() {
  while (active < MAX_CONCURRENT && queue.length) {
    active++;
    queue.shift()!();
  }
}

function fetchBlobUrl(sourceId: string, src: string): Promise<string> {
  const hit = cache.get(src);
  if (hit) return hit;

  const source = getSource(sourceId);
  const promise = new Promise<string>((resolve, reject) => {
    queue.push(() => {
      sourceFetch(source.name, src, { headers: source.requestHeaders })
        .then(async (res) => {
          const type = res.headers.get("content-type") ?? "image/jpeg";
          resolve(URL.createObjectURL(new Blob([await res.arrayBuffer()], { type })));
        })
        .catch((err) => {
          cache.delete(src); // permitir reintento
          reject(err);
        })
        .finally(() => {
          active--;
          pump();
        });
    });
    pump();
  });

  cache.set(src, promise);
  if (cache.size > MAX_CACHED) {
    const [oldest] = cache.keys();
    cache.get(oldest)?.then(URL.revokeObjectURL).catch(() => {});
    cache.delete(oldest);
  }
  return promise;
}

interface SourceImageProps {
  src: string;
  /** Fuente de la imagen; sin ella se usa un <img> normal. */
  sourceId?: string;
  alt: string;
  className?: string;
  /** Cargar de inmediato en vez de esperar a que sea visible. */
  eager?: boolean;
  onLoad?: () => void;
}

export function SourceImage({ src, sourceId, alt, className, eager, onLoad }: SourceImageProps) {
  const needsFetch = !!sourceId && !!getSource(sourceId).requestHeaders;
  const ref = useRef<HTMLImageElement>(null);
  const [visible, setVisible] = useState(!!eager);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!needsFetch || visible || !ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => entry.isIntersecting && setVisible(true),
      { rootMargin: "200px" },
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [needsFetch, visible]);

  useEffect(() => {
    if (!needsFetch || !visible) return;
    let cancelled = false;
    setBlobUrl(null);
    fetchBlobUrl(sourceId!, src)
      .then((url) => !cancelled && setBlobUrl(url))
      .catch((err) => console.error("No se pudo cargar la imagen", err));
    return () => {
      cancelled = true;
    };
  }, [needsFetch, visible, sourceId, src]);

  if (!needsFetch) {
    return <img className={className} src={src} alt={alt} loading="lazy" draggable={false} onLoad={onLoad} />;
  }
  return (
    <img
      ref={ref}
      className={className}
      src={blobUrl ?? BLANK}
      alt={blobUrl ? alt : ""}
      draggable={false}
      onLoad={blobUrl ? onLoad : undefined}
    />
  );
}
