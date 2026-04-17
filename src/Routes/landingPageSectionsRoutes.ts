import { Router } from "express";
import { body } from "express-validator";
import { LandingPageSectionsController } from "../Controllers/LandingPageSectionsController";
import { handleInputErrors } from "../middleware/validation";

const router = Router();

router.post(
  "/",
  body("name").isString().notEmpty().withMessage("name es requerido"),
  handleInputErrors,
  LandingPageSectionsController.create
);

router.get("/", LandingPageSectionsController.list);

export default router;