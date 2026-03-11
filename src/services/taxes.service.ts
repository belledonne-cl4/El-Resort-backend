import { CloudbedsClient, CloudbedsHttpError, createCloudbedsClientFromEnv } from "../integrations/cloudbedsClient";

export type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };
export type JsonObject = { [key: string]: JsonValue };

export type GetTaxesAndFeesParams = {
  propertyID?: string;
  includeDeleted?: boolean;
  includeExpired?: boolean;
  includeCustomItemTaxes?: boolean;
};

let cachedClient: CloudbedsClient | null = null;
const getClient = () => {
  if (!cachedClient) cachedClient = createCloudbedsClientFromEnv();
  return cachedClient;
};

export const TaxesService = {
  async getTaxesAndFees(params: GetTaxesAndFeesParams = {}): Promise<JsonObject> {
    const client = getClient();

    const response = await client.requestJson<JsonObject>({
      method: "GET",
      path: "/getTaxesAndFees",
      params: {
        propertyID: params.propertyID,
        includeDeleted: params.includeDeleted === true ? true : undefined,
        includeExpired: params.includeExpired === true ? true : undefined,
        includeCustomItemTaxes: params.includeCustomItemTaxes === true ? true : undefined,
      },
    });

    return response;
  },

  CloudbedsHttpError,
};

