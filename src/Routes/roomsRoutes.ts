import { Router } from "express";
import { RoomsController } from "../Controllers/RoomsController";

const router = Router();

router.get("/", RoomsController.getRooms);
router.get("/show-lite", RoomsController.showRoomTypesLite);
router.get("/show", RoomsController.showRoomTypes);
router.get("/show/:roomTypeID", RoomsController.showRoomTypeById);
router.get("/types", RoomsController.getRoomTypes);

export default router;
