import { CloudbedsClient, CloudbedsHttpError, createCloudbedsClientFromEnv } from "../integrations/cloudbedsClient";

export type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };
export type JsonObject = { [key: string]: JsonValue };

export type PostGuestBody = JsonObject;

let cachedClient: CloudbedsClient | null = null;
const getClient = () => {
  if (!cachedClient) cachedClient = createCloudbedsClientFromEnv();
  return cachedClient;
};

export const GuestsService = {
  async postGuest(body: PostGuestBody): Promise<JsonObject> {
    const client = getClient();

    const form = new URLSearchParams();
    for (let [key, value] of Object.entries(body)) {
      if (value === undefined) continue;
      if (value === null) continue;

      if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
        form.set(key, String(value));
        continue;
      }

      form.set(key, JSON.stringify(value));
    }

    const response = await client.requestJson<JsonObject>({
      method: "POST",
      path: "/postGuest",
      data: form.toString(),
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    return response;
  },

  CloudbedsHttpError,
};

