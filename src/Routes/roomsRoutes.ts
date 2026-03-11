import { Router } from "express";
import { RoomsController } from "../Controllers/RoomsController";

const router = Router();

router.get("/", RoomsController.getRooms);

export default router;

