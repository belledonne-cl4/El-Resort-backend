export type PaymentTokenConfig = {
  secret: string;
  ttlSeconds: number;
};

const requireNonEmpty = (value: string | undefined, envName: string): string => {
  const v = typeof value === "string" ? value.trim() : "";
  if (!v) throw new Error(`${envName} no está definido`);
  return v;
};

export const getPaymentTokenConfigFromEnv = (): PaymentTokenConfig => {
  const secret = requireNonEmpty(process.env.PAYMENT_TOKEN_SECRET, "PAYMENT_TOKEN_SECRET");
  const ttlSeconds = Number(process.env.PAYMENT_TOKEN_TTL_SECONDS || 600);
  if (!Number.isFinite(ttlSeconds) || ttlSeconds <= 0) throw new Error("PAYMENT_TOKEN_TTL_SECONDS debe ser un número > 0");
  return { secret, ttlSeconds };
};

