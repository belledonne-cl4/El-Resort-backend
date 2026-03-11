import { Router } from "express";
import { TaxesController } from "../Controllers/TaxesController";

const router = Router();

router.get("/", TaxesController.getTaxesAndFees);

export default router;

