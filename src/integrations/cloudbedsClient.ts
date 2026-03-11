import axios, { type AxiosError, type AxiosInstance, type AxiosRequestConfig, type RawAxiosRequestHeaders } from "axios";
import { buildCloudbedsAuthHeaders, type CloudbedsAuthMode, type CloudbedsConfig, getCloudbedsConfigFromEnv } from "../config/cloudbeds";

export class CloudbedsHttpError extends Error {
  status?: number;
  request?: { method?: string; url?: string; path?: string };
  responseBody?: unknown;
  responseHeaders?: Record<string, string | string[]>;

  constructor(message: string, opts?: { status?: number; responseBody?: unknown; responseHeaders?: Record<string, string | string[]> }) {
    super(message);
    this.name = "CloudbedsHttpError";
    this.status = opts?.status;
    this.responseBody = opts?.responseBody;
    this.responseHeaders = opts?.responseHeaders;
  }
}

export type CloudbedsClientOptions = {
  baseUrl: string;
  apiKey: string;
  authMode?: CloudbedsAuthMode;
  timeoutMs?: number;
  defaultHeaders?: Record<string, string>;
};

export type CloudbedsRequestOptions = {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  params?: Record<string, unknown>;
  data?: unknown;
  headers?: Record<string, string>;
  authMode?: CloudbedsAuthMode;
};

export class CloudbedsClient {
  private readonly axios: AxiosInstance;
  private readonly apiKey: string;
  private readonly authMode: CloudbedsAuthMode;
  private readonly defaultHeaders?: Record<string, string>;

  constructor(options: CloudbedsClientOptions) {
    this.apiKey = options.apiKey;
    this.authMode = options.authMode || "x-api-key";
    this.defaultHeaders = options.defaultHeaders;

    this.axios = axios.create({
      baseURL: options.baseUrl,
      timeout: options.timeoutMs ?? 15000,
    });
  }

  async requestJson<T>(options: CloudbedsRequestOptions): Promise<T> {
    const authMode = options.authMode || this.authMode;
    const authHeaders = buildCloudbedsAuthHeaders(this.apiKey, authMode);

    const headers: RawAxiosRequestHeaders = {
      Accept: "application/json",
      ...this.defaultHeaders,
      ...authHeaders,
      ...(options.headers || {}),
    };

    const config: AxiosRequestConfig = {
      method: options.method,
      url: options.path,
      params: options.params,
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

  private normalizeError(error: unknown, requestConfig?: AxiosRequestConfig): CloudbedsHttpError {
    const request = {
      method: requestConfig?.method?.toString().toUpperCase(),
      path: typeof requestConfig?.url === "string" ? requestConfig.url : undefined,
      url:
        typeof this.axios.defaults.baseURL === "string" && typeof requestConfig?.url === "string"
          ? `${this.axios.defaults.baseURL}${requestConfig.url}`
          : undefined,
    };

    if (!axios.isAxiosError(error)) {
      const e = new CloudbedsHttpError("Error inesperado al llamar a Cloudbeds");
      e.request = request;
      return e;
    }

    const axiosError = error as AxiosError;
    const status = axiosError.response?.status;
    const rawBody = axiosError.response?.data;
    const responseBody = typeof rawBody === "string" ? undefined : rawBody;
    const responseHeaders = axiosError.response?.headers as Record<string, string | string[]> | undefined;

    if (status) {
      const e = new CloudbedsHttpError(`Cloudbeds respondió con error HTTP ${status}`, { status, responseBody, responseHeaders });
      e.request = request;
      return e;
    }

    if (axiosError.code === "ECONNABORTED") {
      const e = new CloudbedsHttpError("Timeout al conectar con Cloudbeds");
      e.request = request;
      return e;
    }

    const e = new CloudbedsHttpError("Error de red al conectar con Cloudbeds");
    e.request = request;
    return e;
  }
}

export const createCloudbedsClientFromEnv = (): CloudbedsClient => {
  const config: CloudbedsConfig = getCloudbedsConfigFromEnv();
  return new CloudbedsClient({
    baseUrl: config.baseUrl,
    apiKey: config.apiKey,
    authMode: config.authMode,
    timeoutMs: config.timeoutMs,
  });
};
