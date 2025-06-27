import express from "express";

import {
    fetchAllHoaDon,
    addHoaDon,
    uploadPayment,
    createVNPayPayment,
    vnpayReturn,
    updateTrangThai,
    autoCancelHoaDon,
    completeHoaDon,
    updatePayment,
    confirmHoaDon,
    cancelHoaDon,
    customerReceiveTable,
    updateBanHoaDon,
    adminAddHoaDon,
    deleteHoaDon,
    deleteMultipleHoaDon,
    updateHoaDon,
} from "../controllers/hoadon.controller.js";

const router = express.Router();
router.get("/", fetchAllHoaDon);
router.post("/", addHoaDon);
router.put("/:maHoaDon/payment", uploadPayment);
router.post("/create-payment", createVNPayPayment);
router.get("/checkout-return", vnpayReturn);
router.put("/:maHoaDon/status", updateTrangThai);
router.put("/autocancel", autoCancelHoaDon);

// ----------------------Admin--------------------
router.put("/:maHoaDon/complete", completeHoaDon);
router.put("/:maHoaDon/update-payment", updatePayment);
router.put("/:maHoaDon/confirm", confirmHoaDon);
router.put("/:maHoaDon/cancel", cancelHoaDon);
router.put("/:maHoaDon/receive", customerReceiveTable);
router.put("/:maHoaDon/update-ban", updateBanHoaDon);
router.post("/admin", adminAddHoaDon);
router.delete("/multiple", deleteMultipleHoaDon);
router.delete("/:maHoaDon", deleteHoaDon);
router.put("/:maHoaDon/update", updateHoaDon);

export default router;
