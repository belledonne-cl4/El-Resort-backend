import mongoose, { Schema, Document } from "mongoose";

export type CondominioType = Document & {
  name: string;
  mapUrl?: string;
};

const CondominioSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      index: true,
    },
    mapUrl: {
      type: String,
      required: false,
      trim: true,
    },
  },
  { timestamps: true }
);

const Condominio = mongoose.model<CondominioType>("Condominio", CondominioSchema);

export default Condominio;
