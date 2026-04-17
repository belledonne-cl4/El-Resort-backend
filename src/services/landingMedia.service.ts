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
    const update: Record<string, unknown> = {};

    if (input.tipo !== undefined) update.tipo = input.tipo;
    if (input.nombre !== undefined) update.nombre = input.nombre;
    if (input.sectionId !== undefined) update.sectionId = input.sectionId ? new mongoose.Types.ObjectId(input.sectionId) : null;
    if (input.json !== undefined) update.json = input.json;

    const doc = await LandingMedia.findByIdAndUpdate(id, update, {
      new: true,
      runValidators: true,
    }).lean();

    if (!doc) return null;
    return toDto(doc);
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
