import express from "express";

import {
    getAllMAYeuThich,
    toggleFavoriteDishes,
} from "../controllers/yeuthich.controller.js";

const router = express.Router();
router.get("/:maTaiKhoan", getAllMAYeuThich);
router.post("/", toggleFavoriteDishes);

export default router;
