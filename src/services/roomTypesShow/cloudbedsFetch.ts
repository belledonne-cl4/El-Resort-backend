import { RoomsService, type JsonObject } from "../rooms.service";
import { RatesService } from "../rates.service";
import type { RoomTypeModel } from "../../models/RoomType.model";
import type { RateSummary } from "../../models/RateSummary";
import type { CloudbedsRoomsResponse, CloudbedsRoomTypesResponse, CloudbedsRatePlansResponse } from "./types";
import { asString, asNumber } from "./dto";

const parseCloudbedsRoomsResponse = (raw: JsonObject): CloudbedsRoomsResponse => raw as unknown as CloudbedsRoomsResponse;
const parseCloudbedsRoomTypesResponse = (raw: JsonObject): CloudbedsRoomTypesResponse => raw as unknown as CloudbedsRoomTypesResponse;
const parseCloudbedsRatePlansResponse = (raw: JsonObject): CloudbedsRatePlansResponse => raw as unknown as CloudbedsRatePlansResponse;

export const buildInventoryIndex = (
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

export const fetchAllRoomsForDates = async (params: {
  startDate: string;
  endDate: string;
  roomTypeID?: string;
}): Promise<Array<{ roomTypeID: string; roomID: string; roomName: string }>> => {
  const pageSize = 50;
  const maxPages = 200;

  const allRooms: Array<{ roomTypeID: string; roomID: string; roomName: string }> = [];
  let pageNumber = 1;
  let lastTotal: number | undefined;

  while (pageNumber <= maxPages) {
    const raw = await RoomsService.getRooms({
      startDate: params.startDate,
      endDate: params.endDate,
      roomTypeID: params.roomTypeID,
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

export const fetchRoomTypesDetails = async (params: {
  roomTypeIDs?: string[];
  maxGuests?: number;
}): Promise<Array<Record<string, unknown>>> => {
  const uniqueRoomTypeIDs = Array.isArray(params.roomTypeIDs)
    ? Array.from(new Set(params.roomTypeIDs.filter((id): id is string => typeof id === "string" && id.trim().length > 0)))
    : undefined;

  if (Array.isArray(uniqueRoomTypeIDs) && uniqueRoomTypeIDs.length === 0) return [];

  const pageSize = 50;
  const maxPages = 200;

  const all: Array<Record<string, unknown>> = [];
  let pageNumber = 1;
  let lastTotal: number | undefined;

  while (pageNumber <= maxPages) {
    const raw = await RoomsService.getRoomTypes({
      roomTypeIDs: uniqueRoomTypeIDs ? uniqueRoomTypeIDs.join(",") : undefined,
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

export const fetchRatePlansIndex = async (params: {
  roomTypeIDs: string[];
  startDate: string;
  endDate: string;
  promoCode?: string;
}): Promise<Map<string, { baseRate?: NonNullable<RoomTypeModel["pricing"]["baseRate"]>; ratePlans: RateSummary[] }>> => {
  const index = new Map<string, { baseRate?: NonNullable<RoomTypeModel["pricing"]["baseRate"]>; ratePlans: RateSummary[] }>();
  if (!params.roomTypeIDs.length) return index;

  const raw = await RatesService.getRatePlans({
    roomTypeID: params.roomTypeIDs.join(","),
    startDate: params.startDate,
    endDate: params.endDate,
    promoCode: params.promoCode,
    includePromoCode: params.promoCode ? undefined : false,
  });

  const parsed = parseCloudbedsRatePlansResponse(raw);
  const data = Array.isArray(parsed.data) ? parsed.data : [];

  for (const item of data) {
    const roomTypeID = asString(item.roomTypeID);
    const rateID = asString(item.rateID);
    const roomRate = asNumber(item.roomRate);
    const totalRate = asNumber(item.totalRate);
    const roomsAvailable = asNumber(item.roomsAvailable);
    const isDerived = typeof item.isDerived === "boolean" ? item.isDerived : undefined;

    if (!roomTypeID || !rateID || roomRate === undefined || totalRate === undefined || roomsAvailable === undefined || isDerived === undefined) continue;

    const bucket = index.get(roomTypeID) ?? { ratePlans: [] as RateSummary[] };

    if (isDerived === false) {
      if (!bucket.baseRate) {
        bucket.baseRate = { rateID, roomRate, totalRate, roomsAvailable, isDerived };
      }
    } else {
      bucket.ratePlans.push({
        rateID,
        roomRate,
        totalRate,
        roomsAvailable,
        isDerived,
        ratePlanID: asString(item.ratePlanID),
        ratePlanNamePublic: asString(item.ratePlanNamePublic),
        ratePlanNamePrivate: asString(item.ratePlanNamePrivate),
        promoCode: asString(item.promoCode),
        derivedType: asString(item.derivedType),
        derivedValue: asNumber(item.derivedValue),
        baseRate: asNumber(item.baseRate),
        ratePlanAddOns: Array.isArray(item.ratePlanAddOns) ? (item.ratePlanAddOns as unknown[]) : undefined,
      });
    }

    index.set(roomTypeID, bucket);
  }

  return index;
};
