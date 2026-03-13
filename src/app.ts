import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import morgan from "morgan";
import helmet from "helmet";
import _ from "lodash";
import { corsConfig } from "./config/cors";
// import { connectDB } from "./config/db";
import swaggerUi from "swagger-ui-express";
import { createSwaggerSpec } from "./config/swagger";
import authRoutes from "./Routes/authRoutes";
import extraRoutes from "./Routes/extraRoutes";
import reservationRoutes from "./Routes/reservationRoutes";
import customFieldsRoutes from "./Routes/customFieldsRoutes";
import ratesRoutes from "./Routes/ratesRoutes";
import roomsRoutes from "./Routes/roomsRoutes";
import taxesRoutes from "./Routes/taxesRoutes";
import itemsRoutes from "./Routes/itemsRoutes";

dotenv.config();

// connectDB();

const swaggerSpec = createSwaggerSpec();

const app = express();
app.use(cors(corsConfig));
app.use(helmet());
app.use(morgan("dev"));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

app.set("json replacer", (key: string, value: unknown) =>
  key === "__proto__" ? undefined : value
);

const sanitizeInput = <T extends object>(obj: T): Partial<T> =>
  _.omit(obj, ["__proto__", "constructor", "prototype"]);

app.use((req, res, next) => {
  req.body = sanitizeInput(req.body);
  req.query = sanitizeInput(req.query);
  req.params = sanitizeInput(req.params);
  next();
});

app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use("/api/auth", authRoutes);
app.use("/api/extras", extraRoutes);
app.use("/api/reservations", reservationRoutes);
app.use("/api/customfields", customFieldsRoutes);
app.use("/api/rates", ratesRoutes);
app.use("/api/rooms", roomsRoutes);
app.use("/api/taxes", taxesRoutes);
app.use("/api/items", itemsRoutes);

app.use((err: unknown, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (
    err &&
    typeof err === "object" &&
    (err as { type?: unknown }).type === "entity.parse.failed" &&
    typeof (err as { status?: unknown }).status === "number"
  ) {
    res.status(400).json({ error: "JSON inválido (revisa comas finales y comillas dobles)" });
    return;
  }

  next(err);
});


// mostrar los errores bonitos

export default app;
