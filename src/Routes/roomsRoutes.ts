import { Router } from "express";
import { RoomsController } from "../Controllers/RoomsController";

const router = Router();

router.get("/", RoomsController.getRooms);
router.get("/show", RoomsController.showRoomTypes);
router.get("/types", RoomsController.getRoomTypes);

export default router;
