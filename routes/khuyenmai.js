import express from "express";
import multer from "multer";
import path from "path";

import {
    fetchAllKhuyenMai,
    deleteKhuyenMai,
    addKhuyenMai,
    updateKhuyenMai,
} from "../controllers/khuyenmai.controller.js";

// Cấu hình Multer để upload file ảnh
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/offers");
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname);
        cb(null, file.fieldname + "-" + uniqueSuffix + ext);
    },
});

const upload = multer({ storage });

const router = express.Router();
router.get("/", fetchAllKhuyenMai);
router.delete("/:maKhuyenMai", deleteKhuyenMai);
router.post("/add", upload.single("hinhAnh"), addKhuyenMai);
router.put("/update/:maKhuyenMai", upload.single("hinhAnh"), updateKhuyenMai);

export default router;
