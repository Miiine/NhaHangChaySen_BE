import express from "express";

import { fetchAllLoaiBan } from "../controllers/loaiban.controller.js";

const router = express.Router();
router.get("/", fetchAllLoaiBan);

export default router;
