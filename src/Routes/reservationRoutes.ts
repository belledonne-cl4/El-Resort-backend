import { Router } from "express";
import { ReservationController } from "../Controllers/ReservationController";
import { GuestsController } from "../Controllers/GuestsController";
import { ReservationEditionController } from "../Controllers/ReservationEditionController";

const router = Router();

router.get("/", ReservationController.getReservations);
router.post("/", ReservationController.postReservation);
router.post("/book", ReservationController.bookReservation);
router.get("/sources", ReservationController.getSources);
router.get("/assignments", ReservationController.getReservationAssignments);
router.get("/with-rate-details", ReservationController.getReservationsWithRateDetails);
router.put("/:reservationID/confirm", ReservationEditionController.confirmReservation);
router.get("/:reservationID/notes", ReservationController.getReservationNotes);
router.post("/:reservationID/notes", ReservationController.postReservationNote);
router.post("/:reservationID/guests", GuestsController.postGuest);
router.get("/:reservationID", ReservationController.getReservation);

export default router;
