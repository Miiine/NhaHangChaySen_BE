import { db } from "../db.js";

export const fetchTinhThanh = async (req, res) => {
    try {
        const [rows] = await db.execute(`
      SELECT maTinhThanh, tenTinhThanh FROM TINHTHANH ORDER BY tenTinhThanh;
    `);
        res.json(rows);
    } catch (err) {
        console.error("Lỗi fetchTinhThanh:", err);
        res.status(500).json({ message: "Lỗi server" });
    }
};

export const fetchQuanHuyen = async (req, res) => {
    try {
        const { maTinhThanh } = req.params;
        if (!maTinhThanh) {
            return res
                .status(400)
                .json({ message: "Thiếu tham số maTinhThanh" });
        }

        const [rows] = await db.execute(
            `SELECT maQuanHuyen, tenQuanHuyen FROM QUANHUYEN WHERE maTinhThanh = ? ORDER BY tenQuanHuyen`,
            [maTinhThanh]
        );
        res.json(rows);
    } catch (err) {
        console.error("Lỗi fetchQuanHuyen:", err);
        res.status(500).json({ message: "Lỗi server" });
    }
};

export const fetchPhuongXa = async (req, res) => {
    try {
        const { maQuanHuyen } = req.params;
        if (!maQuanHuyen) {
            return res
                .status(400)
                .json({ message: "Thiếu tham số maQuanHuyen" });
        }

        const [rows] = await db.execute(
            `SELECT maPhuongXa, tenPhuongXa FROM PHUONGXA WHERE maQuanHuyen = ? ORDER BY tenPhuongXa`,
            [maQuanHuyen]
        );
        res.json(rows);
    } catch (err) {
        console.error("Lỗi fetchPhuongXa:", err);
        res.status(500).json({ message: "Lỗi server" });
    }
};

export const fetchDiaChiDayDu = async (req, res) => {
    try {
        const { maPhuongXa } = req.params;
        if (!maPhuongXa) {
            return res.status(400).json({ message: "Thiếu mã phường xã" });
        }

        const [rows] = await db.execute(
            `
            SELECT 
                px.tenPhuongXa, px.maQuanHuyen,
                qh.tenQuanHuyen, qh.maTinhThanh,
                tt.tenTinhThanh
            FROM PHUONGXA px
            JOIN QUANHUYEN qh ON px.maQuanHuyen = qh.maQuanHuyen
            JOIN TINHTHANH tt ON qh.maTinhThanh = tt.maTinhThanh
            WHERE px.maPhuongXa = ?
        `,
            [maPhuongXa]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: "Không tìm thấy địa chỉ" });
        }

        res.json(rows[0]);
    } catch (err) {
        console.error("Lỗi fetchDiaChiDayDu:", err);
        res.status(500).json({ message: "Lỗi server" });
    }
};
