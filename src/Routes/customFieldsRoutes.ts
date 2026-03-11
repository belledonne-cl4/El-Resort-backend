import { Router } from "express";
import { CustomFieldsController } from "../Controllers/CustomFieldsController";

const router = Router();

router.get("/", CustomFieldsController.getCustomFields);

export default router;

