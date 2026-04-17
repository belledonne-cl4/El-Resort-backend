import mongoose, { Schema, Document } from "mongoose";

export interface IReservationPaymentConfirmation extends Document {
  reservationID: string;
  uuid: string;
}

const reservationPaymentConfirmationSchema: Schema = new Schema({
  reservationID: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  uuid: {
    type: String,
    required: true,
    trim: true,
  },
});

const ReservationPaymentConfirmation = mongoose.model<IReservationPaymentConfirmation>(
  "ReservationPaymentConfirmation",
  reservationPaymentConfirmationSchema
);

export default ReservationPaymentConfirmation;

