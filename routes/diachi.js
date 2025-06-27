import express from "express";

import {
    fetchTinhThanh,
    fetchQuanHuyen,
    fetchPhuongXa,
    fetchDiaChiDayDu,
} from "../controllers/diachi.controller.js";

const router = express.Router();
router.get("/tinhthanh", fetchTinhThanh);
router.get("/quanhuyen/:maTinhThanh", fetchQuanHuyen);
router.get("/phuongxa/:maQuanHuyen", fetchPhuongXa);
router.get("/daydu/:maPhuongXa", fetchDiaChiDayDu);

export default router;
