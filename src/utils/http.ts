export const pickFirstQueryValue = (value: unknown): string | undefined => {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  return undefined;
};

export const asOptionalString = (value: unknown): string | undefined => {
  const raw = pickFirstQueryValue(value);
  if (raw === undefined) return undefined;
  const trimmed = raw.trim();
  return trimmed.length ? trimmed : undefined;
};

export const asOptionalInt = (value: unknown): number | undefined => {
  const raw = pickFirstQueryValue(value);
  if (raw === undefined) return undefined;
  const trimmed = raw.trim();
  if (!trimmed.length) return undefined;
  const parsed = Number(trimmed);
  if (!Number.isInteger(parsed)) return undefined;
  return parsed;
};

export const asOptionalBoolean = (value: unknown): boolean | undefined => {
  const raw = pickFirstQueryValue(value);
  if (raw === undefined) return undefined;
  const normalized = raw.trim().toLowerCase();
  if (normalized === "true" || normalized === "1") return true;
  if (normalized === "false" || normalized === "0") return false;
  return undefined;
};

export const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export type CloudbedsHttpErrorLike = {
  status?: number;
  message: string;
  request?: unknown;
  responseBody?: unknown;
};

export type CloudbedsErrorPayload = {
  provider: "cloudbeds";
  status?: number;
  message: string;
  request?: unknown;
  data?: unknown;
};

export const formatCloudbedsError = (error: CloudbedsHttpErrorLike): CloudbedsErrorPayload => {
  return {
    provider: "cloudbeds",
    status: error.status,
    message: error.message,
    request: error.request,
    data: error.responseBody,
  };
};
