import { Router } from "express";
import { param, body } from "express-validator";
import multer from "multer";
import { LandingMediaController } from "../Controllers/LandingMediaController";
import { handleInputErrors } from "../middleware/validation";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { files: 100 } });

router.post(
  "/",
  upload.any(),
  body("payload").optional().isString().withMessage("payload debe ser string JSON en multipart"),
  handleInputErrors,
  LandingMediaController.create
);

router.get("/", LandingMediaController.list);

router.get("/lookup", LandingMediaController.getByIdentifier);

router.get("/storage/files", LandingMediaController.listStorageFiles);
router.delete("/storage/files", LandingMediaController.deleteStorageFiles);

router.patch(
  "/",
  upload.any(),
  body("payload").optional().isString().withMessage("payload debe ser string JSON en multipart"),
  handleInputErrors,
  LandingMediaController.updateById
);

router.get(
  "/:id",
  param("id").isMongoId().withMessage("id debe ser un ObjectId valido"),
  handleInputErrors,
  LandingMediaController.getById
);

router.patch(
  "/:id",
  upload.any(),
  param("id").isMongoId().withMessage("id debe ser un ObjectId valido"),
  body("payload").optional().isString().withMessage("payload debe ser string JSON en multipart"),
  handleInputErrors,
  LandingMediaController.updateById
);

router.delete(
  "/:id",
  param("id").isMongoId().withMessage("id debe ser un ObjectId valido"),
  handleInputErrors,
  LandingMediaController.deleteById
);

export default router;
