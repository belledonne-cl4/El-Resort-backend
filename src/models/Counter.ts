import mongoose, { Schema, Document } from "mongoose";

export type CounterType = Document & {
  _id: string;
  seq: number;
};

const counterSchema: Schema = new Schema({
  _id: { type: String, required: true },
  seq: { type: Number, required: true, default: 0 },
});

const Counter = mongoose.model<CounterType>("Counter", counterSchema);

export default Counter;
