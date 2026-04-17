import jwt from "jsonwebtoken";
import { getPaymentTokenConfigFromEnv } from "../config/paymentToken";

export type PaymentTokenPayload = {
  reservationID: string;
};

type PaymentTokenClaims = PaymentTokenPayload & {
  typ: "payment";
  aud: "izipay:formtoken";
};

const normalizeReservationID = (value: string): string => {
  const v = value.trim();
  if (!v) throw new Error("reservationID es requerido");
  return v;
};

export const PaymentTokenService = {
  sign(payload: PaymentTokenPayload, opts?: { expiresInSeconds?: number }): string {
    const config = getPaymentTokenConfigFromEnv();
    const reservationID = normalizeReservationID(payload.reservationID);

    const claims: PaymentTokenClaims = {
      typ: "payment",
      aud: "izipay:formtoken",
      reservationID,
    };

    const expiresIn = opts?.expiresInSeconds ?? config.ttlSeconds;
    if (!Number.isFinite(expiresIn) || expiresIn <= 0) throw new Error("expiresInSeconds inválido");

    return jwt.sign(claims, config.secret, {
      algorithm: "HS256",
      expiresIn,
    });
  },

  verify(token: string): PaymentTokenPayload {
    const config = getPaymentTokenConfigFromEnv();
    const raw = typeof token === "string" ? token.trim() : "";
    if (!raw) throw new Error("paymentToken es requerido");

    const decoded = jwt.verify(raw, config.secret, {
      algorithms: ["HS256"],
      audience: "izipay:formtoken",
    });

    if (!decoded || typeof decoded !== "object") throw new Error("paymentToken inválido");
    const obj = decoded as Record<string, unknown>;
    if (obj.typ !== "payment") throw new Error("paymentToken inválido");
    if (typeof obj.reservationID !== "string" || !obj.reservationID.trim()) throw new Error("paymentToken inválido");

    return { reservationID: obj.reservationID.trim() };
  },
};
