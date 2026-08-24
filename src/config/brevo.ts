export type BrevoConfig = {
  apiKey: string;
  senderEmail: string;
  senderName: string;
  claimCcEmails: string[];
  timeoutMs: number;
};

export const getBrevoConfigFromEnv = (): BrevoConfig => {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL;
  const senderName = process.env.BREVO_SENDER_NAME;
  const claimCcEmails = (process.env.BREVO_CLAIM_CC_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim())
    .filter((email) => email.length > 0);
  const timeoutMs = Number(process.env.BREVO_TIMEOUT_MS || 15000);

  if (!apiKey) throw new Error("BREVO_API_KEY no está definido");
  if (!apiKey.startsWith("xkeysib-")) {
    throw new Error("BREVO_API_KEY tiene un formato inválido (debe empezar con 'xkeysib-')");
  }
  if (!senderEmail) throw new Error("BREVO_SENDER_EMAIL no está definido");
  if (!senderName) throw new Error("BREVO_SENDER_NAME no está definido");
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new Error("BREVO_TIMEOUT_MS debe ser un número > 0");
  }

  return { apiKey, senderEmail, senderName, claimCcEmails, timeoutMs };
};
