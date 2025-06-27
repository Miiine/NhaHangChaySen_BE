import express from "express";

import {
    fetchAllNguyenLieu,
    deleteNguyenLieu,
    addNguyenLieu,
    updateNguyenLieu,
} from "../controllers/nguyenlieu.controller.js";

const router = express.Router();
router.get("/", fetchAllNguyenLieu);
router.delete("/:maNguyenLieu", deleteNguyenLieu);
// Thêm nguyên liệu
router.post("/", addNguyenLieu);

// Cập nhật nguyên liệu
router.put("/:maNguyenLieu", updateNguyenLieu);

export default router;
