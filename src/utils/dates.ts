import { DateTime } from "luxon";

export const isIsoDateYmd = (value: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(value);

export const getDefaultStayDates = (params?: {
  zone?: string;
  offsetMonths?: number;
  offsetDays?: number;
}): { startDate: string; endDate: string } => {
  const zone = params?.zone ?? process.env.APP_TIMEZONE ?? "America/Lima";
  const offsetMonths = params?.offsetMonths ?? 0;
  const offsetDays = params?.offsetDays ?? 0;

  const start = DateTime.now().setZone(zone).plus({ months: offsetMonths, days: offsetDays }).startOf("day");
  const end = start.plus({ days: 1 });
  return { startDate: start.toISODate() ?? "", endDate: end.toISODate() ?? "" };
};
