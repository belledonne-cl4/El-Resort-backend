export type TranslateConfig = {
  host: string;
  timeoutMs: number;
};

export const getTranslateConfigFromEnv = (): TranslateConfig => {
  const host = (process.env.GOOGLE_TRANSLATE_HOST || "translate.google.com").trim() || "translate.google.com";
  const timeoutMs = Number(process.env.GOOGLE_TRANSLATE_TIMEOUT_MS || 10000);

  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new Error("GOOGLE_TRANSLATE_TIMEOUT_MS debe ser un numero > 0");
  }

  return {
    host,
    timeoutMs,
  };
};
