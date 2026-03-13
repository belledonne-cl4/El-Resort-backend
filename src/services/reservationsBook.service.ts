import { ReservationService, type JsonObject } from "./reservation.service";
import { ItemsService } from "./items.service";
import { GuestsService } from "./guests.service";

type BookReservationRequest = {
  propertyID?: string | null;
  sourceID?: string | null;
  thirdPartyIdentifier?: string | null;
  startDate: string;
  endDate: string;
  guestFirstName: string;
  guestLastName: string;
  guestGender: "M" | "F" | "N/A";
  guestCountry: string;
  guestZip?: string | null;
  guestEmail: string;
  guestPhone?: string | null;
  estimatedArrivalTime?: string | null;
  rooms: Array<{ roomTypeID: string; quantity: number; roomID?: string; roomRateID?: string }>;
  adults?: Array<{ roomTypeID: string; quantity: number; roomID?: string }>;
  children?: Array<{ roomTypeID: string; quantity: number; roomID?: string }>;
  extraGuests?: Array<{
    guestFirstName: string;
    guestLastName: string;
    guestGender: "M" | "F" | "N/A";
    guestCountry: string;
    guestEmail: string;
    guestPhone?: string | null;
  }> | null;
  paymentMethod?: unknown;
  cardToken?: unknown;
  paymentAuthorizationCode?: unknown;
  customFields: Array<{ fieldName: string; fieldValue: string }>;
  promoCode?: string | null;
  mascota?: number | null;
};

const isRecord = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);
const asTrimmedString = (value: unknown): string | undefined => (typeof value === "string" ? value.trim() : undefined);
const asStringOrNumber = (value: unknown): string | undefined => {
  if (typeof value === "string") {
    const s = value.trim();
    return s.length ? s : undefined;
  }
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return undefined;
};
const asInt = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isInteger(value)) return value;
  if (typeof value === "string" && value.trim().length) {
    const n = Number(value.trim());
    if (Number.isInteger(n)) return n;
  }
  return undefined;
};

const parseYmdToUtcMs = (value: string): number | undefined => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return undefined;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return undefined;
  const ms = Date.UTC(year, month - 1, day);
  const d = new Date(ms);
  if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) return undefined;
  return ms;
};

const getNightsBetween = (startDate: string, endDate: string): number => {
  const startMs = parseYmdToUtcMs(startDate);
  const endMs = parseYmdToUtcMs(endDate);
  if (startMs === undefined) throw new Error("startDate inválido (formato esperado YYYY-MM-DD)");
  if (endMs === undefined) throw new Error("endDate inválido (formato esperado YYYY-MM-DD)");

  const msPerDay = 24 * 60 * 60 * 1000;
  const diff = (endMs - startMs) / msPerDay;
  if (!Number.isInteger(diff) || diff <= 0) throw new Error("Rango de fechas inválido (endDate debe ser mayor a startDate)");
  return diff;
};

const getReservationIDFromResponse = (response: JsonObject): string | undefined => {
  const direct = response["reservationID"];
  if (typeof direct === "string" && direct.trim()) return direct.trim();
  if (typeof direct === "number" && Number.isFinite(direct)) return String(direct);

  const data = response["data"];
  if (data && typeof data === "object" && !Array.isArray(data)) {
    const rid = (data as Record<string, unknown>)["reservationID"];
    if (typeof rid === "string" && rid.trim()) return rid.trim();
    if (typeof rid === "number" && Number.isFinite(rid)) return String(rid);
  }

  return undefined;
};

  export const ReservationsBookService = {
    async book(rawBody: unknown): Promise<{ reservation: JsonObject; mascotaItem?: JsonObject }> {
      if (!isRecord(rawBody)) throw new Error("Body inválido (se espera JSON objeto)");

      const sourceID: null = null;
      const startDate = asTrimmedString(rawBody.startDate);
      const endDate = asTrimmedString(rawBody.endDate);
      const guestFirstName = asTrimmedString(rawBody.guestFirstName);
      const guestLastName = asTrimmedString(rawBody.guestLastName);
      const guestGender = asTrimmedString(rawBody.guestGender) as BookReservationRequest["guestGender"] | undefined;
      const guestCountry = asTrimmedString(rawBody.guestCountry);
      const guestEmail = asTrimmedString(rawBody.guestEmail);
      const paymentMethod = asTrimmedString(rawBody.paymentMethod);
      const cardToken = asTrimmedString(rawBody.cardToken);
      const paymentAuthorizationCode = asTrimmedString(rawBody.paymentAuthorizationCode);

      if (!startDate) throw new Error("startDate es requerido");
      if (!endDate) throw new Error("endDate es requerido");
      if (!guestFirstName) throw new Error("guestFirstName es requerido");
      if (!guestLastName) throw new Error("guestLastName es requerido");
    if (!guestEmail) throw new Error("guestEmail es requerido");
    if (!guestCountry) throw new Error("guestCountry es requerido");
    if (guestGender !== "M" && guestGender !== "F" && guestGender !== "N/A") throw new Error("guestGender inválido");

    const customFieldsRaw = rawBody.customFields;
    if (!Array.isArray(customFieldsRaw)) throw new Error("customFields es requerido");

    const customFields = customFieldsRaw
      .map((v) => (isRecord(v) ? { fieldName: asTrimmedString(v.fieldName), fieldValue: asTrimmedString(v.fieldValue) } : null))
      .filter((v): v is { fieldName: string; fieldValue: string } => !!v && !!v.fieldName && !!v.fieldValue);

    const requiredFieldNames = new Set(["DNI", "Ciudaddeprocedencia"]);
    const present = new Set(customFields.map((f) => f.fieldName));
    for (const name of requiredFieldNames) {
      if (!present.has(name)) throw new Error(`customFields debe incluir fieldName=${name}`);
    }

    const roomsRaw = rawBody.rooms;
    if (!Array.isArray(roomsRaw) || roomsRaw.length === 0) throw new Error("rooms es requerido");
    const rooms = roomsRaw
      .map((v) => {
        if (!isRecord(v)) return null;
        const roomTypeID = asTrimmedString(v.roomTypeID);
        const quantity = asInt(v.quantity);
        if (!roomTypeID || !quantity || quantity < 1) return null;
        const roomID = asTrimmedString(v.roomID);
        const roomRateID = asTrimmedString(v.roomRateID);
        return {
          roomTypeID,
          quantity,
          ...(roomID ? { roomID } : {}),
          ...(roomRateID ? { roomRateID } : {}),
        } as { roomTypeID: string; quantity: number; roomID?: string; roomRateID?: string };
      })
      .filter((v): v is { roomTypeID: string; quantity: number; roomID?: string; roomRateID?: string } => !!v);
    if (rooms.length === 0) throw new Error("rooms inválido");

    const adultsRaw = rawBody.adults;
    const adults = Array.isArray(adultsRaw)
      ? adultsRaw
          .map((v) => {
            if (!isRecord(v)) return null;
            const roomTypeID = asTrimmedString(v.roomTypeID);
            const quantity = asInt(v.quantity);
            if (!roomTypeID || quantity === undefined || quantity < 0) return null;
            const roomID = asTrimmedString(v.roomID);
            return {
              roomTypeID,
              quantity,
              ...(roomID ? { roomID } : {}),
            } as { roomTypeID: string; quantity: number; roomID?: string };
          })
          .filter((v): v is { roomTypeID: string; quantity: number; roomID?: string } => !!v)
      : undefined;

      const childrenRaw = rawBody.children;
      const children = Array.isArray(childrenRaw)
        ? childrenRaw
            .map((v) => {
              if (!isRecord(v)) return null;
              const roomTypeID = asTrimmedString(v.roomTypeID);
              const quantity = asInt(v.quantity);
              if (!roomTypeID || quantity === undefined || quantity < 0) return null;
              const roomID = asTrimmedString(v.roomID);
              return {
                roomTypeID,
                quantity,
                ...(roomID ? { roomID } : {}),
              } as { roomTypeID: string; quantity: number; roomID?: string };
            })
            .filter((v): v is { roomTypeID: string; quantity: number; roomID?: string } => !!v)
        : undefined;

      const mascota = rawBody.mascota === null ? null : asInt(rawBody.mascota);
      if (mascota !== undefined && mascota !== null && mascota < 0) throw new Error("mascota inválido");

      const extraGuestsRaw = rawBody.extraGuests;
      const extraGuests =
        extraGuestsRaw === undefined || extraGuestsRaw === null
          ? undefined
          : Array.isArray(extraGuestsRaw)
            ? extraGuestsRaw.map((v, idx) => {
                if (!isRecord(v)) throw new Error(`extraGuests[${idx}] inválido`);
                const extraGuestFirstName = asTrimmedString(v.guestFirstName);
                const extraGuestLastName = asTrimmedString(v.guestLastName);
                const extraGuestGender = asTrimmedString(v.guestGender) as BookReservationRequest["guestGender"] | undefined;
                const extraGuestCountry = asTrimmedString(v.guestCountry);
                const extraGuestEmail = asTrimmedString(v.guestEmail);
                const extraGuestPhone = asStringOrNumber(v.guestPhone);

                if (!extraGuestFirstName) throw new Error(`extraGuests[${idx}].guestFirstName es requerido`);
                if (!extraGuestLastName) throw new Error(`extraGuests[${idx}].guestLastName es requerido`);
                if (!extraGuestEmail) throw new Error(`extraGuests[${idx}].guestEmail es requerido`);
                if (!extraGuestCountry) throw new Error(`extraGuests[${idx}].guestCountry es requerido`);
                if (extraGuestGender !== "M" && extraGuestGender !== "F" && extraGuestGender !== "N/A") {
                  throw new Error(`extraGuests[${idx}].guestGender inválido`);
                }

                return {
                  guestFirstName: extraGuestFirstName,
                  guestLastName: extraGuestLastName,
                  guestGender: extraGuestGender,
                  guestCountry: extraGuestCountry,
                  guestEmail: extraGuestEmail,
                  guestPhone: extraGuestPhone ?? null,
                };
              })
            : (() => {
                throw new Error("extraGuests inválido");
              })();

      const reservationBody: JsonObject = {
        propertyID: asTrimmedString(rawBody.propertyID),
        sourceID,
        thirdPartyIdentifier: asTrimmedString(rawBody.thirdPartyIdentifier),
        startDate,
        endDate,
        guestFirstName,
        guestLastName,
        guestGender,
        guestCountry,
        guestZip: asTrimmedString(rawBody.guestZip),
        guestEmail,
        guestPhone: asStringOrNumber(rawBody.guestPhone) ?? null,
        guestRequirements: null,
        estimatedArrivalTime: asTrimmedString(rawBody.estimatedArrivalTime) || "14:00",
        rooms,
        adults,
        children,
        paymentMethod: paymentMethod ?? null,
        cardToken: cardToken ?? null,
        paymentAuthorizationCode: paymentAuthorizationCode ?? null,
        customFields: customFields.map((f) => ({ fieldName: f.fieldName, fieldValue: f.fieldValue })),
        promoCode: asTrimmedString(rawBody.promoCode),
        allotmentBlockCode: null,
        groupCode: null,
        dateCreated: null,
        sendEmailConfirmation: true,
      };

      const reservation = await ReservationService.postReservation(reservationBody);

      const shouldPostGuests = !!(extraGuests && extraGuests.length > 0);
      const shouldPostMascota = !!(mascota && mascota > 0);
      const shouldResolveReservationID = shouldPostGuests || shouldPostMascota;

      const reservationID = shouldResolveReservationID ? getReservationIDFromResponse(reservation) : undefined;
      if (shouldResolveReservationID && !reservationID) {
        throw new Error("No se pudo obtener reservationID de la respuesta de postReservation");
      }

      if (shouldPostGuests && reservationID) {
        await Promise.all(
          extraGuests!.map((guest) =>
            GuestsService.postGuest({
              propertyID: "297440",
              reservationID,
              guestFirstName: guest.guestFirstName,
              guestLastName: guest.guestLastName,
              guestGender: guest.guestGender,
              guestCountry: guest.guestCountry,
              guestEmail: guest.guestEmail,
              guestPhone: guest.guestPhone ?? null,
            })
          )
        );
      }

      if (!shouldPostMascota || !reservationID) {
        return { reservation };
      }

      const nights = getNightsBetween(startDate, endDate);
      const mascotaUnitPrice = 50 * nights;

      const mascotaItem = await ItemsService.postItem({
        propertyID: "297440",
        reservationID,
        houseAccountID: null,
        groupCode: null,
        subReservationID: null,
        itemID: "1255871",
        itemQuantity: mascota,
        itemPrice: String(mascotaUnitPrice),
        itemNote: "Item agregado por API",
        itemPaid: false,
        saleDate: null,
        payments: null,
      });

      return { reservation, mascotaItem };
    },
  };
