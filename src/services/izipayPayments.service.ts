import { IzipayHttpError, getCachedIzipayResortClientFromEnv } from "../integrations/izipayClient";

export type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };
export type JsonObject = { [key: string]: JsonValue };

export type CreateResortPaymentParams = {
  amount: number;
  currency?: string;
  orderId: string;
  customerEmail?: string;
  email?: string;
  customerName?: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  identityType?: string;
  identityCode?: string;
  address?: string | null;
  country?: string;
  city?: string;
  state?: string | null;
  zipCode?: string | null;
};

const toCents = (amount: number): number => {
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("amount inválido");
  const cents = Math.round(amount * 100);
  if (!Number.isInteger(cents) || cents <= 0) throw new Error("amount inválido");
  return cents;
};

const splitName = (fullName: string): { firstName?: string; lastName?: string } => {
  const parts = fullName
    .trim()
    .split(/\s+/g)
    .filter((p) => p.length > 0);
  if (parts.length === 0) return {};
  if (parts.length === 1) return { firstName: parts[0] };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
};

const asRecord = (value: unknown): Record<string, unknown> | undefined =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;

const pickFormToken = (raw: unknown): string | undefined => {
  const root = asRecord(raw);
  const answer = root ? asRecord(root.answer) : undefined;
  const token = answer?.formToken;
  return typeof token === "string" && token.trim().length > 0 ? token : undefined;
};

export const IzipayPaymentsService = {
  async createResortFormToken(params: CreateResortPaymentParams): Promise<{ formToken: string; publicKey: string; raw: JsonObject }> {
    const { client, config } = getCachedIzipayResortClientFromEnv();

    const amountCents = toCents(params.amount);
    const currency = (params.currency || "PEN").trim() || "PEN";
    if (!params.orderId || !params.orderId.trim()) throw new Error("orderId es requerido");

    const email = (params.customerEmail || params.email || "").trim() || undefined;

    const byCustomerName = typeof params.customerName === "string" ? splitName(params.customerName) : {};
    const firstName = (params.firstName || byCustomerName.firstName || "").trim() || undefined;
    const lastName = (params.lastName || byCustomerName.lastName || "").trim() || undefined;

    const phoneNumber = typeof params.phoneNumber === "string" ? params.phoneNumber.trim() : "";
    const identityType = typeof params.identityType === "string" ? params.identityType.trim() : "";
    const identityCode = typeof params.identityCode === "string" ? params.identityCode.trim() : "";
    const address =
      params.address === null ? null : typeof params.address === "string" ? params.address.trim() : "";
    const country = typeof params.country === "string" ? params.country.trim() : "";
    const city = typeof params.city === "string" ? params.city.trim() : "";
    const state =
      params.state === null ? null : typeof params.state === "string" ? params.state.trim() : "";
    const zipCode =
      params.zipCode === null ? null : typeof params.zipCode === "string" ? params.zipCode.trim() : "";

    const body: Record<string, unknown> = {
      amount: amountCents,
      currency,
      orderId: params.orderId.trim(),
      customer: {
        email,
        billingDetails: {
          firstName,
          lastName,
          phoneNumber: phoneNumber || undefined,
          identityType: identityType || undefined,
          identityCode: identityCode || undefined,
          address: address === null ? null : address || undefined,
          country: country || undefined,
          city: city || undefined,
          state: state === null ? null : state || undefined,
          zipCode: zipCode === null ? null : zipCode || undefined,
        },
      },
    };

    const raw = await client.requestJson<JsonObject>({
      method: "POST",
      url: config.createPaymentUrl,
      data: body,
    });

    const formToken = pickFormToken(raw);
    if (!formToken) throw new Error("Izipay no devolvió formToken");

    return { formToken, publicKey: config.publicKey, raw };
  },

  IzipayHttpError,
};
