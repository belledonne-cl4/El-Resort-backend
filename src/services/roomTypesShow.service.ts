import { type RoomTypeModel } from "../models/RoomType.model";
import type { RoomTypeReducedDetailModel, RoomTypeReducedModel } from "../models/RoomTypeReduced.model";
import { preferLocalText, preferLocalNumber } from "../utils/localOverride";
import { asString, asNumber, asStringArray, asRecord, normalizeRoomTypeFeatures, toReducedModel, toReducedDetailModel, buildLocalBaseRateFallback } from "./roomTypesShow/dto";
import { buildInventoryIndex, fetchAllRoomsForDates, fetchRoomTypesDetails, fetchRatePlansIndex } from "./roomTypesShow/cloudbedsFetch";
import {
  fetchRoomTypeLocalSpecsIndex,
  fetchRoomTypeLocalNameDescriptionIndex,
  fetchRoomTypeLocalPricingIndex,
  enrichPricingIndexWithCloudBeds,
} from "./roomTypesShow/localSpecsIndex";
import { EXTENDED_STAY_MIN_NIGHTS, getNightsBetween, isExtendedStayRatePlan } from "./roomTypesShow/dateAndFilters";

/** Construye el `inventory`/`linkedRoomTypeQty` de un RoomTypeModel a partir de un item crudo de Cloudbeds (o vacío si no hay match). */
const buildLinkedRoomTypeQty = (rt: Record<string, unknown> | undefined) =>
  rt && Array.isArray(rt.linkedRoomTypeQty)
    ? rt.linkedRoomTypeQty
        .map((v) => asRecord(v))
        .filter((v): v is Record<string, unknown> => !!v)
        .map((v) => ({
          roomTypeID: asString(v.roomTypeID) ?? "",
          roomQty: asNumber(v.roomQty) ?? 0,
        }))
        .filter((v) => v.roomTypeID.length > 0 && v.roomQty > 0)
    : undefined;

export const RoomTypesShowService = {
  /**
   * Fuente primaria: las propiedades administradas localmente (`RoomTypeLocalSpecs`), no el
   * catálogo de Cloudbeds — una propiedad sin equivalente en Cloudbeds igual aparece aquí.
   * Cloudbeds se usa solo como enriquecimiento oportunista (fotos/inventario/features) cuando
   * el `roomTypeID` coincide con uno real.
   */
  async listRoomTypesBase(params: { startDate: string; endDate: string; maxGuests?: number }): Promise<RoomTypeModel[]> {
    const nameDescIndex = await fetchRoomTypeLocalNameDescriptionIndex();
    const localRoomTypeIDs = Array.from(nameDescIndex.keys());
    if (localRoomTypeIDs.length === 0) return [];

    const rooms = await fetchAllRoomsForDates({ startDate: params.startDate, endDate: params.endDate });
    const inventoryByRoomType = buildInventoryIndex(rooms);

    const roomTypes = await fetchRoomTypesDetails({ roomTypeIDs: localRoomTypeIDs, maxGuests: params.maxGuests });
    const cloudbedsByID = new Map<string, Record<string, unknown>>();
    for (const rt of roomTypes) {
      const id = asString(rt.roomTypeID);
      if (id) cloudbedsByID.set(id, rt);
    }

    const models: RoomTypeModel[] = [];
    for (const roomTypeID of localRoomTypeIDs) {
      const rt = cloudbedsByID.get(roomTypeID);
      const inventory = inventoryByRoomType.get(roomTypeID) ?? { roomIDs: [], roomNames: [] };
      const localEntry = nameDescIndex.get(roomTypeID);

      models.push({
        roomTypeID,
        presentation: {
          roomTypeName: preferLocalText(localEntry?.roomTypeName, rt ? asString(rt.roomTypeName) : undefined) ?? "",
          roomTypeNameShort: rt ? asString(rt.roomTypeNameShort) : undefined,
          roomTypeDescription: preferLocalText(localEntry?.roomTypeDescription, rt ? asString(rt.roomTypeDescription) : undefined),
          roomTypePhotos: rt ? asStringArray(rt.roomTypePhotos) ?? [] : [],
          // El schema del frontend exige maxGuests siempre presente como number; 0 = "sin dato" (nunca undefined).
          maxGuests: preferLocalNumber(localEntry?.maxGuests, rt ? asNumber(rt.maxGuests) : undefined) ?? 0,
          adultsIncluded: rt ? asNumber(rt.adultsIncluded) : undefined,
          childrenIncluded: rt ? asNumber(rt.childrenIncluded) : undefined,
          roomTypeFeatures: rt ? normalizeRoomTypeFeatures(rt.roomTypeFeatures) : undefined,
        },
        inventory: {
          roomIDs: inventory.roomIDs,
          roomNames: inventory.roomNames,
          totalUnits: rt ? asNumber(rt.roomTypeUnits) : undefined,
          linkedRoomIDs: rt ? asStringArray(rt.linkedRoomIDs) : undefined,
          linkedRoomTypeIDs: rt ? asStringArray(rt.linkedRoomTypeIDs) : undefined,
          linkedRoomTypeQty: buildLinkedRoomTypeQty(rt),
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
      const localPricingIndex = await fetchRoomTypeLocalPricingIndex(roomTypeIDs);

      return baseModels.map((m) => {
        const pricing = pricingIndex.get(m.roomTypeID);
        const rawRatePlans = pricing?.ratePlans ?? [];
        const ratePlans =
          nights >= EXTENDED_STAY_MIN_NIGHTS ? rawRatePlans : rawRatePlans.filter((rp) => !isExtendedStayRatePlan(rp));
        return {
          ...m,
          pricing: {
            baseRate: pricing?.baseRate ?? buildLocalBaseRateFallback(m.roomTypeID, localPricingIndex.get(m.roomTypeID)),
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

  /**
   * Fuente primaria: las propiedades administradas localmente. Cloudbeds es enriquecimiento
   * oportunista por `roomTypeID` coincidente, nunca un requisito de existencia.
   */
  async listRoomTypesReducedCatalogWithLocalPricing(params: {
    maxGuests?: number;
  }): Promise<RoomTypeReducedModel[]> {
    const specsIndex = await fetchRoomTypeLocalSpecsIndex();
    const localRoomTypeIDs = Array.from(specsIndex.keys());
    if (localRoomTypeIDs.length === 0) return [];

    const roomTypes = await fetchRoomTypesDetails({ roomTypeIDs: localRoomTypeIDs, maxGuests: params.maxGuests });
    const cloudbedsByID = new Map<string, Record<string, unknown>>();
    for (const rt of roomTypes) {
      const id = asString(rt.roomTypeID);
      if (id) cloudbedsByID.set(id, rt);
    }

    const full: RoomTypeModel[] = localRoomTypeIDs.map((roomTypeID) => {
      const rt = cloudbedsByID.get(roomTypeID);
      return {
        roomTypeID,
        presentation: {
          roomTypeName: rt ? asString(rt.roomTypeName) ?? "" : "",
          roomTypeNameShort: rt ? asString(rt.roomTypeNameShort) : undefined,
          roomTypeDescription: rt ? asString(rt.roomTypeDescription) : undefined,
          roomTypePhotos: rt ? asStringArray(rt.roomTypePhotos) ?? [] : [],
          maxGuests: rt ? asNumber(rt.maxGuests) : undefined,
          adultsIncluded: rt ? asNumber(rt.adultsIncluded) : undefined,
          childrenIncluded: rt ? asNumber(rt.childrenIncluded) : undefined,
          roomTypeFeatures: rt ? normalizeRoomTypeFeatures(rt.roomTypeFeatures) : undefined,
        },
        inventory: {
          roomIDs: [],
          roomNames: [],
          totalUnits: rt ? asNumber(rt.roomTypeUnits) : undefined,
          linkedRoomIDs: rt ? asStringArray(rt.linkedRoomIDs) : undefined,
          linkedRoomTypeIDs: rt ? asStringArray(rt.linkedRoomTypeIDs) : undefined,
          linkedRoomTypeQty: buildLinkedRoomTypeQty(rt),
        },
        pricing: {
          ratePlans: [],
        },
      };
    });

    const pricingIndex = await fetchRoomTypeLocalPricingIndex(localRoomTypeIDs);
    await enrichPricingIndexWithCloudBeds(localRoomTypeIDs, pricingIndex);

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
    const specsIndex = await fetchRoomTypeLocalSpecsIndex([params.roomTypeID]);
    const localSpecs = specsIndex.get(params.roomTypeID);
    if (!localSpecs) return null;

    const details = await fetchRoomTypesDetails({ roomTypeIDs: [params.roomTypeID], maxGuests: params.maxGuests });
    const rt = details[0];

    const model: RoomTypeModel = {
      roomTypeID: params.roomTypeID,
      presentation: {
        roomTypeName: rt ? asString(rt.roomTypeName) ?? "" : "",
        roomTypeNameShort: rt ? asString(rt.roomTypeNameShort) : undefined,
        roomTypeDescription: rt ? asString(rt.roomTypeDescription) : undefined,
        roomTypePhotos: rt ? asStringArray(rt.roomTypePhotos) ?? [] : [],
        maxGuests: rt ? asNumber(rt.maxGuests) : undefined,
        adultsIncluded: rt ? asNumber(rt.adultsIncluded) : undefined,
        childrenIncluded: rt ? asNumber(rt.childrenIncluded) : undefined,
        roomTypeFeatures: rt ? normalizeRoomTypeFeatures(rt.roomTypeFeatures) : undefined,
      },
      inventory: {
        roomIDs: [],
        roomNames: [],
        totalUnits: rt ? asNumber(rt.roomTypeUnits) : undefined,
        linkedRoomIDs: rt ? asStringArray(rt.linkedRoomIDs) : undefined,
        linkedRoomTypeIDs: rt ? asStringArray(rt.linkedRoomTypeIDs) : undefined,
        linkedRoomTypeQty: buildLinkedRoomTypeQty(rt),
      },
      pricing: {
        ratePlans: [],
      },
    };

    const pricingIndex = await fetchRoomTypeLocalPricingIndex([params.roomTypeID]);
    await enrichPricingIndexWithCloudBeds([params.roomTypeID], pricingIndex);
    return toReducedDetailModel(
      model,
      localSpecs,
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
