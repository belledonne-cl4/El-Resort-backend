import type { RateSummary } from "../../models/RateSummary";

export const EXTENDED_STAY_MIN_NIGHTS = 4;

export const parseYmdToUtcMs = (value: string): number | undefined => {
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

export const getNightsBetween = (startDate: string, endDate: string): number => {
  const startMs = parseYmdToUtcMs(startDate);
  const endMs = parseYmdToUtcMs(endDate);
  if (startMs === undefined || endMs === undefined) return 0;
  const diff = (endMs - startMs) / (24 * 60 * 60 * 1000);
  return Number.isInteger(diff) && diff > 0 ? diff : 0;
};

export const normalizeForSearch = (value: string): string =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

export const isExtendedStayRatePlan = (ratePlan: RateSummary): boolean => {
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
