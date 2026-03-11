export type CloudbedsAuthMode = "x-api-key" | "bearer";

export type CloudbedsConfig = {
  baseUrl: string;
  apiKey: string;
  authMode: CloudbedsAuthMode;
  timeoutMs: number;
};

export const getCloudbedsConfigFromEnv = (): CloudbedsConfig => {
  const baseUrl = process.env.CLOUDBEDS_BASE_URL;
  const apiKey = process.env.CLOUDBEDS_API_KEY;
  const authMode = (process.env.CLOUDBEDS_AUTH_MODE as CloudbedsAuthMode | undefined) || "x-api-key";
  const timeoutMs = Number(process.env.CLOUDBEDS_TIMEOUT_MS || 15000);

  if (!baseUrl) throw new Error("CLOUDBEDS_BASE_URL no está definido");
  if (!apiKey) throw new Error("CLOUDBEDS_API_KEY no está definido");
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new Error("CLOUDBEDS_TIMEOUT_MS debe ser un número > 0");
  }
  if (authMode !== "x-api-key" && authMode !== "bearer") {
    throw new Error("CLOUDBEDS_AUTH_MODE debe ser 'x-api-key' o 'bearer'");
  }

  return { baseUrl, apiKey, authMode, timeoutMs };
};

export const buildCloudbedsAuthHeaders = (apiKey: string, authMode: CloudbedsAuthMode): Record<string, string> => {
  if (authMode === "bearer") return { Authorization: `Bearer ${apiKey}` };
  return { "x-api-key": apiKey };
};

