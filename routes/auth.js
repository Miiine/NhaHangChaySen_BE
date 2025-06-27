import express from "express";

import {
    login,
    register,
    refresh,
    googleLogin,
    facebookLogin,
    activateAccount,
    requestPasswordReset,
    resetPassword,
} from "../controllers/auth.controller.js";
import { verifyToken } from "../middleware/verifyToken.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/refresh", refresh);
router.post("/google-login", googleLogin);
router.post("/facebook-login", facebookLogin);
router.get("/activate-account", activateAccount);
router.post("/request-password-reset", requestPasswordReset);
router.post("/reset-password", resetPassword);

router.get("/home", verifyToken, (req, res) => {
    res.json({ message: `Chào ${req.user.email}, bạn đã vào được home` });
});

export default router;
