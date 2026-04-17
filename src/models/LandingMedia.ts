import mongoose, { Schema, Document } from "mongoose";

export const LANDING_MEDIA_TIPOS = ["SECCION", "GLOBAL"] as const;
export type LandingMediaTipo = (typeof LANDING_MEDIA_TIPOS)[number];

export type LandingMediaType = Document & {
  tipo: LandingMediaTipo;
  nombre: string;
  sectionId: mongoose.Types.ObjectId | null;
  json: unknown;
};

const LandingMediaSchema: Schema = new Schema(
  {
    tipo: {
      type: String,
      enum: LANDING_MEDIA_TIPOS,
      required: true,
      trim: true,
      index: true,
    },
    nombre: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    sectionId: {
      type: Schema.Types.ObjectId,
      ref: "LandingPageSection",
      required: false,
      default: null,
      index: true,
    },
    json: {
      type: Schema.Types.Mixed,
      required: true,
    },
  },
  { timestamps: true }
);

LandingMediaSchema.pre("validate", function (next) {
  const current = this as unknown as { tipo?: LandingMediaTipo; sectionId?: mongoose.Types.ObjectId | null };

  if (current.tipo === "SECCION" && !current.sectionId) {
    next(new Error("sectionId es requerido cuando tipo es SECCION"));
    return;
  }

  if (current.tipo === "GLOBAL" && current.sectionId) {
    next(new Error("sectionId debe ser null cuando tipo es GLOBAL"));
    return;
  }

  next();
});

LandingMediaSchema.index({ tipo: 1, nombre: 1, sectionId: 1 }, { unique: true });

const LandingMedia = mongoose.model<LandingMediaType>("LandingMedia", LandingMediaSchema);

export default LandingMedia;
