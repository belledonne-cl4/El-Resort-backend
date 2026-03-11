import { Router } from "express";
import { RatesController } from "../Controllers/RatesController";

const router = Router();

router.get("/", RatesController.getRate);
router.get("/plans", RatesController.getRatePlans);

export default router;
