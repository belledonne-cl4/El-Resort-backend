import { Router } from "express";
import { body, param } from "express-validator";
import { createMemoryUpload } from "../config/upload";
import { BeneficiosController } from "../Controllers/BeneficiosController";
import { handleInputErrors } from "../middleware/validation";
import { authenticate, authenticateOptional } from "../middleware/auth";
import { hasRole } from "../middleware/hasRole";

const router = Router();
// Un icono por beneficio; el límite global de tamaño por archivo ya es suficiente.
const upload = createMemoryUpload(1);

// Público: la web necesita el catálogo. Con token de marketing además devuelve los desactivados.
router.get("/", authenticateOptional, BeneficiosController.list);

// Antes de "/:id" para que "reorder" no se interprete como un id.
router.put(
  "/reorder",
  authenticate,
  hasRole(["marketing"]),
  BeneficiosController.reorder
);

router.post(
  "/",
  authenticate,
  hasRole(["marketing"]),
  upload.any(),
  body("nombreEs").notEmpty().withMessage("nombreEs es requerido"),
  handleInputErrors,
  BeneficiosController.create
);

router.put(
  "/:id",
  authenticate,
  hasRole(["marketing"]),
  upload.any(),
  param("id").isMongoId().withMessage("El id del beneficio no es válido"),
  handleInputErrors,
  BeneficiosController.update
);

router.delete(
  "/:id",
  authenticate,
  hasRole(["marketing"]),
  param("id").isMongoId().withMessage("El id del beneficio no es válido"),
  handleInputErrors,
  BeneficiosController.remove
);

export default router;
