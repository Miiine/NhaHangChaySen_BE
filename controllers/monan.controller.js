import { db } from "../db.js";
import fs from "fs";
import path from "path";

export const fetchAllMonAn = async (req, res) => {
    try {
        const [rows] = await db.execute(`
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
                        'donViTinh', nl.donViTinh,
                        'soLuongNLMonCon', (nl.soLuongCon / ct.soLuongNL),
                        'maLoaiNL', nl.maLoaiNL,
                        'tenLoaiNL', ln.tenLoaiNL
                    )
                )
                FROM CHITIET_MONAN ct
                LEFT JOIN NGUYENLIEU nl ON ct.maNguyenLieu = nl.maNguyenLieu
                LEFT JOIN DANHMUC_NGUYENLIEU ln ON nl.maLoaiNL = ln.maLoaiNL
                WHERE ct.maMonAn = m.maMonAn
            ), JSON_ARRAY()) AS chiTietMonAn,

            COALESCE((
                SELECT FLOOR(MIN(nl.soLuongCon / ct.soLuongNL))
                FROM CHITIET_MONAN ct
                LEFT JOIN NGUYENLIEU nl ON ct.maNguyenLieu = nl.maNguyenLieu
                WHERE ct.maMonAn = m.maMonAn
            ), 0) AS soLuongMonCon,

            COALESCE((
                SELECT SUM(ch.soLuong)
                FROM CHITIET_HOADON ch
                LEFT JOIN HOADON h ON ch.maHoaDon = h.maHoaDon
                WHERE ch.maMonAn = m.maMonAn AND h.trangThai = 'da_hoan_thanh'
            ), 0) AS soLuongBan

            FROM MONAN m
            LEFT JOIN LOAIMONAN lm ON m.maLoai = lm.maLoai
            ORDER BY m.maMonAn;
        `);

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

        // Lấy top 10 món ăn có số lượng bán cao nhất
        const top10BestSellers = rows
            .sort((a, b) => b.soLuongBan - a.soLuongBan)
            .slice(0, 10);

        // Đánh dấu "BEST SELLER" cho top 10 món ăn
        top10BestSellers.forEach((bestSeller) => {
            const index = data.findIndex(
                (dish) => dish.maMonAn === bestSeller.maMonAn
            );
            if (index !== -1) {
                data[index].isBestSeller = true;
            }
        });

        res.json(data);
    } catch (err) {
        console.error("Lỗi getAllMonAn:", err);
        res.status(500).json({ message: "Lỗi server" });
        console.error("Lỗi getAllMonAn:", err.message, err.stack);
    }
};

export const addMonAn = async (req, res) => {
    try {
        const {
            tenMonAn,
            maLoai,
            donGia,
            giaGoc,
            donViTinh,
            moTa,
            chiTietNguyenLieu,
        } = req.body;

        // Bắt đầu transaction
        await db.beginTransaction();

        // Thêm món ăn
        const [result] = await db.execute(
            `INSERT INTO MONAN (tenMonAn, maLoai, donGia, giaGoc, donViTinh, moTa) VALUES (?, ?, ?, ?, ?, ?)`,
            [tenMonAn, maLoai, donGia, giaGoc, donViTinh, moTa]
        );

        const maMonAn = result.insertId;

        // Thêm hình ảnh nếu có
        // const baseUrl = "http://localhost:3000";
        const baseUrl = "https://nhahangchaysen-be.onrender.com";
        if (req.files && req.files.length) {
            const sqlInsertImage =
                "INSERT INTO HINHANH_MONAN (maMonAn, URL, anhChinh) VALUES (?, ?, ?)";
            for (let i = 0; i < req.files.length; i++) {
                const url = `${baseUrl}/uploads/dishes/${req.files[i].filename}`;
                const anhChinh = i === 0;
                await db.execute(sqlInsertImage, [maMonAn, url, anhChinh]);
            }
        }

        // Thêm chi tiết nguyên liệu nếu có
        if (chiTietNguyenLieu) {
            const arrNL = JSON.parse(chiTietNguyenLieu);
            const sqlInsertChiTiet =
                "INSERT INTO CHITIET_MONAN (maMonAn, maNguyenLieu, soLuongNL) VALUES (?, ?, ?)";

            const promises = arrNL.map((nl) =>
                db.execute(sqlInsertChiTiet, [
                    maMonAn,
                    nl.maNguyenLieu,
                    nl.soLuongNL,
                ])
            );

            await Promise.all(promises);
        }

        // Commit transaction
        await db.commit();

        res.status(201).json({
            success: true,
            message: "Món ăn đã được tạo thành công!",
            maMonAn,
        });
    } catch (error) {
        await db.rollback();
        console.error("Lỗi thêm món ăn:", error);
        if (!res.headersSent) {
            return res.status(500).json({ message: "Lỗi server" });
        }
    }
};

// -------------------- Admin --------------------
export const deleteMonAn = async (req, res) => {
    const { maMonAn } = req.params;
    try {
        // Bắt đầu transaction
        await db.beginTransaction();

        // Xóa hình ảnh món ăn
        await db.execute("DELETE FROM HINHANH_MONAN WHERE maMonAn = ?", [
            maMonAn,
        ]);

        // Xóa chi tiết
        await db.execute("DELETE FROM CHITIET_MONAN WHERE maMonAn = ?", [
            maMonAn,
        ]);

        // Xóa món ăn trong bảng MONAN
        await db.execute("DELETE FROM MONAN WHERE maMonAn = ?", [maMonAn]);

        // Commit transaction
        await db.commit();

        res.status(200).json({ message: "Món ăn đã được xóa thành công!" });
    } catch (err) {
        await db.rollback();
        console.error("Lỗi xóa món ăn:", err);
        res.status(500).json({ error: "Lỗi khi xóa món ăn." });
    }
};

export const updateMonAn = async (req, res) => {
    const maMonAn = req.params.maMonAn;
    const {
        tenMonAn,
        maLoai,
        donGia,
        giaGoc,
        donViTinh,
        moTa,
        chiTietNguyenLieu,
        existingUrls,
    } = req.body;

    // Parse danh sách URL cũ còn giữ lại
    let keptUrls = [];
    try {
        keptUrls = existingUrls ? JSON.parse(existingUrls) : [];
    } catch (e) {
        return res.status(400).json({ message: "existingUrls không hợp lệ" });
    }

    // Đường dẫn thư mục upload
    const UPLOAD_DIR = path.resolve("uploads/dishes");

    try {
        await db.beginTransaction();

        // 1) Cập nhật thông tin chính của món ăn
        await db.execute(
            `UPDATE MONAN
         SET tenMonAn = ?, maLoai = ?, donGia = ?, giaGoc = ?, donViTinh = ?, moTa = ?
       WHERE maMonAn = ?`,
            [tenMonAn, maLoai, donGia, giaGoc, donViTinh, moTa, maMonAn]
        );

        // 2) Xử lý hình ảnh: tìm tất cả URL hiện tại trong DB
        const [rows] = await db.execute(
            `SELECT URL FROM HINHANH_MONAN WHERE maMonAn = ?`,
            [maMonAn]
        );
        const allUrlsInDb = rows.map((r) => r.URL);

        // 2a) Xác định các URL cần xóa (có trong DB nhưng không có trong keptUrls)
        const urlsToDelete = allUrlsInDb.filter(
            (url) => !keptUrls.includes(url)
        );

        // Xóa record và file tương ứng
        for (const url of urlsToDelete) {
            //  - xóa DB
            await db.execute(
                `DELETE FROM HINHANH_MONAN WHERE maMonAn = ? AND URL = ?`,
                [maMonAn, url]
            );
            //  - xóa file trên thư mục
            const filename = path.basename(url);
            const fullPath = path.join(UPLOAD_DIR, filename);
            if (fs.existsSync(fullPath)) {
                fs.unlink(fullPath, (err) => {
                    if (err) console.error("Xóa file lỗi:", err);
                });
            } else {
                console.warn("File không tồn tại, bỏ qua xoá:", fullPath);
            }
        }

        // 2b) Thêm mới các file upload
        if (req.files && req.files.length) {
            const baseUrl = `${req.protocol}://${req.get(
                "host"
            )}/uploads/dishes`;
            for (let i = 0; i < req.files.length; i++) {
                const file = req.files[i];
                const fileUrl = `${baseUrl}/${file.filename}`;
                // đánh dấu ảnh chính nếu chưa có ảnh chính nào
                const isAnhChinh = i === 0 && keptUrls.length === 0;
                await db.execute(
                    `INSERT INTO HINHANH_MONAN (maMonAn, URL, anhChinh)
           VALUES (?, ?, ?)`,
                    [maMonAn, fileUrl, isAnhChinh ? 1 : 0]
                );
            }
        }

        // 3) Cập nhật chi tiết nguyên liệu: xóa tất cả rồi insert lại
        if (chiTietNguyenLieu) {
            const arrNL = JSON.parse(chiTietNguyenLieu);
            // xóa cũ
            await db.execute(`DELETE FROM CHITIET_MONAN WHERE maMonAn = ?`, [
                maMonAn,
            ]);
            // insert mới
            for (const nl of arrNL) {
                await db.execute(
                    `INSERT INTO CHITIET_MONAN (maMonAn, maNguyenLieu, soLuongNL)
           VALUES (?, ?, ?)`,
                    [maMonAn, nl.maNguyenLieu, nl.soLuongNL]
                );
            }
        }

        await db.commit();
        res.json({ success: true, message: "Cập nhật món ăn thành công!" });
    } catch (err) {
        await db.rollback();
        console.error("Lỗi updateMonAn:", err);
        res.status(500).json({ message: "Lỗi server khi cập nhật món ăn." });
    }
};
