import { describe, it, expect } from "vitest";
import { preferLocalText, preferLocalNumber } from "./localOverride";

describe("preferLocalText", () => {
  it("usa el valor local cuando tiene contenido", () => {
    expect(preferLocalText("Bungalow Parejas", "Cloudbeds Name")).toBe("Bungalow Parejas");
  });

  it("cae al fallback de Cloudbeds cuando el local es undefined", () => {
    expect(preferLocalText(undefined, "Cloudbeds Name")).toBe("Cloudbeds Name");
  });

  it("cae al fallback cuando el local es string vacío", () => {
    expect(preferLocalText("", "Cloudbeds Name")).toBe("Cloudbeds Name");
  });

  it("cae al fallback cuando el local es solo espacios", () => {
    expect(preferLocalText("   ", "Cloudbeds Name")).toBe("Cloudbeds Name");
  });

  it("recorta espacios del valor local antes de usarlo", () => {
    expect(preferLocalText("  Bungalow Parejas  ", "Cloudbeds Name")).toBe("Bungalow Parejas");
  });

  it("devuelve undefined si tanto local como fallback están vacíos", () => {
    expect(preferLocalText(undefined, undefined)).toBeUndefined();
    expect(preferLocalText("", undefined)).toBeUndefined();
  });
});

describe("preferLocalNumber", () => {
  it("usa el valor local cuando es un número finito", () => {
    expect(preferLocalNumber(4, 2)).toBe(4);
  });

  it("cae al fallback cuando el local es null", () => {
    expect(preferLocalNumber(null, 2)).toBe(2);
  });

  it("cae al fallback cuando el local es undefined", () => {
    expect(preferLocalNumber(undefined, 2)).toBe(2);
  });

  it("acepta 0 como override local válido (no lo confunde con falsy)", () => {
    expect(preferLocalNumber(0, 2)).toBe(0);
  });

  it("cae al fallback si el local no es finito (NaN/Infinity)", () => {
    expect(preferLocalNumber(NaN, 2)).toBe(2);
    expect(preferLocalNumber(Infinity, 2)).toBe(2);
  });

  it("devuelve undefined si tanto local como fallback están ausentes", () => {
    expect(preferLocalNumber(null, undefined)).toBeUndefined();
    expect(preferLocalNumber(undefined, undefined)).toBeUndefined();
  });
});
