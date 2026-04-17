import { Router } from "express";
import { body, param } from "express-validator";
import multer from "multer";
import { RoomTypeLocalSpecsController } from "../Controllers/RoomTypeLocalSpecsController";
import { handleInputErrors } from "../middleware/validation";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { files: 50 } });

router.post(
  "/",
  body("roomTypeID").isString().notEmpty().withMessage("roomTypeID es requerido"),
  body("bathroomsCount").isInt({ min: 0 }).withMessage("bathroomsCount debe ser un entero >= 0"),
  body("condominioID").optional().isMongoId().withMessage("condominioID debe ser un ObjectId valido"),
  body("bedrooms").isArray().withMessage("bedrooms debe ser un array"),
  body("bedrooms.*.number").isInt({ min: 1 }).withMessage("bedrooms[].number debe ser un entero >= 1"),
  body("bedrooms.*.description").optional().isString().withMessage("bedrooms[].description debe ser string"),
  body("bedrooms.*.photos").optional().isArray().withMessage("bedrooms[].photos debe ser un array"),
  body("bedrooms.*.photos.*").optional().isString().withMessage("Cada photo debe ser string"),
  handleInputErrors,
  RoomTypeLocalSpecsController.create
);

router.get(
  "/:roomTypeID",
  param("roomTypeID").isString().notEmpty().withMessage("roomTypeID es requerido"),
  handleInputErrors,
  RoomTypeLocalSpecsController.getByRoomTypeID
);

router.put(
  "/:roomTypeID",
  upload.any(),
  param("roomTypeID").isString().notEmpty().withMessage("roomTypeID es requerido"),
  body("payload").optional().isString().withMessage("payload debe ser string JSON en multipart"),
  handleInputErrors,
  RoomTypeLocalSpecsController.updateByRoomTypeID
);

export default router;
