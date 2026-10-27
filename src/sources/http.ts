import { fetch } from "@tauri-apps/plugin-http";
import { SourceError } from "./errors";

/** fetch que traduce fallos de red y códigos HTTP a SourceError, igual para todas las fuentes. */
export async function sourceFetch(sourceName: string, url: string, init?: RequestInit): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch {
    throw new SourceError("offline", sourceName);
  }
  if (res.ok) return res;
  if (res.status === 429) {
    const retry = Number(res.headers.get("retry-after"));
    throw new SourceError("rate_limit", sourceName, 429, Number.isFinite(retry) && retry > 0 ? retry : undefined);
  }
  if (res.status === 401 || res.status === 403) throw new SourceError("auth", sourceName, res.status);
  throw new SourceError("http", sourceName, res.status);
}

export async function sourceJson<T>(sourceName: string, url: string, init?: RequestInit): Promise<T> {
  const res = await sourceFetch(sourceName, url, init);
  try {
    return (await res.json()) as T;
  } catch {
    throw new SourceError("http", sourceName, res.status);
  }
}
