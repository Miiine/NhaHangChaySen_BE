import express from "express";
import { exec } from "child_process";

const router = express.Router();

// API để lấy gợi ý món ăn cho người dùng từ Python
router.get("/", (req, res) => {
    const userId = req.query.maTaiKhoan; // Lấy tham số 'maTaiKhoan' từ query string

    if (!userId) {
        return res.status(400).json({ error: "maTaiKhoan is required" });
    }

    // Kiểm tra nếu 'userId' là một số hợp lệ
    if (isNaN(userId)) {
        return res.status(400).json({ error: "maTaiKhoan must be a number" });
    }

    // Chạy lệnh Python và truyền tham số 'maTaiKhoan' vào script Python
    exec(
        `python recommender-system/main.py ${userId}`, // Chạy script Python với tham số 'maTaiKhoan'
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
                const data = JSON.parse(stdout); // Phân tích kết quả từ Python
                res.json(data); // Trả về dữ liệu JSON từ Python
            } catch (err) {
                console.error("Error parsing Python output:", err);
                return res.status(500).send("Error parsing Python output");
            }
        }
    );
});

export default router;
