import { Router } from "express";
import { IzipayController } from "../Controllers/IzipayController";
import { requirePaymentToken } from "../middleware/paymentTokenAuth";

const router = Router();

router.post("/formtoken", IzipayController.formtoken);
router.post("/formtoken/from-payment-token", requirePaymentToken, IzipayController.formtokenFromPaymentToken);
router.post("/validate", IzipayController.validateSignature);
router.post("/ipn", IzipayController.ipn);

export default router;
