import rateLimit from "express-rate-limit";

const claimsLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 5, // Máximo 5 reclamos por IP por hora
  message: { error: "Demasiadas solicitudes. Por favor intenta de nuevo más tarde." },
  standardHeaders: true,
  legacyHeaders: false,
});

export default claimsLimiter;
