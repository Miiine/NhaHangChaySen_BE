import express from "express";

import {
    fetchAllLoaiMonAn,
    deleteLoaiMonAn,
    addLoaiMonAn,
    updateLoaiMonAn,
} from "../controllers/loaimonan.controller.js";

const router = express.Router();
router.get("/", fetchAllLoaiMonAn);

router.delete("/:maLoai", deleteLoaiMonAn);

router.post("/", addLoaiMonAn);
router.put("/:maLoai", updateLoaiMonAn);
export default router;
