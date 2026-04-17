import LandingPageSection from "../models/LandingPageSection";

export type LandingPageSectionDto = {
  id: string;
  name: string;
};

const toDto = (doc: { _id: unknown; name: string }): LandingPageSectionDto => ({
  id: String(doc._id),
  name: doc.name,
});

export const LandingPageSectionsService = {
  async create(name: string): Promise<LandingPageSectionDto> {
    const doc = await LandingPageSection.create({ name });
    return toDto(doc);
  },

  async listAll(): Promise<LandingPageSectionDto[]> {
    const docs = await LandingPageSection.find({}).sort({ name: 1 }).lean();
    return docs.map(toDto);
  },
};