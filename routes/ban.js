import express from "express";

import {
    fetchAllBan,
    addBan,
    updateBan,
    deleteBan,
    deleteMultipleBan,
    updateTrangThaiBan,
} from "../controllers/ban.controller.js";

const router = express.Router();
router.get("/", fetchAllBan);

router.post("/", addBan);
router.put("/", updateBan);
router.delete("/:maBan", deleteBan);
router.post("/delete-multiple", deleteMultipleBan);
router.put("/:maBan/update-status", updateTrangThaiBan);

export default router;
