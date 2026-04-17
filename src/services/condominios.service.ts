import Condominio from "../models/Condominio";

export type CondominioDto = {
  id: string;
  name: string;
  mapUrl?: string;
};

export const CondominiosService = {
  async create(name: string, mapUrl: string): Promise<CondominioDto> {
    const doc = await Condominio.create({ name, mapUrl });
    return { id: doc._id.toString(), name: doc.name, mapUrl: doc.mapUrl };
  },

  async updateById(id: string, name: string, mapUrl: string): Promise<CondominioDto | null> {
    const doc = await Condominio.findByIdAndUpdate(
      id,
      { name, mapUrl },
      { new: true, runValidators: true }
    ).lean();
    if (!doc) return null;
    return { id: doc._id.toString(), name: doc.name, mapUrl: doc.mapUrl };
  },

  async deleteById(id: string): Promise<boolean> {
    const res = await Condominio.findByIdAndDelete(id).lean();
    return !!res;
  },

  async getById(id: string): Promise<CondominioDto | null> {
    const doc = await Condominio.findById(id).lean();
    if (!doc) return null;
    return { id: doc._id.toString(), name: doc.name, mapUrl: doc.mapUrl };
  },

  async getMapUrlById(id: string): Promise<string | null> {
    const doc = await Condominio.findById(id).select("mapUrl").lean();
    if (!doc) return null;
    return doc.mapUrl ?? null;
  },

  async listAll(): Promise<CondominioDto[]> {
    const docs = await Condominio.find({}).lean();
    return docs.map((d) => ({ id: d._id.toString(), name: d.name, mapUrl: d.mapUrl }));
  },
};
