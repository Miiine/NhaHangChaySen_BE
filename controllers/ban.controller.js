import { db } from "../db.js";

export const fetchAllBan = async (req, res) => {
    try {
        const [rows] = await db.execute(`
            SELECT b.maBan, b.maLoaiBan, b.maKhuVuc, b.trangThai, kv.tenKhuVuc, lb.soLuongKhachToiDa, lb.tenLoai
            FROM BAN AS b
            LEFT JOIN KHUVUC kv ON b.maKhuVuc = kv.maKhuVuc
            LEFT JOIN LOAIBAN lb ON b.maLoaiBan = lb.maLoaiBan
            ORDER BY b.maBan;
        `);
        res.json(rows);
    } catch (err) {
        console.error("Lỗi fetchAllBan SQL Error:", err);
        res.status(500).json({ error: err.sqlMessage });
    }
};

// ----------------------Admin-----------------------

export const addBan = async (req, res) => {
    try {
        const { maLoaiBan, maKhuVuc, trangThai } = req.body;

        // Kiểm tra dữ liệu đầu vào
        if (!maLoaiBan || !maKhuVuc || !trangThai) {
            return res.status(400).json({ error: "Thiếu dữ liệu bắt buộc" });
        }

        // Thêm bàn mới
        const [result] = await db.execute(
            `INSERT INTO BAN ( maLoaiBan, maKhuVuc, trangThai) VALUES (?, ?, ?)`,
            [maLoaiBan, maKhuVuc, trangThai]
        );

        res.json({ message: "Thêm bàn thành công", insertId: result.insertId });
    } catch (err) {
        console.error("Lỗi addBan:", err);
        res.status(500).json({ error: err.sqlMessage });
    }
};

export const updateBan = async (req, res) => {
    try {
        const { maBan, maLoaiBan, maKhuVuc, trangThai } = req.body;

        if (!maBan) {
            return res.status(400).json({ error: "Thiếu maBan để sửa" });
        }

        // Cập nhật thông tin bàn theo maBan
        const [result] = await db.execute(
            `UPDATE BAN SET maLoaiBan = ?, maKhuVuc = ?, trangThai = ? WHERE maBan = ?`,
            [maLoaiBan, maKhuVuc, trangThai, maBan]
        );

        if (result.affectedRows === 0) {
            return res
                .status(404)
                .json({ error: "Không tìm thấy bàn cần sửa" });
        }

        res.json({ message: "Cập nhật bàn thành công" });
    } catch (err) {
        console.error("Lỗi updateBan:", err);
        res.status(500).json({ error: err.sqlMessage });
    }
};

export const deleteBan = async (req, res) => {
    try {
        const { maBan } = req.params;

        if (!maBan) {
            return res.status(400).json({ error: "Thiếu maBan để xóa" });
        }

        const [result] = await db.execute(`DELETE FROM BAN WHERE maBan = ?`, [
            maBan,
        ]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Không tìm thấy bàn để xóa" });
        }

        res.json({ message: "Xóa bàn thành công" });
    } catch (err) {
        console.error("Lỗi deleteBan:", err);
        res.status(500).json({ error: err.sqlMessage });
    }
};

export const deleteMultipleBan = async (req, res) => {
    try {
        const { maBanList } = req.body; // maBanList là mảng

        if (!Array.isArray(maBanList) || maBanList.length === 0) {
            return res
                .status(400)
                .json({ error: "Thiếu danh sách bàn để xóa" });
        }

        // Tạo chuỗi dấu ? tương ứng số phần tử
        const placeholders = maBanList.map(() => "?").join(",");

        const [result] = await db.execute(
            `DELETE FROM BAN WHERE maBan IN (${placeholders})`,
            maBanList
        );

        res.json({
            message: `Xóa thành công ${result.affectedRows} bàn`,
        });
    } catch (err) {
        console.error("Lỗi deleteMultipleBan:", err);
        res.status(500).json({ error: err.sqlMessage });
    }
};

// Controller cập nhật trạng thái bàn
export const updateTrangThaiBan = async (req, res) => {
    const { maBan } = req.params;
    let { trangThaiBan } = req.body;

    if (!maBan || !trangThaiBan) {
        return res
            .status(400)
            .json({ message: "Thiếu thông tin mã bàn hoặc trạng thái bàn" });
    }

    // Loại bỏ dấu cách thừa
    trangThaiBan = trangThaiBan.trim();

    // Kiểm tra giá trị có hợp lệ không
    const validStatuses = ["trong", "dang_phuc_vu"];
    if (!validStatuses.includes(trangThaiBan)) {
        return res.status(400).json({ message: "Trạng thái bàn không hợp lệ" });
    }

    try {
        const [result] = await db.execute(
            `UPDATE BAN SET trangThai = ? WHERE maBan = ?`,
            [trangThaiBan, maBan]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Không tìm thấy bàn" });
        }

        res.json({ message: "Cập nhật trạng thái bàn thành công" });
    } catch (error) {
        console.error("Lỗi cập nhật trạng thái bàn:", error);
        res.status(500).json({ message: "Lỗi server" });
    }
};
