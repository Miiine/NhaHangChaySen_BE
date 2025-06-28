import express from "express";
import multer from "multer";
import path from "path";

import {
    fetchAllTaiKhoan,
    updateTaiKhoan,
    createKhachHangDinIn,
    deleteTaiKhoan,
    updateTrangThaiTaiKhoan,
    createKhachHang,
    adminUpdateTaiKhoan,
} from "../controllers/taikhoan.controller.js";

// ⚙️ Cấu hình nơi lưu ảnh
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/avatars/");
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const uniqueName =
            Date.now() + "-" + Math.round(Math.random() * 1e9) + ext;
        cb(null, uniqueName);
    },
});

const upload = multer({ storage });

const router = express.Router();
router.get("/", fetchAllTaiKhoan);
router.put("/:maTaiKhoan", updateTaiKhoan);
router.post("/khachhang", createKhachHangDinIn);

router.post("/upload-avatar", upload.single("avatar"), (req, res) => {
    if (!req.file) return res.status(400).json({ message: "Không có file" });

    // const fileUrl = `http://localhost:3000/uploads/avatars/${req.file.filename}`;
    const fileUrl = `https://nhahangchaysen-be.onrender.com/uploads/avatars/${req.file.filename}`;
    res.json({ fileUrl });
});

router.delete("/:maTaiKhoan", deleteTaiKhoan);
router.put("/:maTaiKhoan/trangthai", updateTrangThaiTaiKhoan);
router.post("/ql_khachhang", createKhachHang);
router.put("/:maTaiKhoan/admin", adminUpdateTaiKhoan);

export default router;
