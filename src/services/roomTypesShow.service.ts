import { RoomsService, type JsonObject } from "./rooms.service";

import { type RoomTypeModel } from "../models/RoomType.model";

type CloudbedsRoomsResponse = {
  success?: boolean;
  data?: Array<{
    propertyID?: string;
    rooms?: Array<{
      roomID?: string;
      roomName?: string;
      roomTypeID?: string;
    }>;
  }>;
  count?: number;
  total?: number;
};

type CloudbedsRoomTypesResponse = {
  success?: boolean;
  data?: Array<Record<string, unknown>>;
  count?: number;
  total?: number;
};

const asString = (value: unknown): string | undefined => (typeof value === "string" ? value : undefined);
const asNumber = (value: unknown): number | undefined => (typeof value === "number" && Number.isFinite(value) ? value : undefined);
const asStringArray = (value: unknown): string[] | undefined =>
  Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : undefined;

const asRecord = (value: unknown): Record<string, unknown> | undefined =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;

const normalizeRoomTypeFeatures = (value: unknown): string[] | undefined => {
  const arr = asStringArray(value);
  if (arr) return arr;

  const record = asRecord(value);
  if (!record) return undefined;

  return Object.keys(record)
    .sort((a, b) => Number(a) - Number(b))
    .map((k) => record[k])
    .filter((v): v is string => typeof v === "string");
};

const parseCloudbedsRoomsResponse = (raw: JsonObject): CloudbedsRoomsResponse => raw as unknown as CloudbedsRoomsResponse;
const parseCloudbedsRoomTypesResponse = (raw: JsonObject): CloudbedsRoomTypesResponse => raw as unknown as CloudbedsRoomTypesResponse;

const buildInventoryIndex = (
  rooms: Array<{ roomTypeID: string; roomID: string; roomName: string }>
): Map<string, { roomIDs: string[]; roomNames: string[] }> => {
  const index = new Map<string, { roomIDs: string[]; roomNames: string[] }>();
  for (const room of rooms) {
    const existing = index.get(room.roomTypeID) ?? { roomIDs: [], roomNames: [] };
    existing.roomIDs.push(room.roomID);
    existing.roomNames.push(room.roomName);
    index.set(room.roomTypeID, existing);
  }
  return index;
};

const fetchAllRoomsForDates = async (params: { startDate: string; endDate: string }): Promise<Array<{ roomTypeID: string; roomID: string; roomName: string }>> => {
  const pageSize = 50;
  const maxPages = 200;

  const allRooms: Array<{ roomTypeID: string; roomID: string; roomName: string }> = [];
  let pageNumber = 1;
  let lastTotal: number | undefined;

  while (pageNumber <= maxPages) {
    const raw = await RoomsService.getRooms({
      startDate: params.startDate,
      endDate: params.endDate,
      includeRoomRelations: 0,
      pageNumber,
      pageSize,
    });

    const parsed = parseCloudbedsRoomsResponse(raw);
    const properties = Array.isArray(parsed.data) ? parsed.data : [];
    const pageRooms = properties.flatMap((p) => (Array.isArray(p.rooms) ? p.rooms : []));

    for (const r of pageRooms) {
      const roomTypeID = asString(r.roomTypeID);
      const roomID = asString(r.roomID);
      const roomName = asString(r.roomName);
      if (!roomTypeID || !roomID || !roomName) continue;
      allRooms.push({ roomTypeID, roomID, roomName });
    }

    const total = asNumber(parsed.total);
    if (total !== undefined && total > 0) lastTotal = total;
    if (lastTotal !== undefined && allRooms.length >= lastTotal) break;

    if (pageRooms.length === 0) break;
    pageNumber += 1;
  }

  return allRooms;
};

const fetchRoomTypesDetails = async (params: {
  roomTypeIDs: string[];
  maxGuests?: number;
}): Promise<Array<Record<string, unknown>>> => {
  if (!params.roomTypeIDs.length) return [];

  const pageSize = 50;
  const maxPages = 200;

  const all: Array<Record<string, unknown>> = [];
  let pageNumber = 1;
  let lastTotal: number | undefined;

  while (pageNumber <= maxPages) {
    const raw = await RoomsService.getRoomTypes({
      roomTypeIDs: params.roomTypeIDs.join(","),
      maxGuests: params.maxGuests !== undefined ? String(params.maxGuests) : undefined,
      pageNumber,
      pageSize,
    });

    const parsed = parseCloudbedsRoomTypesResponse(raw);
    const data = Array.isArray(parsed.data) ? parsed.data : [];
    for (const item of data) all.push(item);

    const total = asNumber(parsed.total);
    if (total !== undefined && total > 0) lastTotal = total;
    if (lastTotal !== undefined && all.length >= lastTotal) break;

    if (data.length === 0) break;
    pageNumber += 1;
  }

  return all;
};

export const RoomTypesShowService = {
  async listRoomTypesBase(params: { startDate: string; endDate: string; maxGuests?: number }): Promise<RoomTypeModel[]> {
    const rooms = await fetchAllRoomsForDates({ startDate: params.startDate, endDate: params.endDate });
    const inventoryByRoomType = buildInventoryIndex(rooms);
    const roomTypeIDs = Array.from(new Set(rooms.map((r) => r.roomTypeID)));

    const roomTypes = await fetchRoomTypesDetails({ roomTypeIDs, maxGuests: params.maxGuests });

    const models: RoomTypeModel[] = [];
    for (const rt of roomTypes) {
      const roomTypeID = asString(rt.roomTypeID);
      const roomTypeName = asString(rt.roomTypeName);
      if (!roomTypeID || !roomTypeName) continue;

      const inventory = inventoryByRoomType.get(roomTypeID) ?? { roomIDs: [], roomNames: [] };
      if (inventory.roomIDs.length === 0) continue;

      const photos = asStringArray(rt.roomTypePhotos) ?? [];

      models.push({
        roomTypeID,
        presentation: {
          roomTypeName,
          roomTypeNameShort: asString(rt.roomTypeNameShort),
          roomTypeDescription: asString(rt.roomTypeDescription),
          roomTypePhotos: photos,
          maxGuests: asNumber(rt.maxGuests),
          adultsIncluded: asNumber(rt.adultsIncluded),
          childrenIncluded: asNumber(rt.childrenIncluded),
          roomTypeFeatures: normalizeRoomTypeFeatures(rt.roomTypeFeatures),
        },
        inventory: {
          roomIDs: inventory.roomIDs,
          roomNames: inventory.roomNames,
          totalUnits: asNumber(rt.roomTypeUnits),
          linkedRoomIDs: asStringArray(rt.linkedRoomIDs),
          linkedRoomTypeIDs: asStringArray(rt.linkedRoomTypeIDs),
          linkedRoomTypeQty: Array.isArray(rt.linkedRoomTypeQty)
            ? rt.linkedRoomTypeQty
                .map((v) => asRecord(v))
                .filter((v): v is Record<string, unknown> => !!v)
                .map((v) => ({
                  roomTypeID: asString(v.roomTypeID) ?? "",
                  roomQty: asNumber(v.roomQty) ?? 0,
                }))
                .filter((v) => v.roomTypeID.length > 0 && v.roomQty > 0)
            : undefined,
        },
        pricing: {
          ratePlans: [],
        },
      });
    }

    return models;
  },
};
