import { db } from "../db.js";

export const fetchAllNhaCungCap = async (req, res) => {
    try {
        const [rows] = await db.execute(`
      SELECT ncc.maNCC, ncc.tenNCC, ncc.email, ncc.SDT, ncc.diaChiChiTiet, ncc.maPhuongXa, px.tenPhuongXa,
        qh.maQuanHuyen, qh.tenQuanHuyen, 
        tt.maTinhThanh, tt.tenTinhThanh
      FROM NHACUNGCAP ncc
      LEFT JOIN PHUONGXA px ON ncc.maPhuongXa = px.maPhuongXa
      LEFT JOIN QUANHUYEN qh ON px.maQuanHuyen = qh.maQuanHuyen
      LEFT JOIN TINHTHANH tt ON qh.maTinhThanh = tt.maTinhThanh
      ORDER BY ncc.maNCC
    `);
        res.json(rows);
    } catch (err) {
        console.error("Lỗi fetchAllNhaCungCap:", err);
        res.status(500).json({ message: "Lỗi server" });
    }
};

// Xóa một nhà cung cấp
export const deleteNhaCungCap = async (req, res) => {
    const { maNCC } = req.params;
    try {
        await db.execute(
            `
            DELETE FROM NHACUNGCAP WHERE maNCC = ?
        `,
            [maNCC]
        );

        res.status(200).json({
            message: "Nhà cung cấp đã được xóa thành công",
        });
    } catch (err) {
        console.error("Lỗi xóa nhà cung cấp:", err);
        res.status(500).json({ message: "Lỗi khi xóa nhà cung cấp" });
    }
};

// Thêm mới nhà cung cấp
export const addNhaCungCap = async (req, res) => {
    const { tenNCC, email, SDT, diaChiChiTiet, maPhuongXa } = req.body;

    try {
        const [result] = await db.execute(
            `
            INSERT INTO NHACUNGCAP (tenNCC, email, SDT, diaChiChiTiet, maPhuongXa)
            VALUES (?, ?, ?, ?, ?)
        `,
            [tenNCC, email, SDT, diaChiChiTiet, maPhuongXa]
        );

        res.status(201).json({
            message: "Nhà cung cấp đã được thêm mới thành công",
            maNCC: result.insertId,
        });
    } catch (err) {
        console.error("Lỗi thêm nhà cung cấp:", err);
        res.status(500).json({ message: "Lỗi server" });
    }
};

// Cập nhật nhà cung cấp
export const updateNhaCungCap = async (req, res) => {
    const { maNCC } = req.params;
    const { tenNCC, email, SDT, diaChiChiTiet, maPhuongXa } = req.body;

    try {
        await db.execute(
            `
            UPDATE NHACUNGCAP
            SET tenNCC = ?, email = ?, SDT = ?, diaChiChiTiet = ?, maPhuongXa = ?
            WHERE maNCC = ?
        `,
            [tenNCC, email, SDT, diaChiChiTiet, maPhuongXa, maNCC]
        );

        res.status(200).json({
            message: "Nhà cung cấp đã được cập nhật thành công",
        });
    } catch (err) {
        console.error("Lỗi cập nhật nhà cung cấp:", err);
        res.status(500).json({ message: "Lỗi server" });
    }
};
