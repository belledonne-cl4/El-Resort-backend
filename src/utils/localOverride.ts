/**
 * Reglas compartidas de "override local + respaldo Cloudbeds", usadas en cualquier campo
 * que el dashboard vuelva editable localmente (nombre, descripción, huéspedes, etc.) mientras
 * Cloudbeds siga siendo la fuente de verdad para lo que todavía no se migra.
 */

/** Un `local` vacío/no seteado cae al valor de Cloudbeds; un local con contenido siempre gana. */
export const preferLocalText = (
  local: string | undefined,
  fallback: string | undefined
): string | undefined => {
  const trimmed = (local ?? "").trim();
  return trimmed.length > 0 ? trimmed : fallback;
};

/** Un `local` null/no seteado cae al valor de Cloudbeds; cualquier número finito local gana. */
export const preferLocalNumber = (
  local: number | null | undefined,
  fallback: number | undefined
): number | undefined => (typeof local === "number" && Number.isFinite(local) ? local : fallback);
