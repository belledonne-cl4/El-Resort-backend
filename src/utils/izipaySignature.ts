import crypto from "crypto";

const asNonEmptyString = (value: unknown): string | undefined => {
  if (typeof value !== "string") return undefined;
  const v = value.trim();
  return v.length ? v : undefined;
};

export const calculateIzipayHash = (answer: string, key: string): string => {
  return crypto.createHmac("sha256", key).update(answer, "utf8").digest("hex");
};

export const checkIzipayHash = (body: Record<string, unknown>, key: string): boolean => {
  const answer = asNonEmptyString(body["kr-answer"]);
  const received = asNonEmptyString(body["kr-hash"]);
  if (!answer || !received) return false;

  const calculated = calculateIzipayHash(answer, key);
  // Comparación en minúsculas para tolerar variaciones de casing en hex.
  return calculated.toLowerCase() === received.toLowerCase();
};

export const parseIzipayAnswerJson = (body: Record<string, unknown>): Record<string, unknown> => {
  const answerRaw = asNonEmptyString(body["kr-answer"]);
  if (!answerRaw) throw new Error("kr-answer es requerido");

  let parsed: unknown;
  try {
    parsed = JSON.parse(answerRaw);
  } catch {
    throw new Error("kr-answer no es JSON válido");
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("kr-answer no es JSON objeto");
  return parsed as Record<string, unknown>;
};

