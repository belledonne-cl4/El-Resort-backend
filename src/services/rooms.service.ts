import { CloudbedsClient, CloudbedsHttpError, createCloudbedsClientFromEnv } from "../integrations/cloudbedsClient";

export type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };
export type JsonObject = { [key: string]: JsonValue };

export type GetRoomsParams = {
  propertyIDs?: string;
  roomTypeID?: string;
  roomTypeNameShort?: string;
  startDate?: string;
  endDate?: string;
  includeRoomRelations?: number;
  pageNumber?: number;
  pageSize?: number;
  sort?: string;
};

let cachedClient: CloudbedsClient | null = null;
const getClient = () => {
  if (!cachedClient) cachedClient = createCloudbedsClientFromEnv();
  return cachedClient;
};

export const RoomsService = {
  async getRooms(params: GetRoomsParams = {}): Promise<JsonObject> {
    const client = getClient();

    const response = await client.requestJson<JsonObject>({
      method: "GET",
      path: "/getRooms",
      params,
    });

    return response;
  },

  CloudbedsHttpError,
};

