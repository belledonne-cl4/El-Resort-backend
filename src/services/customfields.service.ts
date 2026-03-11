import { CloudbedsClient, CloudbedsHttpError, createCloudbedsClientFromEnv } from "../integrations/cloudbedsClient";

export type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };
export type JsonObject = { [key: string]: JsonValue };

export type GetCustomFieldsParams = {
  propertyID?: string;
  customFieldID?: string;
  shortcode?: string;
};

let cachedClient: CloudbedsClient | null = null;
const getClient = () => {
  if (!cachedClient) cachedClient = createCloudbedsClientFromEnv();
  return cachedClient;
};

export const CustomFieldsService = {
  async getCustomFields(params: GetCustomFieldsParams = {}): Promise<JsonObject> {
    const client = getClient();

    const response = await client.requestJson<JsonObject>({
      method: "GET",
      path: "/getCustomFields",
      params,
    });

    return response;
  },

  CloudbedsHttpError,
};
