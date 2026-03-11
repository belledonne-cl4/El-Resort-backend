import { Router } from "express";
import { body } from "express-validator";
import { AuthController } from "../Controllers/AuthController";
import { handleInputErrors } from "../middleware/validation";
import { authenticate } from "../middleware/auth";
import loginLimiter from "../middleware/loginLimiter";

const router = Router();

router.post(
  "/create-account",
  body("name").notEmpty().withMessage("El nombre no puede ir vacio"),
  body("email").isEmail().withMessage("El email no es valido"),
  body("password").isLength({ min: 8 }).withMessage("El password debe tener al menos 8 caracteres"),
  body("password_confirmation").custom((value, { req }) => {
    if (value !== req.body.password) throw new Error("Las contraseñas no coinciden");
    return true;
  }),
  handleInputErrors,
  AuthController.createAccount
);

router.post(
  "/login",
  body("email").isEmail().withMessage("El email no es valido."),
  body("password").notEmpty().withMessage("El password no puede ir vacio."),
  loginLimiter,
  handleInputErrors,
  AuthController.login
);

router.get("/user", authenticate, AuthController.user);

router.post(
  "/change-password",
  authenticate,
  body("current_password").notEmpty().withMessage("La contraseña actual es obligatoria."),
  body("new_password").isLength({ min: 8 }).withMessage("La nueva contraseña debe tener al menos 8 caracteres."),
  body("new_password_confirmation").custom((value, { req }) => {
    if (value !== req.body.new_password) throw new Error("Las nuevas contraseñas no coinciden.");
    return true;
  }),
  handleInputErrors,
  AuthController.changePassword
);

export default router;
