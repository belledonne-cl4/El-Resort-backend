import { Router } from "express";
import { TranslateController } from "../Controllers/TranslateController";

const router = Router();

router.post("/temp", TranslateController.translateTemp);

export default router;
