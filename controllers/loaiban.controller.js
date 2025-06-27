import { db } from "../db.js";

export const fetchAllLoaiBan = async (req, res) => {
    try {
        const [rows] = await db.execute(`
            SELECT lb.maLoaiBan, lb.tenLoai, lb.soLuongKhachToiDa
            FROM LOAIBAN lb
        `);
        res.json(rows);
    } catch (err) {
        console.error("Lỗi fetchAllLoaiBan", err);
        res.status(500).json({ error: err.sqlMessage });
    }
};
