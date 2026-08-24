import { RoomsService, type JsonObject } from "../../services/rooms.service";

/** Igual que RoomsService.getAllRoomTypesMap(), pero nunca lanza — si CloudBeds no está disponible se usan solo datos locales. */
export const fetchCloudbedsRoomTypesMapSafe = async (): Promise<Map<string, JsonObject>> => {
  try {
    return await RoomsService.getAllRoomTypesMap();
  } catch {
    return new Map();
  }
};

/** Igual que RoomsService.getCloudBedsRatesMap(), pero nunca lanza — si CloudBeds no está disponible se usa solo el precio local. */
export const fetchCloudbedsRatesMapSafe = async (): Promise<Map<string, { totalRate?: number; ofertaRate?: number }>> => {
  try {
    return await RoomsService.getCloudBedsRatesMap();
  } catch {
    return new Map();
  }
};
