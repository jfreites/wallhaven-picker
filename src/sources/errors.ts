export type SourceErrorKind = "rate_limit" | "offline" | "auth" | "http";

export class SourceError extends Error {
  constructor(
    public kind: SourceErrorKind,
    public sourceName: string,
    public status?: number,
    /** Segundos que pide esperar el servidor (header Retry-After). */
    public retryAfter?: number,
  ) {
    super(`${sourceName}: ${kind}${status ? ` (${status})` : ""}`);
  }
}

export interface ErrorMessage {
  title: string;
  text: string;
}

/** Mensaje uniforme para cualquier error de fuente; `fallbackName` si el error no trae fuente. */
export function describeError(err: unknown, fallbackName = "la fuente"): ErrorMessage {
  if (!(err instanceof SourceError)) {
    return { title: `No se pudo cargar ${fallbackName}`, text: "Ocurrió un error inesperado. Inténtalo de nuevo." };
  }
  const name = err.sourceName;
  switch (err.kind) {
    case "rate_limit":
      return {
        title: `${name} alcanzó su límite de peticiones`,
        text: err.retryAfter
          ? `Espera unos ${err.retryAfter} s e inténtalo de nuevo.`
          : "Espera un minuto e inténtalo de nuevo.",
      };
    case "offline":
      return { title: "Sin conexión", text: `No se pudo contactar a ${name}. Revisa tu conexión a internet.` };
    case "auth":
      return { title: `${name} rechazó la solicitud`, text: "Si usas una API key, revísala en Ajustes." };
    default:
      return {
        title: `No se pudo cargar ${name}`,
        text: `${name} respondió con un error${err.status ? ` (${err.status})` : ""}. Inténtalo de nuevo.`,
      };
  }
}
