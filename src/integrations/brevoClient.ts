import axios, { type AxiosInstance } from "axios";
import { getBrevoConfigFromEnv, type BrevoConfig } from "../config/brevo";

export type BrevoEmailAddress = {
  email: string;
  name?: string;
};

export type BrevoSendEmailInput = {
  sender: BrevoEmailAddress;
  to: BrevoEmailAddress[];
  cc?: BrevoEmailAddress[];
  subject: string;
  htmlContent: string;
  replyTo?: BrevoEmailAddress;
};

export type BrevoSendEmailResponse = {
  messageId: string;
};

let cached: { config: BrevoConfig; client: AxiosInstance } | null = null;

const buildClient = (config: BrevoConfig): AxiosInstance => {
  return axios.create({
    baseURL: "https://api.brevo.com/v3",
    timeout: config.timeoutMs,
    headers: {
      "api-key": config.apiKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    validateStatus: () => true,
  });
};

const getCachedBrevoClientFromEnv = (): { config: BrevoConfig; client: AxiosInstance } => {
  const config = getBrevoConfigFromEnv();

  if (!cached || cached.config.apiKey !== config.apiKey || cached.config.timeoutMs !== config.timeoutMs) {
    cached = { config, client: buildClient(config) };
  }

  return cached;
};

export const BrevoClient = {
  async sendTransactionalEmail(input: BrevoSendEmailInput): Promise<BrevoSendEmailResponse> {
    const { client } = getCachedBrevoClientFromEnv();

    const payload: Record<string, unknown> = {
      sender: input.sender,
      to: input.to,
      subject: input.subject,
      htmlContent: input.htmlContent,
    };
    if (input.cc && input.cc.length > 0) payload.cc = input.cc;
    if (input.replyTo) payload.replyTo = input.replyTo;

    const res = await client.post("/smtp/email", payload);

    if (res.status < 200 || res.status >= 300) {
      const message =
        typeof (res.data as any)?.message === "string" ? (res.data as any).message : "Brevo error";
      const err = new Error(`${message} (status ${res.status})`);
      (err as any).status = res.status;
      (err as any).data = res.data;
      throw err;
    }

    const messageId = (res.data as any)?.messageId;
    return { messageId: typeof messageId === "string" ? messageId : "" };
  },
};
