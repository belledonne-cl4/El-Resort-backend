import axios, { type AxiosError, type AxiosInstance, type AxiosRequestConfig, type RawAxiosRequestHeaders } from "axios";
import { type IzipayConfig, getIzipayResortConfigFromEnv } from "../config/izipay";

export class IzipayHttpError extends Error {
  status?: number;
  request?: { method?: string; url?: string; path?: string };
  responseBody?: unknown;
  responseHeaders?: Record<string, string | string[]>;

  constructor(message: string, opts?: { status?: number; responseBody?: unknown; responseHeaders?: Record<string, string | string[]> }) {
    super(message);
    this.name = "IzipayHttpError";
    this.status = opts?.status;
    this.responseBody = opts?.responseBody;
    this.responseHeaders = opts?.responseHeaders;
  }
}

export type IzipayClientOptions = {
  username: string;
  password: string;
  timeoutMs?: number;
  defaultHeaders?: Record<string, string>;
};

export type IzipayRequestOptions = {
  method: "POST";
  url: string;
  data?: unknown;
  headers?: Record<string, string>;
};

const buildBasicAuthHeader = (username: string, password: string): string => {
  const raw = `${username}:${password}`;
  const encoded = Buffer.from(raw, "utf8").toString("base64");
  return `Basic ${encoded}`;
};

export class IzipayClient {
  private readonly axios: AxiosInstance;
  private readonly authHeader: string;
  private readonly defaultHeaders?: Record<string, string>;

  constructor(options: IzipayClientOptions) {
    this.authHeader = buildBasicAuthHeader(options.username, options.password);
    this.defaultHeaders = options.defaultHeaders;

    this.axios = axios.create({
      timeout: options.timeoutMs ?? 15000,
    });
  }

  async requestJson<T>(options: IzipayRequestOptions): Promise<T> {
    const headers: RawAxiosRequestHeaders = {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: this.authHeader,
      ...this.defaultHeaders,
      ...(options.headers || {}),
    };

    const config: AxiosRequestConfig = {
      method: options.method,
      url: options.url,
      data: options.data,
      headers,
    };

    try {
      const response = await this.axios.request<T>(config);
      return response.data;
    } catch (error) {
      throw this.normalizeError(error, config);
    }
  }

  private normalizeError(error: unknown, requestConfig?: AxiosRequestConfig): IzipayHttpError {
    const request = {
      method: requestConfig?.method?.toString().toUpperCase(),
      url: typeof requestConfig?.url === "string" ? requestConfig.url : undefined,
    };

    if (!axios.isAxiosError(error)) {
      const e = new IzipayHttpError("Error inesperado al llamar a Izipay");
      e.request = request;
      return e;
    }

    const axiosError = error as AxiosError;
    const status = axiosError.response?.status;
    const rawBody = axiosError.response?.data;
    const responseBody = typeof rawBody === "string" ? undefined : rawBody;
    const responseHeaders = axiosError.response?.headers as Record<string, string | string[]> | undefined;

    if (status) {
      const e = new IzipayHttpError(`Izipay respondió con error HTTP ${status}`, { status, responseBody, responseHeaders });
      e.request = request;
      return e;
    }

    if (axiosError.code === "ECONNABORTED") {
      const e = new IzipayHttpError("Timeout al conectar con Izipay");
      e.request = request;
      return e;
    }

    const e = new IzipayHttpError("Error de red al conectar con Izipay");
    e.request = request;
    return e;
  }
}

let cachedResortClient: IzipayClient | null = null;

export const getCachedIzipayResortClientFromEnv = (): { client: IzipayClient; config: IzipayConfig } => {
  const config = getIzipayResortConfigFromEnv();
  if (!cachedResortClient) {
    cachedResortClient = new IzipayClient({
      username: config.username,
      password: config.password,
      timeoutMs: config.timeoutMs,
    });
  }
  return { client: cachedResortClient, config };
};
