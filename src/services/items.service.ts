import { CloudbedsClient, CloudbedsHttpError, createCloudbedsClientFromEnv } from "../integrations/cloudbedsClient";

export type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };
export type JsonObject = { [key: string]: JsonValue };

export type GetItemsParams = {
  propertyID?: string;
  itemCategoryID?: string;
};

export type PostItemBody = {
  propertyID?: string | null;
  reservationID?: string | null;
  houseAccountID?: string | null;
  groupCode?: string | null;
  subReservationID?: string | null;
  itemID: string;
  itemQuantity: number;
  itemPrice?: string | null;
  itemNote?: string | null;
  itemPaid?: boolean | null;
  saleDate?: string | null;
  payments?: { paymentType: string; amount: number; notes?: string | null }[] | null;
};

let cachedClient: CloudbedsClient | null = null;
const getClient = () => {
  if (!cachedClient) cachedClient = createCloudbedsClientFromEnv();
  return cachedClient;
};

export const ItemsService = {
  async getItems(params: GetItemsParams = {}): Promise<JsonObject> {
    const client = getClient();

    const response = await client.requestJson<JsonObject>({
      method: "GET",
      path: "/getItems",
      params,
    });

    return response;
  },

  async postItem(body: PostItemBody): Promise<JsonObject> {
    const client = getClient();

    const form = new URLSearchParams();
    form.set("itemID", body.itemID);
    form.set("itemQuantity", String(body.itemQuantity));

    if (body.propertyID) form.set("propertyID", body.propertyID);
    if (body.reservationID) form.set("reservationID", body.reservationID);
    if (body.houseAccountID) form.set("houseAccountID", body.houseAccountID);
    if (body.groupCode) form.set("groupCode", body.groupCode);
    if (body.subReservationID) form.set("subReservationID", body.subReservationID);
    if (body.itemPrice) form.set("itemPrice", body.itemPrice);
    if (body.itemNote) form.set("itemNote", body.itemNote);
    if (body.saleDate) form.set("saleDate", body.saleDate);

    if (body.payments && Array.isArray(body.payments)) {
      form.set("payments", JSON.stringify(body.payments));
    } else if (body.itemPaid === true) {
      form.set("itemPaid", "true");
    }

    const response = await client.requestJson<JsonObject>({
      method: "POST",
      path: "/postItem",
      data: form.toString(),
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    return response;
  },

  CloudbedsHttpError,
};
