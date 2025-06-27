import { db } from "../db.js";

export const fetchAllDanhGia = async (req, res) => {
    try {
        const [rows] = await db.execute(`
            SELECT 
                dg.maDanhGia, dg.maTaiKhoan, dg.maHoaDon, dg.maMonAn, dg.soSao, dg.binhLuan, dg.thoiGianDanhGia, dg.thoiGianDanhGiaCapNhat,
                m.tenMonAn,
                tk.tenTaiKhoan, tk.anhTaiKhoan,

                COALESCE((
                    SELECT JSON_ARRAYAGG(
                        JSON_OBJECT(
                            'url', ha.URL,
                            'anhChinh', ha.anhChinh
                        )
                    )
                    FROM HINHANH_MONAN ha
                    WHERE ha.maMonAn = m.maMonAn
                ), JSON_ARRAY()) AS anhMonAn,

                COALESCE((
                    SELECT ROUND(AVG(dg2.soSao), 1)
                    FROM DANHGIA dg2
                    WHERE dg2.maMonAn = m.maMonAn
                ), 0) AS avgRating
            FROM DANHGIA dg
            JOIN MONAN m ON dg.maMonAn = m.maMonAn
            JOIN TAIKHOAN tk ON dg.maTaiKhoan = tk.maTaiKhoan
            ORDER BY dg.maDanhGia;
        `);

        const data = rows.map((r) => ({
            ...r,
            anhMonAn: r.anhMonAn,
            avgRating: Number(r.avgRating),
        }));

        res.json(data);
    } catch (err) {
        console.error("Lỗi fetchAllDanhGia SQL Error:", err);
        res.status(500).json({ error: err.sqlMessage });
    }
};

export const addDanhGia = async (req, res) => {
    const { maMonAn, soSao, binhLuan, maHoaDon, maTaiKhoan } = req.body;

    if (!maMonAn || !soSao || !maHoaDon || !maTaiKhoan) {
        return res.status(400).json({ error: "Thiếu dữ liệu bắt buộc." });
    }

    try {
        // Kiểm tra xem đánh giá đã tồn tại chưa
        const [existing] = await db.execute(
            `SELECT maDanhGia FROM DANHGIA WHERE maTaiKhoan = ? AND maMonAn = ? AND maHoaDon = ?`,
            [maTaiKhoan, maMonAn, maHoaDon]
        );

        if (existing.length > 0) {
            // Cập nhật đánh giá hiện có
            await db.execute(
                `UPDATE DANHGIA 
                 SET soSao = ?, binhLuan = ?, thoiGianDanhGia = CURRENT_TIMESTAMP, thoiGianDanhGiaCapNhat = CURRENT_TIMESTAMP
                 WHERE maDanhGia = ?`,
                [soSao, binhLuan, existing[0].maDanhGia]
            );
        } else {
            // Thêm mới đánh giá
            await db.execute(
                `INSERT INTO DANHGIA 
                 (maTaiKhoan, maMonAn, maHoaDon, soSao, binhLuan, thoiGianDanhGia) 
                 VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
                [maTaiKhoan, maMonAn, maHoaDon, soSao, binhLuan]
            );
        }

        // Cập nhật trạng thái đánh giá của hóa đơn thành 'da_danh_gia'
        await db.execute(
            `UPDATE HOADON SET trangThaiDG = 'da_danh_gia' WHERE maHoaDon = ?`,
            [maHoaDon]
        );

        return res.json({ message: "Cập nhật đánh giá thành công!" });
    } catch (error) {
        console.error("Lỗi submitDanhGia:", error);
        return res
            .status(500)
            .json({ error: "Lỗi máy chủ, vui lòng thử lại." });
    }
};

export const updateDanhGia = async (req, res) => {
    const { maDanhGia, soSao, binhLuan, maTaiKhoan } = req.body;

    if (!maDanhGia || !soSao || !maTaiKhoan) {
        return res.status(400).json({ error: "Thiếu dữ liệu bắt buộc." });
    }

    try {
        // Kiểm tra xem đánh giá có tồn tại và thuộc về tài khoản này không
        const [existing] = await db.execute(
            `SELECT * FROM DANHGIA WHERE maDanhGia = ? AND maTaiKhoan = ?`,
            [maDanhGia, maTaiKhoan]
        );

        if (existing.length === 0) {
            return res
                .status(404)
                .json({
                    error: "Đánh giá không tồn tại hoặc không thuộc quyền sở hữu.",
                });
        }

        // Cập nhật đánh giá
        await db.execute(
            `UPDATE DANHGIA 
       SET soSao = ?, binhLuan = ?, thoiGianDanhGiaCapNhat = CURRENT_TIMESTAMP
       WHERE maDanhGia = ?`,
            [soSao, binhLuan, maDanhGia]
        );

        return res.json({ message: "Cập nhật đánh giá thành công!" });
    } catch (error) {
        console.error("Lỗi updateDanhGia:", error);
        return res
            .status(500)
            .json({ error: "Lỗi máy chủ, vui lòng thử lại." });
    }
};
