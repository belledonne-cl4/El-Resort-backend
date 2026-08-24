import { describe, it, expect } from "vitest";
import mongoose from "mongoose";
import {
  isMongoDuplicateKeyError,
  normalizeFileMap,
  normalizeBedrooms,
  ensureUniqueBedroomNumbers,
  getBedroomKeys,
  normalizeKeptUrls,
  normalizeStringArray,
  normalizeBeneficios,
  normalizeTranslatableText,
  normalizePricing,
  assertImageFiles,
  assertVideoFiles,
} from "./normalize";

const file = (fieldname: string, mimetype: string): Express.Multer.File =>
  ({ fieldname, mimetype } as Express.Multer.File);

describe("isMongoDuplicateKeyError", () => {
  it("detecta el código 11000", () => {
    expect(isMongoDuplicateKeyError({ code: 11000 })).toBe(true);
  });

  it("devuelve false para otros errores", () => {
    expect(isMongoDuplicateKeyError({ code: 500 })).toBe(false);
    expect(isMongoDuplicateKeyError(new Error("x"))).toBe(false);
    expect(isMongoDuplicateKeyError(null)).toBe(false);
  });
});

describe("normalizeFileMap", () => {
  it("enruta archivos por fieldname conocido", () => {
    const files = [
      file("videoFiles", "video/mp4"),
      file("extraGalleryImageFiles", "image/png"),
      file("portadaVideoImageFiles", "image/png"),
      file("portadaImageFiles", "image/png"),
      file("portadaMenuImageFiles", "image/png"),
      file("bedroomFiles[1]", "image/png"),
    ];

    const result = normalizeFileMap(files);
    expect(result.videoFiles).toHaveLength(1);
    expect(result.extraGalleryImageFiles).toHaveLength(1);
    expect(result.portadaVideoImageFiles).toHaveLength(1);
    expect(result.portadaImageFiles).toHaveLength(1);
    expect(result.portadaMenuImageFiles).toHaveLength(1);
    expect(result.bedroomFilesByKey.get("1")).toHaveLength(1);
  });

  it("lanza para un fieldname desconocido", () => {
    expect(() => normalizeFileMap([file("unknownField", "image/png")])).toThrow();
  });

  it("lanza si la key de bedroomFiles viene vacía", () => {
    expect(() => normalizeFileMap([file("bedroomFiles[ ]", "image/png")])).toThrow();
  });
});

describe("normalizeBedrooms", () => {
  it("devuelve [] cuando el valor es undefined", () => {
    expect(normalizeBedrooms(undefined)).toEqual([]);
  });

  it("lanza si no es un array", () => {
    expect(() => normalizeBedrooms({})).toThrow();
  });

  it("devuelve el array tal cual si es válido", () => {
    const bedrooms = [{ number: 1 }];
    expect(normalizeBedrooms(bedrooms)).toBe(bedrooms);
  });
});

describe("ensureUniqueBedroomNumbers", () => {
  it("no lanza con números únicos >= 1", () => {
    expect(() => ensureUniqueBedroomNumbers([{ number: 1 }, { number: 2 }])).not.toThrow();
  });

  it("lanza con números duplicados", () => {
    expect(() => ensureUniqueBedroomNumbers([{ number: 1 }, { number: 1 }])).toThrow();
  });

  it("lanza con un number no entero o < 1", () => {
    expect(() => ensureUniqueBedroomNumbers([{ number: 0 }])).toThrow();
    expect(() => ensureUniqueBedroomNumbers([{ number: 1.5 }])).toThrow();
  });
});

describe("getBedroomKeys", () => {
  it("recolecta _id, clientKey y number sin duplicados", () => {
    expect(getBedroomKeys({ _id: "a", clientKey: "a", number: 1 })).toEqual(["a", "1"]);
  });

  it("ignora campos vacíos o ausentes", () => {
    expect(getBedroomKeys({})).toEqual([]);
  });
});

describe("normalizeKeptUrls", () => {
  it("prefiere keepUrls sobre photos", () => {
    expect(normalizeKeptUrls({ keepUrls: ["a"], photos: ["b"] })).toEqual(["a"]);
  });

  it("cae a photos si no hay keepUrls", () => {
    expect(normalizeKeptUrls({ photos: ["b"] })).toEqual(["b"]);
  });

  it("filtra strings vacíos y recorta espacios", () => {
    expect(normalizeKeptUrls({ keepUrls: ["  a  ", "", "  "] })).toEqual(["a"]);
  });
});

describe("normalizeStringArray", () => {
  it("devuelve undefined si el valor es undefined", () => {
    expect(normalizeStringArray(undefined, "campo")).toBeUndefined();
  });

  it("lanza si no es un array", () => {
    expect(() => normalizeStringArray("x", "campo")).toThrow();
  });

  it("filtra, recorta y descarta vacíos", () => {
    expect(normalizeStringArray([" a ", "", 5, "b"], "campo")).toEqual(["a", "b"]);
  });
});

describe("normalizeBeneficios", () => {
  it("devuelve undefined si el valor es undefined", () => {
    expect(normalizeBeneficios(undefined)).toBeUndefined();
  });

  it("lanza si no es un array", () => {
    expect(() => normalizeBeneficios("x")).toThrow();
  });

  it("lanza si contiene ids inválidos", () => {
    expect(() => normalizeBeneficios(["not-an-objectid"])).toThrow();
  });

  it("deduplica y convierte a ObjectId", () => {
    const id = new mongoose.Types.ObjectId().toHexString();
    const result = normalizeBeneficios([id, id]);
    expect(result).toHaveLength(1);
    expect(result?.[0].toHexString()).toBe(id);
  });
});

describe("normalizeTranslatableText", () => {
  it("devuelve undefined si el valor es undefined", () => {
    expect(normalizeTranslatableText(undefined, "campo")).toBeUndefined();
  });

  it("lanza si no es un objeto", () => {
    expect(() => normalizeTranslatableText("x", "campo")).toThrow();
  });

  it("lanza si es falta el campo es", () => {
    expect(() => normalizeTranslatableText({ en: "hi" }, "campo")).toThrow();
  });

  it("recorta es y preserva en cuando es string", () => {
    expect(normalizeTranslatableText({ es: "  Hola  ", en: "Hi" }, "campo")).toEqual({ es: "Hola", en: "Hi" });
  });

  it("en queda undefined si viene null", () => {
    expect(normalizeTranslatableText({ es: "Hola", en: null }, "campo")).toEqual({ es: "Hola", en: undefined });
  });
});

describe("normalizePricing", () => {
  it("devuelve undefined si el valor es undefined", () => {
    expect(normalizePricing(undefined)).toBeUndefined();
  });

  it("lanza si totalRate es negativo", () => {
    expect(() => normalizePricing({ totalRate: -1 })).toThrow();
  });

  it("lanza si ofertaDelMesRoomRate no es number", () => {
    expect(() => normalizePricing({ ofertaDelMesRoomRate: "x" })).toThrow();
  });

  it("acepta un objeto parcial válido", () => {
    expect(normalizePricing({ totalRate: 100 })).toEqual({ totalRate: 100 });
  });
});

describe("assertImageFiles / assertVideoFiles", () => {
  it("no lanza para mimetypes correctos", () => {
    expect(() => assertImageFiles([file("f", "image/png")], "campo")).not.toThrow();
    expect(() => assertVideoFiles([file("f", "video/mp4")], "campo")).not.toThrow();
  });

  it("lanza para mimetypes incorrectos", () => {
    expect(() => assertImageFiles([file("f", "video/mp4")], "campo")).toThrow();
    expect(() => assertVideoFiles([file("f", "image/png")], "campo")).toThrow();
  });
});
