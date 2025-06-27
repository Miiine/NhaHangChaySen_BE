import { db } from "../db.js";

export const getAllGioHang = async (req, res) => {
    const { maTaiKhoan } = req.params;
    try {
        if (!maTaiKhoan || isNaN(Number(maTaiKhoan))) {
            console.error("maTaiKhoan không hợp lệ.");
            res.status(400).json({ message: "Mã tài khoản không hợp lệ" });
            return;
        }
        console.log(`maTaiKhoan: ${maTaiKhoan}`);

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
                        'soLuongCon', nl.soLuongCon,
                        'soLuongNL', ct.soLuongNL,
                        'donViTinh', nl.donViTinh,
                        'soLuongNLMonCon', (nl.soLuongCon / ct.soLuongNL)
                    )
                )
                FROM CHITIET_MONAN ct
                LEFT JOIN NGUYENLIEU nl ON ct.maNguyenLieu = nl.maNguyenLieu
                WHERE ct.maMonAn = m.maMonAn
            ), JSON_ARRAY()) AS chiTietMonAn,

            COALESCE((
                SELECT FLOOR(MIN(nl.soLuongCon / ct.soLuongNL))
                FROM CHITIET_MONAN ct
                LEFT JOIN NGUYENLIEU nl ON ct.maNguyenLieu = nl.maNguyenLieu
                WHERE ct.maMonAn = m.maMonAn
            ), 0) AS soLuongMonCon,

            gh.soLuongThem

            FROM MONAN m
            LEFT JOIN LOAIMONAN lm ON m.maLoai = lm.maLoai
            JOIN GIOHANG gh ON m.maMonAn = gh.maMonAn
            WHERE gh.maTaiKhoan = ?
            ORDER BY m.maMonAn;
        `,
            [maTaiKhoan]
        );

        console.log(`Số lượng món ăn fetch được: ${rows.length}`);

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
        }));
        res.json(data);
    } catch (err) {
        console.error("Lỗi getAllGioHang", err);
        res.status(500).json({ message: "Lỗi server" });
    }
};

//Thêm món ăn trong giỏ hàng

export const addDishesToCart = async (req, res) => {
    const { maTaiKhoan, maMonAn, soLuongThem } = req.body;
    const quantityToAdd = soLuongThem || 1;
    try {
        console.log("maTaiKhoan: ", maTaiKhoan);
        console.log("maMonAn: ", maMonAn);
        console.log("soLuongThem: ", quantityToAdd);

        const [existingRecord] = await db.execute(
            `
            SELECT * FROM GIOHANG WHERE maTaiKhoan = ? AND maMonAn = ?
        `,
            [maTaiKhoan, maMonAn]
        );
        if (existingRecord && existingRecord.length > 0) {
            await db.execute(
                `
                UPDATE GIOHANG SET soLuongThem = soLuongThem + ?
                WHERE maTaiKhoan = ? AND maMonAn = ?
            `,
                [quantityToAdd, maTaiKhoan, maMonAn]
            );
            res.json({ success: true, action: "incremented" });
        } else {
            await db.execute(
                `
                INSERT INTO GIOHANG (maTaiKhoan, maMonAn, soLuongThem) VALUES (?, ?, ?)
            `,
                [maTaiKhoan, maMonAn, quantityToAdd]
            );
            res.json({ success: true, action: "added", maMonAn: maMonAn });
        }
    } catch (err) {
        console.error("Lỗi thêm món ăn vào giỏ hàng: ", err);
        res.status(500).json({ message: "Lỗi server" });
    }
};

//Xóa món ăn khỏi giỏ hàng

export const deleteDishFromCart = async (req, res) => {
    const { maTaiKhoan, maMonAn } = req.params;
    try {
        console.log("maTaiKhoan: ", maTaiKhoan);
        console.log("maMonAn: ", maMonAn);

        const [existingRecord] = await db.execute(
            `
            SELECT * FROM GIOHANG WHERE maTaiKhoan = ? AND maMonAn = ?
        `,
            [maTaiKhoan, maMonAn]
        );

        if (existingRecord && existingRecord.length > 0) {
            await db.execute(
                `
                DELETE FROM GIOHANG
                WHERE maTaiKhoan = ? AND maMonAn = ?
            `,
                [maTaiKhoan, maMonAn]
            );
            res.json({ success: true, action: "deleted" });
        } else {
            res.status(400).json({ message: "Món ăn không có trong giỏ hàng" });
        }
    } catch (err) {
        console.error("Lỗi xóa món ăn khỏi giỏ hàng: ", err);
        res.status(500).json({ message: "Lỗi server" });
    }
};

//Cập nhật số lượng thêm trong giỏ hàng

export const updateQuantityInCart = async (req, res) => {
    const { maTaiKhoan, maMonAn, soLuongThem } = req.body;
    const quantityToUpdate = soLuongThem;

    try {
        console.log("maTaiKhoan: ", maTaiKhoan);
        console.log("maMonAn: ", maMonAn);
        console.log("soLuongThem: ", quantityToUpdate);

        const [existingRecord] = await db.execute(
            `
            SELECT * FROM GIOHANG WHERE maTaiKhoan = ? AND maMonAn = ?
        `,
            [maTaiKhoan, maMonAn]
        );

        if (existingRecord && existingRecord.length > 0) {
            if (quantityToUpdate > 0) {
                await db.execute(
                    `
                    UPDATE GIOHANG SET soLuongThem = ? 
                    WHERE maTaiKhoan = ? AND maMonAn = ?
                `,
                    [quantityToUpdate, maTaiKhoan, maMonAn]
                );
                res.json({ success: true, action: "updated" });
            } else {
                await db.execute(
                    `
                    DELETE FROM GIOHANG WHERE maTaiKhoan = ? AND maMonAn = ?
                `,
                    [maTaiKhoan, maMonAn]
                );
                res.json({ success: true, action: "deleted" });
            }
        } else {
            res.status(404).json({ message: "Món ăn không có trong giỏ hàng" });
        }
    } catch (err) {
        console.error("Lỗi cập nhật số lượng món ăn trong giỏ hàng: ", err);
        res.status(500).json({ message: "Lỗi server" });
    }
};
