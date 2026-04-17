import { Router } from "express";
import { body, param } from "express-validator";
import multer from "multer";
import { CondominiosController } from "../Controllers/CondominiosController";
import { handleInputErrors } from "../middleware/validation";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { files: 1 } });

router.post(
  "/",
  upload.single("map_url"),
  body("name").isString().notEmpty().withMessage("name es requerido"),
  handleInputErrors,
  CondominiosController.create
);

router.get("/", CondominiosController.list);

router.get(
  "/:id",
  param("id").isString().notEmpty().withMessage("id es requerido"),
  handleInputErrors,
  CondominiosController.getById
);

router.put(
  "/:id",
  upload.single("map_url"),
  param("id").isString().notEmpty().withMessage("id es requerido"),
  body("name").isString().notEmpty().withMessage("name es requerido"),
  handleInputErrors,
  CondominiosController.updateById
);

router.delete(
  "/:id",
  param("id").isString().notEmpty().withMessage("id es requerido"),
  handleInputErrors,
  CondominiosController.deleteById
);

export default router;
