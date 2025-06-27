import express from "express";
import { exec } from "child_process";

const router = express.Router();

// API để lấy gợi ý món ăn từ Python
router.get("/", (req, res) => {
    const dishId = req.query.maMonAn; // Lấy tham số 'maMonAn' từ query string

    if (!dishId) {
        return res.status(400).json({ error: "maMonAn is required" });
    }

    // Kiểm tra nếu 'dishId' là một số hợp lệ
    if (isNaN(dishId)) {
        return res.status(400).json({ error: "maMonAn must be a number" });
    }

    // Chạy lệnh Python và truyền tham số 'dishId' vào script Python
    exec(
        `python recommender-system/recommend-dishes.py ${dishId}`,
        (error, stdout, stderr) => {
            if (error) {
                console.error(`exec error: ${error}`);
                console.error(`stderr: ${stderr}`);
                return res
                    .status(500)
                    .send(`Error running recommendation system: ${stderr}`);
            }

            console.log("Output from Python script:", stdout);
            try {
                const data = JSON.parse(stdout);
                res.json(data); // Trả về kết quả từ Python dưới dạng JSON
            } catch (err) {
                res.status(500).send("Error parsing Python output");
            }
        }
    );
});

export default router;
