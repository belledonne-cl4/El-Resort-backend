import mongoose from "mongoose";
import colors from "colors";

export const connectDB = async () => {
  try {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL no está definido");
    }
    const connection = await mongoose.connect(process.env.DATABASE_URL);
    const url = `${connection.connection.host}:${connection.connection.port}/${connection.connection.name}`;
    console.log(
      colors.green.bold(`MongoDB Connectado en: ${url}`)
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(colors.red.bold(`Error al conectar a: ${message}`));
    process.exit(1);
  }
};
