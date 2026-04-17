import mongoose from "mongoose";
import LandingMedia, { type LandingMediaTipo } from "../models/LandingMedia";

export type LandingMediaDto = {
  id: string;
  tipo: LandingMediaTipo;
  nombre: string;
  sectionId: string | null;
  json: unknown;
  createdAt?: Date;
  updatedAt?: Date;
};

export type CreateLandingMediaInput = {
  tipo: LandingMediaTipo;
  nombre: string;
  sectionId: string | null;
  json: unknown;
};

export type UpdateLandingMediaInput = Partial<CreateLandingMediaInput>;

export type LandingMediaUpdateSelector =
  | { tipo: "GLOBAL"; nombre: string }
  | { tipo: "SECCION"; sectionId: string };

export type LandingMediaConsolidatedDto = {
  globals: Record<string, unknown>;
  sections: Record<string, unknown>;
};

const toDto = (doc: {
  _id: unknown;
  tipo: LandingMediaTipo;
  nombre: string;
  sectionId?: mongoose.Types.ObjectId | null;
  json: unknown;
  createdAt?: Date;
  updatedAt?: Date;
}): LandingMediaDto => ({
  id: String(doc._id),
  tipo: doc.tipo,
  nombre: doc.nombre,
  sectionId: doc.sectionId ? String(doc.sectionId) : null,
  json: doc.json,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
});

const toUpdateObject = (input: UpdateLandingMediaInput): Record<string, unknown> => {
  const update: Record<string, unknown> = {};

  if (input.tipo !== undefined) update.tipo = input.tipo;
  if (input.nombre !== undefined) update.nombre = input.nombre;
  if (input.sectionId !== undefined) update.sectionId = input.sectionId ? new mongoose.Types.ObjectId(input.sectionId) : null;
  if (input.json !== undefined) update.json = input.json;

  return update;
};

export const LandingMediaService = {
  async create(input: CreateLandingMediaInput): Promise<LandingMediaDto> {
    const doc = await LandingMedia.create({
      tipo: input.tipo,
      nombre: input.nombre,
      sectionId: input.sectionId ? new mongoose.Types.ObjectId(input.sectionId) : null,
      json: input.json,
    });

    return toDto(doc);
  },

  async updateById(id: string, input: UpdateLandingMediaInput): Promise<LandingMediaDto | null> {
    const update = toUpdateObject(input);

    const doc = await LandingMedia.findByIdAndUpdate(id, update, {
      new: true,
      runValidators: true,
    }).lean();

    if (!doc) return null;
    return toDto(doc);
  },

  async updateByIdentifier(selector: LandingMediaUpdateSelector, input: UpdateLandingMediaInput): Promise<LandingMediaDto | null> {
    const where: Record<string, unknown> = { tipo: selector.tipo };

    if (selector.tipo === "SECCION") {
      where.sectionId = new mongoose.Types.ObjectId(selector.sectionId);
    } else {
      where.nombre = selector.nombre;
      where.sectionId = null;
    }

    const docs = await LandingMedia.find(where).select({ _id: 1 }).limit(2).lean();
    if (docs.length === 0) return null;

    if (docs.length > 1) {
      throw Object.assign(new Error("Identificador ambiguo, usa update por id"), { status: 409 });
    }

    return this.updateById(String(docs[0]._id), input);
  },

  async getByIdentifier(selector: LandingMediaUpdateSelector): Promise<LandingMediaDto | null> {
    const where: Record<string, unknown> = { tipo: selector.tipo };

    if (selector.tipo === "SECCION") {
      where.sectionId = new mongoose.Types.ObjectId(selector.sectionId);
    } else {
      where.nombre = selector.nombre;
      where.sectionId = null;
    }

    const docs = await LandingMedia.find(where).limit(2).lean();
    if (docs.length === 0) return null;

    if (docs.length > 1) {
      throw Object.assign(new Error("Identificador ambiguo, usa get por id"), { status: 409 });
    }

    return toDto(docs[0]);
  },

  async getById(id: string): Promise<LandingMediaDto | null> {
    const doc = await LandingMedia.findById(id).lean();
    if (!doc) return null;
    return toDto(doc);
  },

  async list(filters?: { tipo?: LandingMediaTipo; sectionId?: string }): Promise<LandingMediaDto[]> {
    const where: Record<string, unknown> = {};

    if (filters?.tipo) where.tipo = filters.tipo;
    if (filters?.sectionId) where.sectionId = new mongoose.Types.ObjectId(filters.sectionId);

    const docs = await LandingMedia.find(where).sort({ createdAt: -1 }).lean();
    return docs.map((d) => toDto(d));
  },

  async getConsolidated(): Promise<LandingMediaConsolidatedDto> {
    const docs = await LandingMedia.find({}).sort({ createdAt: 1 }).lean();

    const globals: Record<string, unknown> = {};
    const sections: Record<string, unknown> = {};

    for (const doc of docs) {
      if (doc.tipo === "GLOBAL") {
        globals[doc.nombre] = doc.json;
        continue;
      }

      sections[doc.nombre] = doc.json;
    }

    return { globals, sections };
  },

  async deleteById(id: string): Promise<boolean> {
    const doc = await LandingMedia.findByIdAndDelete(id).lean();
    return !!doc;
  },
};
