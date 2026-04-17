export type IzipayConfig = {
  username: string;
  password: string;
  publicKey: string;
  createPaymentUrl: string;
  hmacSha256: string;
  timeoutMs: number;
};

const requireNonEmpty = (value: string | undefined, envName: string): string => {
  const v = typeof value === "string" ? value.trim() : "";
  if (!v) throw new Error(`${envName} no está definido`);
  return v;
};

const normalizeHttpsUrl = (rawUrl: string, envName: string): string => {
  let u: URL;
  try {
    u = new URL(rawUrl);
  } catch {
    throw new Error(`${envName} no es una URL válida`);
  }
  if (u.protocol !== "https:") throw new Error(`${envName} debe usar https`);
  if (!u.hostname) throw new Error(`${envName} no es una URL válida`);
  return u.toString();
};

export const getIzipayResortConfigFromEnv = (): IzipayConfig => {
  const username = requireNonEmpty(process.env.IZIPAY_USERNAME_RESORT, "IZIPAY_USERNAME_RESORT");
  const password = requireNonEmpty(process.env.IZIPAY_PASSWORD_RESORT, "IZIPAY_PASSWORD_RESORT");
  const publicKey = requireNonEmpty(process.env.IZIPAY_PUBLIC_KEY_RESORT, "IZIPAY_PUBLIC_KEY_RESORT");
  const hmacSha256 = requireNonEmpty(process.env.IZIPAY_HMAC_SHA256_RESORT, "IZIPAY_HMAC_SHA256_RESORT");
  const createPaymentUrl = normalizeHttpsUrl(
    requireNonEmpty(process.env.IZIPAY_CREATE_PAYMENT_PATH_RESORT, "IZIPAY_CREATE_PAYMENT_PATH_RESORT"),
    "IZIPAY_CREATE_PAYMENT_PATH_RESORT"
  );
  const timeoutMs = Number(process.env.IZIPAY_TIMEOUT_MS || 15000);

  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) throw new Error("IZIPAY_TIMEOUT_MS debe ser un número > 0");

  return {
    username,
    password,
    publicKey,
    createPaymentUrl,
    hmacSha256,
    timeoutMs,
  };
};
