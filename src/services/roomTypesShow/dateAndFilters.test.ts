import { describe, it, expect } from "vitest";
import { getNightsBetween, normalizeForSearch, isExtendedStayRatePlan } from "./dateAndFilters";
import type { RateSummary } from "../../models/RateSummary";

const ratePlan = (overrides: Partial<RateSummary>): RateSummary => ({
  rateID: "r1",
  roomRate: 100,
  totalRate: 100,
  roomsAvailable: 1,
  isDerived: false,
  ...overrides,
});

describe("getNightsBetween", () => {
  it("calcula noches entre dos fechas YYYY-MM-DD", () => {
    expect(getNightsBetween("2026-01-01", "2026-01-05")).toBe(4);
  });

  it("devuelve 0 si endDate no es posterior a startDate", () => {
    expect(getNightsBetween("2026-01-05", "2026-01-01")).toBe(0);
    expect(getNightsBetween("2026-01-01", "2026-01-01")).toBe(0);
  });

  it("devuelve 0 con fechas mal formadas", () => {
    expect(getNightsBetween("not-a-date", "2026-01-05")).toBe(0);
  });
});

describe("normalizeForSearch", () => {
  it("pasa a minúsculas y quita acentos", () => {
    expect(normalizeForSearch("Estadía Extendida")).toBe("estadia extendida");
  });
});

describe("isExtendedStayRatePlan", () => {
  it("detecta 'estadia extendida' en el nombre público", () => {
    expect(isExtendedStayRatePlan(ratePlan({ ratePlanNamePublic: "Estadía Extendida" }))).toBe(true);
  });

  it("detecta 'extended stay' en el nombre privado", () => {
    expect(isExtendedStayRatePlan(ratePlan({ ratePlanNamePrivate: "Extended Stay Rate" }))).toBe(true);
  });

  it("detecta 'long stay'", () => {
    expect(isExtendedStayRatePlan(ratePlan({ ratePlanNamePublic: "Long Stay Discount" }))).toBe(true);
  });

  it("detecta derivedType que incluye 'extended'", () => {
    expect(isExtendedStayRatePlan(ratePlan({ ratePlanNamePublic: "Plan Normal", derivedType: "extended_stay" }))).toBe(true);
  });

  it("devuelve false para un plan regular", () => {
    expect(isExtendedStayRatePlan(ratePlan({ ratePlanNamePublic: "Tarifa Estandar" }))).toBe(false);
  });
});
