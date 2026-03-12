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

export type GetRoomTypesParams = {
  propertyIDs?: string;
  roomTypeIDs?: string;
  startDate?: string;
  endDate?: string;
  adults?: number;
  children?: number;
  detailedRates?: boolean;
  roomTypeName?: string;
  propertyCity?: string;
  propertyName?: string;
  maxGuests?: string;
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

  async getRoomTypes(params: GetRoomTypesParams = {}): Promise<JsonObject> {
    const client = getClient();

    const response = await client.requestJson<JsonObject>({
      method: "GET",
      path: "/getRoomTypes",
      params: {
        ...params,
        detailedRates: params.detailedRates === true ? true : undefined,
      },
    });

    return response;
  },

  CloudbedsHttpError,
};
