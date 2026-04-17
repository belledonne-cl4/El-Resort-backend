import mongoose, { Document, Schema } from "mongoose";

export type LandingPageSectionType = Document & {
  name: string;
};

const LandingPageSectionSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      index: true,
    },
  },
  { timestamps: true }
);

const LandingPageSection = mongoose.model<LandingPageSectionType>("LandingPageSection", LandingPageSectionSchema);

export default LandingPageSection;