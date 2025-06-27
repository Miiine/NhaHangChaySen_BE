import { db } from "../db.js";
import fs from "fs";
import path from "path";

export const fetchAllKhuyenMai = async (req, res) => {
    try {
        const [rows] = await db.execute(`
            SELECT km.maKhuyenMai, km.tenKhuyenMai, km.phanTram, km.dieuKienApDung, km.soLuong, km.hinhAnh, km.thoiGianApDung, km.thoiGianHetHan, km.gioiThieu, km.moTa
            FROM KHUYENMAI AS km
        `);
        res.json(rows);
    } catch (err) {
        console.error("Lỗi fetchAllKhuyenMai SQL Error:", err);
        res.status(500).json({ error: err.sqlMessage });
    }
};

// --------------------Admin---------------------------
export const deleteKhuyenMai = async (req, res) => {
    const { maKhuyenMai } = req.params;
    try {
        await db.execute(`DELETE FROM KHUYENMAI WHERE maKhuyenMai = ?`, [
            maKhuyenMai,
        ]);
        res.status(200).json({ message: "Khuyến mãi đã được xóa!" });
    } catch (err) {
        console.error("Lỗi xóa mã khuyến mãi:", err);
        res.status(500).json({ error: "Lỗi khi xóa khuyến mãi." });
    }
};

// Thư mục lưu ảnh
// const uploadDir = path.join(__dirname, "uploads");
// if (!fs.existsSync(uploadDir)) {
//     fs.mkdirSync(uploadDir); // Tạo thư mục nếu chưa có
// }

// Thêm khuyến mãi
export const addKhuyenMai = async (req, res) => {
    try {
        const {
            tenKhuyenMai,
            dieuKienApDung,
            thoiGianApDung,
            thoiGianHetHan,
            phanTram,
            soLuong,
            moTa,
        } = req.body;
        let hinhAnhUrl = "";

        // Kiểm tra xem có file ảnh không
        if (req.file) {
            const baseUrl = "http://localhost:3000"; // Đường dẫn base của server
            hinhAnhUrl = `${baseUrl}/uploads/offers/${req.file.filename}`;
        }

        // Thực hiện thêm khuyến mãi vào database
        const [result] = await db.execute(
            `INSERT INTO KHUYENMAI (tenKhuyenMai, dieuKienApDung, thoiGianApDung, thoiGianHetHan, phanTram, soLuong, moTa, hinhAnh)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                tenKhuyenMai,
                dieuKienApDung,
                thoiGianApDung,
                thoiGianHetHan,
                phanTram,
                soLuong,
                moTa,
                hinhAnhUrl,
            ]
        );

        res.status(201).json({
            success: true,
            message: "Khuyến mãi đã được thêm!",
            maKhuyenMai: result.insertId,
        });
    } catch (error) {
        console.error("Lỗi thêm khuyến mãi:", error);
        res.status(500).json({ message: "Lỗi server khi thêm khuyến mãi." });
    }
};

export const updateKhuyenMai = async (req, res) => {
    const { maKhuyenMai } = req.params;
    const {
        tenKhuyenMai,
        dieuKienApDung,
        thoiGianApDung,
        thoiGianHetHan,
        phanTram,
        soLuong,
        moTa,
    } = req.body;
    let hinhAnhUrl = "";
    if (req.file) {
        // Nếu có ảnh mới, lấy ảnh mới từ req.file
        const baseUrl = "http://localhost:3000";
        hinhAnhUrl = `${baseUrl}/uploads/offers/${req.file.filename}`;
    } else {
        // Nếu không có ảnh mới, giữ lại ảnh cũ từ cơ sở dữ liệu
        const [existingKhuyenMai] = await db.execute(
            `SELECT hinhAnh FROM KHUYENMAI WHERE maKhuyenMai = ?`,
            [maKhuyenMai]
        );
        hinhAnhUrl = existingKhuyenMai[0]?.hinhAnh || "";
    }

    try {
        // Cập nhật dữ liệu khuyến mãi
        const [result] = await db.execute(
            `UPDATE KHUYENMAI SET
                tenKhuyenMai = ?, 
                dieuKienApDung = ?, 
                thoiGianApDung = ?, 
                thoiGianHetHan = ?, 
                phanTram = ?, 
                soLuong = ?, 
                moTa = ?, 
                hinhAnh = ?
            WHERE maKhuyenMai = ?`,
            [
                tenKhuyenMai,
                dieuKienApDung,
                thoiGianApDung,
                thoiGianHetHan,
                phanTram,
                soLuong,
                moTa,
                hinhAnhUrl,
                maKhuyenMai,
            ]
        );

        if (result.affectedRows > 0) {
            res.status(200).json({
                success: true,
                message: "Khuyến mãi đã được cập nhật!",
            });
        } else {
            res.status(404).json({
                success: false,
                message: "Không tìm thấy khuyến mãi với mã " + maKhuyenMai,
            });
        }
    } catch (err) {
        console.error("Lỗi khi cập nhật khuyến mãi:", err);
        res.status(500).json({
            success: false,
            message: "Lỗi server khi cập nhật khuyến mãi.",
        });
    }
};
