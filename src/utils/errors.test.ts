import { describe, it, expect } from "vitest";
import { toHttpError, getErrorStatus } from "./errors";

describe("toHttpError", () => {
  it("crea un Error normal con .status adjunto", () => {
    const err = toHttpError(404, "No encontrado");
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe("No encontrado");
    expect(err.status).toBe(404);
  });
});

describe("getErrorStatus", () => {
  it("extrae el status de un error creado por toHttpError", () => {
    const err = toHttpError(400, "Validación");
    expect(getErrorStatus(err)).toBe(400);
  });

  it("usa el fallback (500) si el error no tiene status", () => {
    expect(getErrorStatus(new Error("boom"))).toBe(500);
  });

  it("usa el fallback si el error no es un objeto", () => {
    expect(getErrorStatus("un string cualquiera")).toBe(500);
    expect(getErrorStatus(null)).toBe(500);
    expect(getErrorStatus(undefined)).toBe(500);
  });

  it("respeta un fallback custom", () => {
    expect(getErrorStatus(new Error("boom"), 503)).toBe(503);
  });

  it("ignora un status que no sea number", () => {
    const fakeErr = Object.assign(new Error("x"), { status: "404" });
    expect(getErrorStatus(fakeErr)).toBe(500);
  });
});
