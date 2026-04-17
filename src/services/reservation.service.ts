import { CloudbedsClient, CloudbedsHttpError, createCloudbedsClientFromEnv } from "../integrations/cloudbedsClient";

export type GetReservationsParams = {
  propertyID?: string;
  status?: "not_confirmed" | "confirmed" | "canceled" | "checked_in" | "checked_out" | "no_show";
  resultsFrom?: string;
  resultsTo?: string;
  modifiedFrom?: string;
  modifiedTo?: string;
  checkInFrom?: string;
  checkInTo?: string;
  checkOutFrom?: string;
  checkOutTo?: string;
  datesQueryMode?: "booking" | "rooms";
  roomID?: string;
  roomName?: string;
  roomTypeID?: string;
  includeGuestsDetails?: boolean;
  includeGuestRequirements?: boolean;
  includeCustomFields?: boolean;
  includeAllRooms?: boolean;
  sourceId?: string;
  sourceReservationId?: string;
  ratePlanId?: string;
  firstName?: string;
  lastName?: string;
  guestID?: string;
  allotmentBlockCode?: string;
  groupCode?: string;
  sortByRecent?: boolean;
  pageNumber?: number;
  pageSize?: number;
};

export type GetReservationsWithRateDetailsParams = {
  propertyID?: string;
  resultsFrom?: string;
  resultsTo?: string;
  modifiedFrom?: string;
  modifiedTo?: string;
  sortByRecent?: boolean;
  reservationID?: string;
  reservationCheckOutFrom?: string;
  reservationCheckOutTo?: string;
  includeDeleted?: boolean;
  excludeStatuses?: string;
  includeGuestsDetails?: boolean;
  includeGuestRequirements?: boolean;
  includeCustomFields?: boolean;
  guestID?: string;
  pageNumber?: number;
  pageSize?: number;
};

export type GetReservationAssignmentsParams = {
  propertyID?: string;
  date?: string;
};

export type GetReservationNotesParams = {
  propertyID?: string;
  reservationID: string;
};

export type GetSourcesParams = {
  propertyIDs?: string;
};

export type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };
export type JsonObject = { [key: string]: JsonValue };

export type PutReservationBody = JsonObject;

export type PostReservationNoteBody = {
  propertyID?: string | null;
  reservationID: string;
  reservationNote: string;
  userID?: string | null;
  dateCreated?: string | null;
};

export type GetReservationParams = {
  propertyID?: string;
  reservationID: string;
  includeGuestRequirements?: boolean;
};

let cachedClient: CloudbedsClient | null = null;
const getClient = () => {
  if (!cachedClient) cachedClient = createCloudbedsClientFromEnv();
  return cachedClient;
};

export const ReservationService = {
  async getReservations(params: GetReservationsParams = {}): Promise<JsonObject> {
    const client = getClient();

    const response = await client.requestJson<JsonObject>({
      method: "GET",
      path: "/getReservations",
      params: {
        ...params,
        sortByRecent: params.sortByRecent ?? true,
      },
    });

    return response;
  },

  async getReservationsWithRateDetails(params: GetReservationsWithRateDetailsParams = {}): Promise<JsonObject> {
    const client = getClient();

    const response = await client.requestJson<JsonObject>({
      method: "GET",
      path: "/getReservationsWithRateDetails",
      params,
    });

    return response;
  },

  async getReservationAssignments(params: GetReservationAssignmentsParams = {}): Promise<JsonObject> {
    const client = getClient();

    const response = await client.requestJson<JsonObject>({
      method: "GET",
      path: "/getReservationAssignments",
      params,
    });

    return response;
  },

  async getReservationNotes(params: GetReservationNotesParams): Promise<JsonObject> {
    const client = getClient();

    const response = await client.requestJson<JsonObject>({
      method: "GET",
      path: "/getReservationNotes",
      params: {
        propertyID: params.propertyID,
        reservationID: params.reservationID,
      },
    });

    return response;
  },

  async getSources(params: GetSourcesParams = {}): Promise<JsonObject> {
    const client = getClient();

    const response = await client.requestJson<JsonObject>({
      method: "GET",
      path: "/getSources",
      params,
    });

    return response;
  },

  async getReservation(params: GetReservationParams): Promise<JsonObject> {
    const client = getClient();

    const response = await client.requestJson<JsonObject>({
      method: "GET",
      path: "/getReservation",
      params: {
        propertyID: params.propertyID,
        reservationID: params.reservationID,
        includeGuestRequirements: params.includeGuestRequirements === true ? true : undefined,
      },
    });

    return response;
  },

    async postReservation(body: JsonObject): Promise<JsonObject> {
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
      path: "/postReservation",
      data: form.toString(),
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

      return response;
    },

  async putReservation(body: PutReservationBody): Promise<JsonObject> {
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
        method: "PUT",
        path: "/putReservation",
        data: form.toString(),
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });

      return response;
    },

    async postReservationNote(body: PostReservationNoteBody): Promise<JsonObject> {
      const client = getClient();

      const form = new URLSearchParams();
    form.set("reservationID", body.reservationID);
    form.set("reservationNote", body.reservationNote);
    if (body.propertyID) form.set("propertyID", body.propertyID);
    if (body.userID) form.set("userID", body.userID);
    if (body.dateCreated) form.set("dateCreated", body.dateCreated);

    const response = await client.requestJson<JsonObject>({
      method: "POST",
      path: "/postReservationNote",
      data: form.toString(),
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    return response;
  },

  CloudbedsHttpError,
};
