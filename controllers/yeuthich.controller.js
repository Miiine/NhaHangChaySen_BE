import { db } from "../db.js";

export const getAllMAYeuThich = async (req, res) => {
    const { maTaiKhoan } = req.params;
    try {
        if (!maTaiKhoan) {
            console.error("maTaiKhoan không hợp lệ.");
            res.status(400).json({ message: "Mã tài khoản không hợp lệ" });
            return;
        }
        console.log(`maTaiKhoan: ${maTaiKhoan}`);
        console.log("maTaiKhoan:", maTaiKhoan);
        const [rows] = await db.execute(
            `
            SELECT m.maMonAn, m.tenMonAn, m.donGia, m.giaGoc, m.moTa, m.donViTinh, m.tinhTrang, m.maLoai, lm.tenLoai,
            
            COALESCE((
                SELECT JSON_ARRAYAGG(
                    JSON_OBJECT(
                        'url', ha.URL,
                        'anhChinh', ha.anhChinh
                    )
                )
                FROM HINHANH_MONAN ha
                WHERE ha.maMonAn = m.maMonAn
            ),  JSON_ARRAY()) AS anhMonAn,

            COALESCE((
                SELECT JSON_ARRAYAGG(
                    JSON_OBJECT(
                        'maDanhGia', dg.maDanhGia,
                        'maTaiKhoan', tk.maTaiKhoan,
                        'tenTaiKhoan', tk.tenTaiKhoan,
                        'anhTaiKhoan', tk.anhTaiKhoan,
                        'soSao', dg.soSao,
                        'binhLuan', dg.binhLuan,
                        'thoiGianDanhGia', dg.thoiGianDanhGia
                    )
                )      
                FROM DANHGIA dg
                LEFT JOIN TAIKHOAN tk ON dg.maTaiKhoan = tk.maTaiKhoan
                WHERE dg.maMonAn = m.maMonAn
                ), JSON_ARRAY()) AS danhGia,

            COALESCE((
                SELECT ROUND(AVG(dg2.soSao), 1)
                FROM DANHGIA dg2
                WHERE dg2.maMonAn = m.maMonAn
            ), 0) AS avgRating,

            COALESCE((
                SELECT JSON_ARRAYAGG(
                    JSON_OBJECT(
                        'maNguyenLieu', ct.maNguyenLieu,
                        'tenNguyenLieu', nl.tenNguyenLieu,
                        'soLuongNL', ct.soLuongNL,
                        'donViTinh', nl.donViTinh
                    )
                )
                FROM CHITIET_MONAN ct
                LEFT JOIN NGUYENLIEU nl ON ct.maNguyenLieu = nl.maNguyenLieu
                WHERE ct.maMonAn = m.maMonAn
                ), JSON_ARRAY()) AS chiTietMonAn

            FROM MONAN m
            LEFT JOIN LOAIMONAN lm ON m.maLoai = lm.maLoai
            JOIN MONAN_YEUTHICH my ON m.maMonAn = my.maMonAn
            WHERE my.maTaiKhoan = ?
            ORDER BY m.maMonAn;
        `,
            [maTaiKhoan]
        );
        console.log("Rows from database:", rows);
        // JSON.parse các trường JSON:
        const data = rows.map((r) => ({
            ...r,
            anhMonAn:
                typeof r.anhMonAn === "string"
                    ? JSON.parse(r.anhMonAn)
                    : r.anhMonAn,
            danhGia:
                typeof r.danhGia === "string"
                    ? JSON.parse(r.danhGia)
                    : r.danhGia,
            avgRating: Number(r.avgRating),
            isBestSeller: false, // Mặc định là không phải best seller
        }));

        // Lấy top 10 món ăn có số lượng bán cao nhất từ danh sách MONAN
        const [top10Rows] = await db.execute(`
            SELECT m.maMonAn
            FROM MONAN m
            LEFT JOIN CHITIET_HOADON ch ON m.maMonAn = ch.maMonAn
            LEFT JOIN HOADON h ON ch.maHoaDon = h.maHoaDon
            WHERE h.trangThai = 'da_hoan_thanh'
            GROUP BY m.maMonAn
            ORDER BY SUM(ch.soLuong) DESC
            LIMIT 10;
        `);

        const top10BestSellers = top10Rows.map((row) => row.maMonAn);

        // Đánh dấu "Best Seller" cho các món ăn yêu thích nếu có trong top 10
        data.forEach((dish) => {
            if (top10BestSellers.includes(dish.maMonAn)) {
                dish.isBestSeller = true;
            }
        });

        res.json(data);
    } catch (err) {
        console.error("Lỗi getAllMAYeuThich:", err);
        res.status(500).json({ message: "Lỗi server" });
        console.error("Lỗi getAllMAYeuThich:", err.message, err.stack);
    }
};

// Thêm hoặc xóa món ăn yêu thích
export const toggleFavoriteDishes = async (req, res) => {
    const { maTaiKhoan, maMonAn } = req.body;
    try {
        console.log("maTaiKhoan:", maTaiKhoan);
        console.log("maMonAn:", maMonAn);
        const [existingRecord] = await db.execute(
            `
            SELECT * FROM MONAN_YEUTHICH WHERE maTaiKhoan = ? AND maMonAn = ?
        `,
            [maTaiKhoan, maMonAn]
        );
        if (existingRecord && existingRecord.length > 0) {
            await db.execute(
                `
                DELETE FROM MONAN_YEUTHICH WHERE maTaiKhoan = ? AND maMonAn = ?
            `,
                [maTaiKhoan, maMonAn]
            );
            res.json({ success: true, action: "removed" });
        } else {
            await db.execute(
                `
                INSERT INTO MONAN_YEUTHICH (maTaiKhoan, maMonAn) VALUES (?, ?)
            `,
                [maTaiKhoan, maMonAn]
            );
            res.json({ success: true, action: "added" });
        }
    } catch (err) {
        console.error("Lỗi thêm/xóa món ăn yêu thích: ", err);
        res.status(500).json({ message: "Lỗi server" });
    }
};
