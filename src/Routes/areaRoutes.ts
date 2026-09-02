import { Router } from "express";
import { body, param, query } from "express-validator";
import multer from "multer";
import { createMemoryUpload } from "../config/upload";
import { AreaController } from "../Controllers/AreaController";
import { handleInputErrors } from "../middleware/validation";
import { AREA_CATEGORIAS } from "../models/Area";
import { authenticate } from "../middleware/auth";
import { hasRole } from "../middleware/hasRole";

const router = Router();
const upload = createMemoryUpload(30);

// Reordenar en cascada (array de { id, orden })
router.put(
  "/orden",
  body().isArray({ min: 1 }).withMessage("El body debe ser un array de { id, orden }"),
  handleInputErrors,
  authenticate,
  hasRole(["marketing"]),
  AreaController.updateOrderBulk
);

// Obtener todas las áreas
router.get(
  "/",
  query("categoria").optional().isIn(AREA_CATEGORIAS).withMessage("La categoría no es válida"),
  handleInputErrors,
  AreaController.getAllAreas
);

router.get(
  "/:id",
  param("id").isMongoId().withMessage("El id no es valido"),
  handleInputErrors,
  AreaController.getAreaById
);

// Crear área
router.post(
  "/",
  upload.array("imagenes", 1),
  body("nombre").notEmpty().withMessage("El nombre del área es requerido"),
  body("categoria").notEmpty().withMessage("La categoría es requerida"),
  body("categoria").isIn(AREA_CATEGORIAS).withMessage("La categoría no es válida"),
  handleInputErrors,
  authenticate,
  hasRole(["marketing"]),
  AreaController.createArea
);

router.patch(
  "/:id",
  upload.array("imagenes", 1),
  param("id").isMongoId().withMessage("El id no es valido"),
  body("nombre").optional().isString().withMessage("El nombre debe ser texto"),
  handleInputErrors,
  authenticate,
  hasRole(["marketing"]),
  AreaController.patchAreaById
);

router.delete(
  "/:id",
  param("id").isMongoId().withMessage("El id no es valido"),
  handleInputErrors,
  authenticate,
  hasRole(["marketing"]),
  AreaController.deleteArea
);

router.delete(
  "/:id/imagenes",
  param("id").isMongoId().withMessage("El id no es valido"),
  body("imagen").optional().isString().withMessage("imagen debe ser string"),
  body("imagenes").optional().isArray().withMessage("imagenes debe ser un array"),
  body("imagenes.*").optional().isString().withMessage("Cada imagen debe ser string"),
  handleInputErrors,
  authenticate,
  hasRole(["marketing"]),
  AreaController.deleteAreaImagesById
);

export default router;
