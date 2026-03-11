import { Router } from "express";
import { ItemsController } from "../Controllers/ItemsController";

const router = Router();

router.get("/", ItemsController.getItems);
router.post("/", ItemsController.postItem);

export default router;
