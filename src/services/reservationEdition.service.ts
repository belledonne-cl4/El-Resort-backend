import { ReservationService, type JsonObject } from "./reservation.service";

export const ReservationEditionService = {
  async confirmReservation(reservationID: string): Promise<JsonObject> {
    const trimmedReservationID = reservationID.trim();
    if (!trimmedReservationID) throw new Error("reservationID es requerido");

    return ReservationService.putReservation({
      propertyID: "297440",
      reservationID: trimmedReservationID,
      estimatedArrivalTime: null,
      status: "confirmed",
      checkoutDate: null,
      customFields: null,
      rooms: null,
      dateCreated: null,
      sendStatusChangeEmail: null,
    });
  },
};

