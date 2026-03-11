import colors from "colors";
import app from "./app";

const port = process.env.PORT || 4000;

app.listen(port, () => {
  console.log(colors.cyan.bold(`Servidor corriendo en http://localhost:${port}`));
});
