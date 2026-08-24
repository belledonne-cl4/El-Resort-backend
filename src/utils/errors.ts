export type HttpError = Error & { status: number };

/** Crea un Error con un `status` HTTP adjunto, para que el controller lo mapee directo a la respuesta. */
export const toHttpError = (status: number, message: string): HttpError => {
  const error = new Error(message) as HttpError;
  error.status = status;
  return error;
};

/** Extrae el `status` HTTP de un error desconocido (p. ej. uno creado por `toHttpError`), o usa el fallback. */
export const getErrorStatus = (error: unknown, fallback = 500): number => {
  const status = (error as { status?: unknown })?.status;
  return typeof status === "number" ? status : fallback;
};
