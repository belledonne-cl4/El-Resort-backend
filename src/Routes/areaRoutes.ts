import { Router } from "express";
import { body, query } from "express-validator";
import { AreaController } from "../Controllers/AreaController";
import { authenticate } from "../middleware/auth";
import { handleInputErrors } from "../middleware/validation";
import { AREA_CATEGORIAS } from "../models/Area";

const router = Router();

// Obtener todas las áreas
router.get(
  "/",
  query("categoria").optional().isIn(AREA_CATEGORIAS).withMessage("La categoría no es válida"),
  handleInputErrors,
  AreaController.getAllAreas
);

// Crear área
router.post(
  "/",
  authenticate,
  body("nombre").notEmpty().withMessage("El nombre del área es requerido"),
  body("categoria").notEmpty().withMessage("La categoría es requerida"),
  body("categoria").isIn(AREA_CATEGORIAS).withMessage("La categoría no es válida"),
  body("imagenes").optional().isArray().withMessage("Las imágenes deben ser un array"),
  body("imagenes.*").optional().isString().withMessage("Cada imagen debe ser un string"),
  handleInputErrors,
  AreaController.createArea
);

export default router;
