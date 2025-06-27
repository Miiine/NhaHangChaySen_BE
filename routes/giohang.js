import express from "express";

import {
    getAllGioHang,
    addDishesToCart,
    deleteDishFromCart,
    updateQuantityInCart,
} from "../controllers/giohang.controller.js";

const router = express.Router();
router.get("/:maTaiKhoan", getAllGioHang);
router.post("/", addDishesToCart);
router.delete("/:maTaiKhoan/:maMonAn", deleteDishFromCart);
router.put("/", updateQuantityInCart);

export default router;
