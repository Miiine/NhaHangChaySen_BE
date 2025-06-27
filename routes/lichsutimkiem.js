import express from "express";

import { saveSearchHistory } from "../controllers/lichsutimkiem.controller.js";

const router = express.Router();

router.post("/", saveSearchHistory);

export default router;
