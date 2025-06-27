import { db } from "../db.js";

export const fetchAllNguyenLieu = async (req, res) => {
    try {
        const [rows] = await db.execute(`
            SELECT nl.maNguyenLieu, nl.tenNguyenLieu, nl.donGia, nl.soLuongCon, nl.donViTinh, nl.maLoaiNL, ln.tenLoaiNL

            FROM NGUYENLIEU nl
            LEFT JOIN DANHMUC_NGUYENLIEU ln ON nl.maLoaiNL = ln.maLoaiNL
            ORDER BY nl.maNguyenLieu;
        `);
        res.json(rows);
    } catch (err) {
        console.error("Lỗi fetchAllNguyenLieu: ", err);
        res.status(500).json({ message: "Lỗi server" });
    }
};

export const deleteNguyenLieu = async (req, res) => {
    const { maNguyenLieu } = req.params;
    try {
        const [result] = await db.execute(
            `
            DELETE FROM NGUYENLIEU WHERE maNguyenLieu = ?
        `,
            [maNguyenLieu]
        );

        if (result.affectedRows > 0) {
            res.status(200).json({ message: "Nguyên liệu đã xóa thành công!" });
        } else {
            res.status(404).json({ message: "Nguyên liệu không tồn tại!" });
        }
    } catch (err) {
        console.error("Lỗi khi xóa nguyên liệu", err);
        res.status(500).json({ error: "Lỗi máy chủ" });
    }
};

// Thêm nguyên liệu
export const addNguyenLieu = async (req, res) => {
    const { tenNguyenLieu, donGia, soLuongCon, donViTinh, maLoaiNL } = req.body;

    try {
        const [result] = await db.execute(
            `INSERT INTO NGUYENLIEU (tenNguyenLieu, donGia, soLuongCon, donViTinh, maLoaiNL) 
            VALUES (?, ?, ?, ?, ?)`,
            [tenNguyenLieu, donGia, 0, donViTinh, maLoaiNL]
        );

        if (result.affectedRows > 0) {
            res.status(200).json({
                message: "Nguyên liệu đã thêm thành công!",
                maNguyenLieu: result.insertId,
            });
        } else {
            res.status(400).json({ message: "Không thể thêm nguyên liệu" });
        }
    } catch (err) {
        console.error("Lỗi khi thêm nguyên liệu: ", err);
        res.status(500).json({ error: "Lỗi máy chủ" });
    }
};

// Cập nhật nguyên liệu
export const updateNguyenLieu = async (req, res) => {
    const { maNguyenLieu } = req.params;
    const { tenNguyenLieu, donGia, soLuongCon, donViTinh, maLoaiNL } = req.body;

    try {
        const [result] = await db.execute(
            `UPDATE NGUYENLIEU 
            SET tenNguyenLieu = ?, donGia = ?, soLuongCon = ?, donViTinh = ?, maLoaiNL = ?
            WHERE maNguyenLieu = ?`,
            [
                tenNguyenLieu,
                donGia,
                soLuongCon,
                donViTinh,
                maLoaiNL,
                maNguyenLieu,
            ]
        );

        if (result.affectedRows > 0) {
            res.status(200).json({
                message: "Nguyên liệu đã cập nhật thành công!",
            });
        } else {
            res.status(404).json({ message: "Nguyên liệu không tồn tại!" });
        }
    } catch (err) {
        console.error("Lỗi khi cập nhật nguyên liệu: ", err);
        res.status(500).json({ error: "Lỗi máy chủ" });
    }
};
