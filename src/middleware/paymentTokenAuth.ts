import type { NextFunction, Request, Response } from "express";
import { PaymentTokenService } from "../utils/paymentToken";

declare global {
  namespace Express {
    interface Request {
      payment?: { reservationID: string };
    }
  }
}

export const requirePaymentToken = (req: Request, res: Response, next: NextFunction): void => {
  const header = typeof req.headers.authorization === "string" ? req.headers.authorization.trim() : "";
  if (!header.toLowerCase().startsWith("bearer ")) {
    res.status(401).json({ error: "No autorizado" });
    return;
  }

  const token = header.slice("bearer ".length).trim();
  try {
    const payload = PaymentTokenService.verify(token);
    req.payment = payload;
    next();
  } catch {
    res.status(401).json({ error: "Token inválido o expirado" });
  }
};

