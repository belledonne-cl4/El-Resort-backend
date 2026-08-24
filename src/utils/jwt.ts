import jwt from "jsonwebtoken";
import Types from "mongoose";
import { getJwtConfigFromEnv } from "../config/jwt";

type UserPayload = {
  id: Types.ObjectId;
  rol: "admin" | "host" | "kitchen-admin" | "kitchen-host" | "delivery" | "chofer" | "marketing";
};

export const generateJWT = (payload: UserPayload) => {
  const { secret } = getJwtConfigFromEnv();
  const token = jwt.sign(payload, secret, {
    expiresIn: "180d",
  });
  return token;
};
