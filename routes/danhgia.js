import express from "express";

import {
    fetchAllDanhGia,
    addDanhGia,
    updateDanhGia,
} from "../controllers/danhgia.controller.js";

const router = express.Router();
router.get("/", fetchAllDanhGia);
router.post("/", addDanhGia);
router.put("/", updateDanhGia);

export default router;
