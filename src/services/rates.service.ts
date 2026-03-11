import { CloudbedsClient, CloudbedsHttpError, createCloudbedsClientFromEnv } from "../integrations/cloudbedsClient";

export type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };
export type JsonObject = { [key: string]: JsonValue };

export type GetRateParams = {
  roomTypeID: string;
  startDate: string;
  endDate: string;
  adults?: number;
  children?: number;
  detailedRates?: boolean;
  promoCode?: boolean;
};

export type GetRatePlansParams = {
  propertyIDs?: string;
  rateIDs?: string;
  roomTypeID?: string;
  promoCode?: string;
  includePromoCode?: boolean;
  startDate?: string;
  endDate?: string;
  adults?: number;
  children?: number;
  detailedRates?: boolean;
  includeSharedRooms?: boolean;
};

let cachedClient: CloudbedsClient | null = null;
const getClient = () => {
  if (!cachedClient) cachedClient = createCloudbedsClientFromEnv();
  return cachedClient;
};

export const RatesService = {
  async getRate(params: GetRateParams): Promise<JsonObject> {
    const client = getClient();

    const response = await client.requestJson<JsonObject>({
      method: "GET",
      path: "/getRate",
      params: {
        roomTypeID: params.roomTypeID,
        startDate: params.startDate,
        endDate: params.endDate,
        adults: params.adults,
        children: params.children,
        detailedRates: params.detailedRates === true ? true : undefined,
        promoCode: params.promoCode === true ? true : undefined,
      },
    });

    return response;
  },

  async getRatePlans(params: GetRatePlansParams = {}): Promise<JsonObject> {
    const client = getClient();

    const response = await client.requestJson<JsonObject>({
      method: "GET",
      path: "/getRatePlans",
      params: {
        ...params,
        detailedRates: params.detailedRates === true ? true : undefined,
        includeSharedRooms: params.includeSharedRooms === true ? true : undefined,
        // includePromoCode default = true en Cloudbeds.
        // Enviamos false solo si el caller lo pide explícitamente.
        includePromoCode: params.includePromoCode === false ? false : undefined,
      },
    });

    return response;
  },

  CloudbedsHttpError,
};
