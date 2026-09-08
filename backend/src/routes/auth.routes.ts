import { Router } from "express";
import { authController } from "../controllers/auth.controller.js";
import { authenticate, authorize } from "../middlewares/auth.middleware.js";

const router = Router();

// Public authentication routes
router.post("/login", authController.login);
router.post("/logout", authController.logout);
router.get("/wallets", authController.getStakeholderWallets);

// Authenticated session profile
router.get("/me", authenticate, authController.getMe);

// Admin-only user management
router.post("/users", authenticate, authorize("admin"), authController.createUser);

export default router;
