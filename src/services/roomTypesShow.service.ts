import { RoomsService, type JsonObject } from "./rooms.service";

import { type RoomTypeModel } from "../models/RoomType.model";
import { RatesService } from "./rates.service";
import type { RateSummary } from "../models/RateSummary";

const EXTENDED_STAY_MIN_NIGHTS = 4;

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

type CloudbedsRatePlansResponse = {
  success?: boolean;
  data?: Array<Record<string, unknown>>;
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
const parseCloudbedsRatePlansResponse = (raw: JsonObject): CloudbedsRatePlansResponse => raw as unknown as CloudbedsRatePlansResponse;

const parseYmdToUtcMs = (value: string): number | undefined => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return undefined;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return undefined;
  const ms = Date.UTC(year, month - 1, day);
  const d = new Date(ms);
  if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) return undefined;
  return ms;
};

const getNightsBetween = (startDate: string, endDate: string): number => {
  const startMs = parseYmdToUtcMs(startDate);
  const endMs = parseYmdToUtcMs(endDate);
  if (startMs === undefined || endMs === undefined) return 0;
  const diff = (endMs - startMs) / (24 * 60 * 60 * 1000);
  return Number.isInteger(diff) && diff > 0 ? diff : 0;
};

const normalizeForSearch = (value: string): string =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const isExtendedStayRatePlan = (ratePlan: RateSummary): boolean => {
  const names = [ratePlan.ratePlanNamePublic, ratePlan.ratePlanNamePrivate].filter(
    (v): v is string => typeof v === "string" && v.trim().length > 0
  );
  const haystack = normalizeForSearch(names.join(" "));
  if (haystack.includes("estadia extendida")) return true;
  if (haystack.includes("extended stay")) return true;
  if (haystack.includes("long stay")) return true;

  const derivedType = typeof ratePlan.derivedType === "string" ? normalizeForSearch(ratePlan.derivedType) : "";
  if (derivedType.includes("extended")) return true;

  return false;
};

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

const fetchRatePlansIndex = async (params: {
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

  async listRoomTypesWithPricing(params: {
    startDate: string;
    endDate: string;
    maxGuests?: number;
    promoCode?: string;
    }): Promise<RoomTypeModel[]> {
      const baseModels = await this.listRoomTypesBase({ startDate: params.startDate, endDate: params.endDate, maxGuests: params.maxGuests });
      const roomTypeIDs = baseModels.map((m) => m.roomTypeID);
      const nights = getNightsBetween(params.startDate, params.endDate);

      const pricingIndex = await fetchRatePlansIndex({
        roomTypeIDs,
        startDate: params.startDate,
        endDate: params.endDate,
      promoCode: params.promoCode,
    });

      return baseModels.map((m) => {
        const pricing = pricingIndex.get(m.roomTypeID);
        const rawRatePlans = pricing?.ratePlans ?? [];
        const ratePlans =
          nights >= EXTENDED_STAY_MIN_NIGHTS ? rawRatePlans : rawRatePlans.filter((rp) => !isExtendedStayRatePlan(rp));
        return {
          ...m,
          pricing: {
            baseRate: pricing?.baseRate,
            ratePlans,
          },
        };
      });
    },
  };
