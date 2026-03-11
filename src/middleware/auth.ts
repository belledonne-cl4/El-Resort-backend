import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import User, { IUser } from "../models/User";

declare global {
  namespace Express {
    interface Request {
      user?: IUser;
    }
  }
}


export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction,
  optional: boolean = false // Nuevo parámetro
): Promise<void> => {
  try {
    const bearer = req.headers.authorization;
    if (!bearer || !bearer.startsWith("Bearer ")) {
      if (optional) {
        next(); // Continúa sin usuario
        return;
      }
      res.status(401).json({ error: "No Autorizado" });
      return;
    }

    const token = bearer.split(" ")[1];

    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET no está definido");
      res.status(500).json({ error: "Error interno del servidor" });
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET) as JwtPayload;

    if (!decoded || typeof decoded !== "object" || !decoded.id) {
      if (optional) {
        next(); // Continúa sin usuario
        return;
      }
      res.status(401).json({ error: "Token no válido" });
      return;
    }

    const user = await User.findById(decoded.id).select("_id name email rol");

    if (!user) {
      if (optional) {
        next(); // Continúa sin usuario
        return;
      }
      res.status(401).json({ error: "Usuario no encontrado" });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Error en autenticación:", error);
    if (optional) {
      next(); // Continúa sin usuario
      return;
    }
    res.status(401).json({ error: "Token inválido o expirado" });
  }
};

// Helper para autenticación opcional
export const authenticateOptional = (req: Request, res: Response, next: NextFunction) => {
  return authenticate(req, res, next, true);
};


