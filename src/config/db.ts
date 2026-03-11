import mongoose from "mongoose";
import colors from "colors";

export const connectDB = async () => {
  try {
    const connection = await mongoose.connect(process.env.DATABASE_URL);
    const url = `${connection.connection.host}:${connection.connection.port}/${connection.connection.name}`;
    console.log(
      colors.green.bold(`MongoDB Connectado en: ${url}`)
    );
  } catch (error) {
    console.error(colors.red.bold(`Error al conectar a: ${error.message}`));
    process.exit(1);
  }
};
