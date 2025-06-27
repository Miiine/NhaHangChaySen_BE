import express from "express";

import { fetchAllKhuVuc } from "../controllers/khuvuc.controller.js";

const router = express.Router();
router.get("/", fetchAllKhuVuc);

export default router;
