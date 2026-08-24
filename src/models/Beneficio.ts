import mongoose, { Schema, Document } from "mongoose";

/**
 * Catálogo de beneficios incluidos, editable desde el dashboard.
 * Reemplaza a `roomTypeFeatures` de Cloudbeds (texto suelto + icono adivinado por substring):
 * acá el icono lo sube el administrador y cada propiedad elige cuáles muestra
 * (`RoomTypeLocalSpecs.beneficios`).
 */
export type BeneficioType = Document & {
  nombre: {
    es: string;
    /** Si queda vacío, el pipeline de traducción resuelve el inglés. */
    en?: string | null;
  };
  iconUrl: string;
  /** Ruta del objeto en GCS; se guarda para poder borrar el icono al reemplazarlo o eliminarlo. */
  iconFileId?: string | null;
  orden: number;
  isActive: boolean;
};

const BeneficioSchema: Schema = new Schema(
  {
    nombre: {
      es: { type: String, required: true, trim: true },
      en: { type: String, required: false, trim: true, default: null },
    },
    iconUrl: {
      type: String,
      required: true,
      trim: true,
    },
    iconFileId: {
      type: String,
      required: false,
      default: null,
    },
    orden: {
      type: Number,
      required: true,
      default: 0,
      index: true,
    },
    isActive: {
      type: Boolean,
      required: true,
      default: true,
      index: true,
    },
  },
  { timestamps: true }
);

const Beneficio = mongoose.model<BeneficioType>("Beneficio", BeneficioSchema);

export default Beneficio;
