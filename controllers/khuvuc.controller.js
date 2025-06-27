import { db } from "../db.js";

export const fetchAllKhuVuc = async (req, res) => {
    try {
        const [rows] = await db.execute(`
            SELECT kv.maKhuVuc, kv.tenKhuVuc, kv.gioiThieu, kv.moTa, kv.phuPhi,

            COALESCE((
                SELECT JSON_ARRAYAGG(
                    JSON_OBJECT(
                        'url', ha.URL,
                        'anhChinh', ha.anhChinh
                    )
                )
                FROM HINHANH_KHUVUC ha
                WHERE ha.maKhuVuc = kv.maKhuVuc
            ),  JSON_ARRAY()) AS anhKhuVuc
            
            FROM KHUVUC kv
            ORDER BY kv.maKhuVuc;
        `);

        // JSON.parse các trường JSON:
        const data = rows.map((r) => ({
            ...r,
            anhKhuVuc:
                typeof r.anhKhuVuc === "string"
                    ? JSON.parse(r.anhKhuVuc)
                    : r.anhKhuVuc,
        }));

        res.json(rows);
    } catch (err) {
        console.error("Lỗi fetchAllKhuVuc SQL Error:", err);
        res.status(500).json({ error: err.sqlMessage });
    }
};
