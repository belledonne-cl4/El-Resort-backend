import mongoose, { Schema, Document } from "mongoose";

export type RoomTypeBedroomSpec = {
  number: number;
  description?: string;
  photos: string[];
};

export type RoomTypeLocalSpecsType = Document & {
  roomTypeID: string;
  bathroomsCount: number;
  bedrooms: RoomTypeBedroomSpec[];
  condominioID?: mongoose.Types.ObjectId;
};

const RoomTypeLocalSpecsSchema: Schema = new Schema(
  {
    roomTypeID: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      index: true,
    },
    bathroomsCount: {
      type: Number,
      required: true,
      min: 0,
    },
    bedrooms: {
      type: [
        {
          number: { type: Number, required: true, min: 1 },
          description: { type: String, required: false, trim: true },
          photos: { type: [String], required: true, default: [] },
        },
      ],
      required: true,
      default: [],
    },
    condominioID: {
      type: Schema.Types.ObjectId,
      ref: "Condominio",
      required: false,
      index: true,
    },
  },
  { timestamps: true }
);

const RoomTypeLocalSpecs = mongoose.model<RoomTypeLocalSpecsType>("RoomTypeLocalSpecs", RoomTypeLocalSpecsSchema);

export default RoomTypeLocalSpecs;
