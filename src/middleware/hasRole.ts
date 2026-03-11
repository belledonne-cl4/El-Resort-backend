import { Request, Response, NextFunction } from "express";

export const hasRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !req.user.rol || !roles.includes(req.user.rol)) {
      res.status(403).json({ error: "Acceso denegado" });
      return; 
    }
    next();
  };
};