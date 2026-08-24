import { type RoomTypeModel } from "../models/RoomType.model";
import type { RoomTypeReducedDetailModel, RoomTypeReducedModel } from "../models/RoomTypeReduced.model";
import { preferLocalText, preferLocalNumber } from "../utils/localOverride";
import { asString, asNumber, asStringArray, asRecord, normalizeRoomTypeFeatures, toReducedModel, toReducedDetailModel } from "./roomTypesShow/dto";
import { buildInventoryIndex, fetchAllRoomsForDates, fetchRoomTypesDetails, fetchRatePlansIndex } from "./roomTypesShow/cloudbedsFetch";
import {
  fetchRoomTypeLocalSpecsIndex,
  fetchRoomTypeLocalNameDescriptionIndex,
  fetchRoomTypeLocalPricingIndex,
  enrichPricingIndexWithCloudBeds,
} from "./roomTypesShow/localSpecsIndex";
import { EXTENDED_STAY_MIN_NIGHTS, getNightsBetween, isExtendedStayRatePlan } from "./roomTypesShow/dateAndFilters";

export const RoomTypesShowService = {
  async listRoomTypesBase(params: { startDate: string; endDate: string; maxGuests?: number }): Promise<RoomTypeModel[]> {
    const rooms = await fetchAllRoomsForDates({ startDate: params.startDate, endDate: params.endDate });
    const inventoryByRoomType = buildInventoryIndex(rooms);
    const roomTypeIDs = Array.from(new Set(rooms.map((r) => r.roomTypeID)));

    const roomTypes = await fetchRoomTypesDetails({ roomTypeIDs, maxGuests: params.maxGuests });
    const nameDescIndex = await fetchRoomTypeLocalNameDescriptionIndex(roomTypeIDs);

    const models: RoomTypeModel[] = [];
    for (const rt of roomTypes) {
      const roomTypeID = asString(rt.roomTypeID);
      // El filtro de existencia siempre usa el nombre crudo de Cloudbeds: el override local
      // solo cambia el valor mostrado, nunca si la propiedad aparece o no en los resultados.
      const roomTypeName = asString(rt.roomTypeName);
      if (!roomTypeID || !roomTypeName) continue;

      const inventory = inventoryByRoomType.get(roomTypeID) ?? { roomIDs: [], roomNames: [] };
      if (inventory.roomIDs.length === 0) continue;

      const photos = asStringArray(rt.roomTypePhotos) ?? [];
      const localEntry = nameDescIndex.get(roomTypeID);

      models.push({
        roomTypeID,
        presentation: {
          roomTypeName: preferLocalText(localEntry?.roomTypeName, roomTypeName) as string,
          roomTypeNameShort: asString(rt.roomTypeNameShort),
          roomTypeDescription: preferLocalText(localEntry?.roomTypeDescription, asString(rt.roomTypeDescription)),
          roomTypePhotos: photos,
          maxGuests: preferLocalNumber(localEntry?.maxGuests, asNumber(rt.maxGuests)),
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

  async getRoomTypeWithPricing(params: {
    roomTypeID: string;
    startDate: string;
    endDate: string;
    maxGuests?: number;
    promoCode?: string;
  }): Promise<RoomTypeModel | null> {
    const rooms = await fetchAllRoomsForDates({
      startDate: params.startDate,
      endDate: params.endDate,
      roomTypeID: params.roomTypeID,
    });

    const inventoryByRoomType = buildInventoryIndex(rooms);
    const inventory = inventoryByRoomType.get(params.roomTypeID) ?? { roomIDs: [], roomNames: [] };
    if (inventory.roomIDs.length === 0) return null;

    const details = await fetchRoomTypesDetails({ roomTypeIDs: [params.roomTypeID], maxGuests: params.maxGuests });
    const rt = details[0];
    if (!rt) return null;

    const roomTypeID = asString(rt.roomTypeID);
    const roomTypeName = asString(rt.roomTypeName);
    if (!roomTypeID || !roomTypeName) return null;

    const model: RoomTypeModel = {
      roomTypeID,
      presentation: {
        roomTypeName,
        roomTypeNameShort: asString(rt.roomTypeNameShort),
        roomTypeDescription: asString(rt.roomTypeDescription),
        roomTypePhotos: asStringArray(rt.roomTypePhotos) ?? [],
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
    };

    const pricingIndex = await fetchRatePlansIndex({
      roomTypeIDs: [roomTypeID],
      startDate: params.startDate,
      endDate: params.endDate,
      promoCode: params.promoCode,
    });

    const pricing = pricingIndex.get(roomTypeID);
    const nights = getNightsBetween(params.startDate, params.endDate);
    const rawRatePlans = pricing?.ratePlans ?? [];
    const ratePlans = nights >= EXTENDED_STAY_MIN_NIGHTS ? rawRatePlans : rawRatePlans.filter((rp) => !isExtendedStayRatePlan(rp));

    return {
      ...model,
      pricing: {
        baseRate: pricing?.baseRate,
        ratePlans,
      },
    };
  },

  toReducedModel(
    model: RoomTypeModel,
    localSpecs?: Parameters<typeof toReducedModel>[1],
    options?: Parameters<typeof toReducedModel>[2],
    localPricing?: Parameters<typeof toReducedModel>[3]
  ): RoomTypeReducedModel {
    return toReducedModel(model, localSpecs, options, localPricing);
  },

  toReducedDetailModel(
    model: RoomTypeModel,
    localSpecs?: Parameters<typeof toReducedDetailModel>[1],
    options?: Parameters<typeof toReducedDetailModel>[2],
    localPricing?: Parameters<typeof toReducedDetailModel>[3]
  ): RoomTypeReducedDetailModel {
    return toReducedDetailModel(model, localSpecs, options, localPricing);
  },

  async listRoomTypesReducedWithPricing(params: {
    startDate: string;
    endDate: string;
    maxGuests?: number;
    promoCode?: string;
  }): Promise<RoomTypeReducedModel[]> {
    const full = await this.listRoomTypesWithPricing(params);
    const specsIndex = await fetchRoomTypeLocalSpecsIndex(full.map((m) => m.roomTypeID));
    // Ordenar por `orden` ascendente; los que no tengan `orden` quedan al final
    full.sort((a, b) => {
      const oa = specsIndex.get(a.roomTypeID)?.orden;
      const ob = specsIndex.get(b.roomTypeID)?.orden;
      const va = Number.isFinite(oa as number) ? (oa as number) : Infinity;
      const vb = Number.isFinite(ob as number) ? (ob as number) : Infinity;
      if (va !== vb) return va - vb;
      return a.roomTypeID.localeCompare(b.roomTypeID);
    });

    return full.map((m) => toReducedModel(m, specsIndex.get(m.roomTypeID)));
  },

  async listRoomTypesReducedCatalogWithPricing(params: {
    startDate: string;
    endDate: string;
    maxGuests?: number;
    promoCode?: string;
  }): Promise<RoomTypeReducedModel[]> {
    const roomTypes = await fetchRoomTypesDetails({ maxGuests: params.maxGuests });

    const full: RoomTypeModel[] = [];
    for (const rt of roomTypes) {
      const roomTypeID = asString(rt.roomTypeID);
      const roomTypeName = asString(rt.roomTypeName);
      if (!roomTypeID || !roomTypeName) continue;

      full.push({
        roomTypeID,
        presentation: {
          roomTypeName,
          roomTypeNameShort: asString(rt.roomTypeNameShort),
          roomTypeDescription: asString(rt.roomTypeDescription),
          roomTypePhotos: asStringArray(rt.roomTypePhotos) ?? [],
          maxGuests: asNumber(rt.maxGuests),
          adultsIncluded: asNumber(rt.adultsIncluded),
          childrenIncluded: asNumber(rt.childrenIncluded),
          roomTypeFeatures: normalizeRoomTypeFeatures(rt.roomTypeFeatures),
        },
        inventory: {
          roomIDs: [],
          roomNames: [],
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

    const pricingIndex = await fetchRatePlansIndex({
      roomTypeIDs: full.map((m) => m.roomTypeID),
      startDate: params.startDate,
      endDate: params.endDate,
      promoCode: params.promoCode,
    });

    const nights = getNightsBetween(params.startDate, params.endDate);
    const specsIndex = await fetchRoomTypeLocalSpecsIndex(full.map((m) => m.roomTypeID));

    // Ordenar por `orden` ascendente; los que no tengan `orden` quedan al final
    full.sort((a, b) => {
      const oa = specsIndex.get(a.roomTypeID)?.orden;
      const ob = specsIndex.get(b.roomTypeID)?.orden;
      const va = Number.isFinite(oa as number) ? (oa as number) : Infinity;
      const vb = Number.isFinite(ob as number) ? (ob as number) : Infinity;
      if (va !== vb) return va - vb;
      return a.roomTypeID.localeCompare(b.roomTypeID);
    });

    return full.map((m) => {
      const pricing = pricingIndex.get(m.roomTypeID);
      const rawRatePlans = pricing?.ratePlans ?? [];
      const ratePlans =
        nights >= EXTENDED_STAY_MIN_NIGHTS ? rawRatePlans : rawRatePlans.filter((rp) => !isExtendedStayRatePlan(rp));

      const withPricing: RoomTypeModel = {
        ...m,
        pricing: {
          baseRate: pricing?.baseRate,
          ratePlans,
        },
      };

      return toReducedModel(withPricing, specsIndex.get(m.roomTypeID));
    });
  },

  async listRoomTypesReducedCatalogWithLocalPricing(params: {
    maxGuests?: number;
  }): Promise<RoomTypeReducedModel[]> {
    const roomTypes = await fetchRoomTypesDetails({ maxGuests: params.maxGuests });

    const full: RoomTypeModel[] = [];
    for (const rt of roomTypes) {
      const roomTypeID = asString(rt.roomTypeID);
      const roomTypeName = asString(rt.roomTypeName);
      if (!roomTypeID || !roomTypeName) continue;

      full.push({
        roomTypeID,
        presentation: {
          roomTypeName,
          roomTypeNameShort: asString(rt.roomTypeNameShort),
          roomTypeDescription: asString(rt.roomTypeDescription),
          roomTypePhotos: asStringArray(rt.roomTypePhotos) ?? [],
          maxGuests: asNumber(rt.maxGuests),
          adultsIncluded: asNumber(rt.adultsIncluded),
          childrenIncluded: asNumber(rt.childrenIncluded),
          roomTypeFeatures: normalizeRoomTypeFeatures(rt.roomTypeFeatures),
        },
        inventory: {
          roomIDs: [],
          roomNames: [],
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

    const specsIndex = await fetchRoomTypeLocalSpecsIndex(full.map((m) => m.roomTypeID));
    const pricingIndex = await fetchRoomTypeLocalPricingIndex(full.map((m) => m.roomTypeID));
    await enrichPricingIndexWithCloudBeds(full.map((m) => m.roomTypeID), pricingIndex);

    // Ordenar por `orden` ascendente; los que no tengan `orden` quedan al final
    full.sort((a, b) => {
      const oa = specsIndex.get(a.roomTypeID)?.orden;
      const ob = specsIndex.get(b.roomTypeID)?.orden;
      const va = Number.isFinite(oa as number) ? (oa as number) : Infinity;
      const vb = Number.isFinite(ob as number) ? (ob as number) : Infinity;
      if (va !== vb) return va - vb;
      return a.roomTypeID.localeCompare(b.roomTypeID);
    });

    return full.map((m) => toReducedModel(m, specsIndex.get(m.roomTypeID), { includePortadaMenu: true }, pricingIndex.get(m.roomTypeID)));
  },

  async getRoomTypeReducedDetailWithLocalPricing(params: {
    roomTypeID: string;
    maxGuests?: number;
  }): Promise<RoomTypeReducedDetailModel | null> {
    const details = await fetchRoomTypesDetails({ roomTypeIDs: [params.roomTypeID], maxGuests: params.maxGuests });
    const rt = details[0];
    if (!rt) return null;

    const roomTypeID = asString(rt.roomTypeID);
    const roomTypeName = asString(rt.roomTypeName);
    if (!roomTypeID || !roomTypeName) return null;

    const model: RoomTypeModel = {
      roomTypeID,
      presentation: {
        roomTypeName,
        roomTypeNameShort: asString(rt.roomTypeNameShort),
        roomTypeDescription: asString(rt.roomTypeDescription),
        roomTypePhotos: asStringArray(rt.roomTypePhotos) ?? [],
        maxGuests: asNumber(rt.maxGuests),
        adultsIncluded: asNumber(rt.adultsIncluded),
        childrenIncluded: asNumber(rt.childrenIncluded),
        roomTypeFeatures: normalizeRoomTypeFeatures(rt.roomTypeFeatures),
      },
      inventory: {
        roomIDs: [],
        roomNames: [],
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
    };

    const specsIndex = await fetchRoomTypeLocalSpecsIndex([params.roomTypeID]);
    const pricingIndex = await fetchRoomTypeLocalPricingIndex([params.roomTypeID]);
    await enrichPricingIndexWithCloudBeds([params.roomTypeID], pricingIndex);
    return toReducedDetailModel(
      model,
      specsIndex.get(params.roomTypeID),
      { applyFallbackDefaults: false, portadaOnly: true, includePortadaMenu: true },
      pricingIndex.get(params.roomTypeID)
    );
  },

  async getRoomTypeReducedDetailWithPricing(params: {
    roomTypeID: string;
    startDate: string;
    endDate: string;
    maxGuests?: number;
    promoCode?: string;
  }): Promise<RoomTypeReducedDetailModel | null> {
    const full = await this.getRoomTypeWithPricing(params);
    if (!full) return null;

    return toReducedDetailModel(full, undefined, { applyFallbackDefaults: false });
  },
  };
