import { CorsOptions } from "cors";

const whitelist = [
  process.env.FRONTEND_URL,
  "http://localhost:4000",
  "http://127.0.0.1:4000",
  "http://localhost:5173",
  "http://localhost:5174",
];

export const corsConfig: CorsOptions = {
  origin: function (origin, callback) {
    if (!origin || whitelist.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: Origen no permitido - ${origin}`));
    }
  },
  credentials: true,
};
