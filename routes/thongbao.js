import express from "express";

import {
    fetchAllThongBao,
    markAsRead,
    createThongBao,
} from "../controllers/thongbao.controller.js";

const router = express.Router();
router.get("/", fetchAllThongBao);
router.post("/", createThongBao);
router.patch("/:maThongBao/read", markAsRead);

export default router;
