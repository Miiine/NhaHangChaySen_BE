import express from "express";
import {
    fetchAllPhieuNhapKho,
    deletePhieuNhapKho,
    addPhieuNhapKho,
    updatePhieuNhapKho,
} from "../controllers/phieunhapkho.controller.js";

const router = express.Router();

router.get("/", fetchAllPhieuNhapKho);
router.post("/add", addPhieuNhapKho);
router.put("/:maNhapKho", updatePhieuNhapKho);
router.delete("/:maNhapKho", deletePhieuNhapKho);

export default router;
