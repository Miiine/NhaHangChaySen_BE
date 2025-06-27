import express from "express";
import multer from "multer";
import path from "path";

import {
    fetchAllMonAn,
    addMonAn,
    deleteMonAn,
    updateMonAn,
} from "../controllers/monan.controller.js";

const router = express.Router();

// Cấu hình Multer lưu file vào thư mục 'uploads'
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/dishes");
    },
    filename: (req, file, cb) => {
        // Đổi tên file tránh trùng lặp
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname);
        cb(null, file.fieldname + "-" + uniqueSuffix + ext);
    },
});

const upload = multer({ storage });

router.get("/", fetchAllMonAn);
router.post("/add", upload.array("images", 5), addMonAn);
router.delete("/:maMonAn", deleteMonAn);
router.put("/:maMonAn", upload.array("images", 5), updateMonAn);

export default router;
