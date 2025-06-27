import express from "express";
import {
    fetchAllNhaCungCap,
    deleteNhaCungCap,
    addNhaCungCap,
    updateNhaCungCap,
} from "../controllers/nhacungcap.controller.js";

const router = express.Router();

router.get("/", fetchAllNhaCungCap);
router.delete("/:maNCC", deleteNhaCungCap);
router.post("/", addNhaCungCap);
router.put("/:maNCC", updateNhaCungCap);
export default router;
