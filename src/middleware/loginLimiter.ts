import rateLimit from "express-rate-limit";

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 15, // Máximo 5 intentos por IP
  message: "Demasiados intentos fallidos. Inténtalo más tarde.",
  headers: true, // Devuelve información en los headers
  standardHeaders: true, // Incluye RateLimit en los headers
  legacyHeaders: false, // Desactiva headers antiguos
});

export default loginLimiter;
