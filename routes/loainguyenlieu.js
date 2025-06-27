import express from "express";

import {
    fetchAllLoaiNL,
    deleteLoaiNL,
    addLoaiNL,
    updateLoaiNL,
} from "../controllers/loainguyenlieu.controller.js";

const router = express.Router();
router.get("/", fetchAllLoaiNL);

router.delete("/:maLoaiNL", deleteLoaiNL);
router.post("/", addLoaiNL);
router.put("/:maLoaiNL", updateLoaiNL);

export default router;
