import { db } from "../db.js";

export const fetchAllLoaiMonAn = async (req, res) => {
    try {
        const [rows] = await db.execute(`
            SELECT lm.maLoai, lm.tenLoai
            FROM LOAIMONAN lm
        `);
        res.json(rows);
    } catch (err) {
        console.error("Lỗi fetchAllLoaiMonAn", err);
        res.status(500).json({ error: err.sqlMessage });
    }
};

export const deleteLoaiMonAn = async (req, res) => {
    const { maLoai } = req.params;
    try {
        const [result] = await db.execute(
            `
            DELETE FROM LOAIMONAN WHERE maLoai = ?
        `,
            [maLoai]
        );

        if (result.affectedRows > 0) {
            res.status(200).json({ message: "Loại món ăn đã được xóa" });
        } else {
            res.status(404).json({ message: "Không tìm thấy loại món ăn" });
        }
    } catch (err) {
        console.error("Lỗi xóa loại món ăn", err);
        res.status(500).json({ error: err.sqlMessage });
    }
};

// Add "LoaiMonAn"
export const addLoaiMonAn = async (req, res) => {
    const { tenLoai } = req.body;

    if (!tenLoai) {
        return res
            .status(400)
            .json({ message: "Tên loại món ăn không được để trống." });
    }

    try {
        const [result] = await db.execute(
            `INSERT INTO LOAIMONAN (tenLoai) VALUES (?)`,
            [tenLoai]
        );

        res.status(201).json({
            message: "Loại món ăn đã được thêm thành công.",
        });
    } catch (err) {
        console.error("Lỗi thêm loại món ăn", err);
        res.status(500).json({ error: err.sqlMessage });
    }
};

// Update "LoaiMonAn"
export const updateLoaiMonAn = async (req, res) => {
    const { maLoai } = req.params;
    const { tenLoai } = req.body;

    if (!tenLoai) {
        return res
            .status(400)
            .json({ message: "Tên loại món ăn không được để trống." });
    }

    try {
        const [result] = await db.execute(
            `UPDATE LOAIMONAN SET tenLoai = ? WHERE maLoai = ?`,
            [tenLoai, maLoai]
        );

        if (result.affectedRows > 0) {
            res.status(200).json({ message: "Loại món ăn đã được cập nhật." });
        } else {
            res.status(404).json({ message: "Không tìm thấy loại món ăn" });
        }
    } catch (err) {
        console.error("Lỗi cập nhật loại món ăn", err);
        res.status(500).json({ error: err.sqlMessage });
    }
};
