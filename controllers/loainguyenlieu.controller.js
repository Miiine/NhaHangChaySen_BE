import { db } from "../db.js";

export const fetchAllLoaiNL = async (req, res) => {
    try {
        const [rows] = await db.execute(`
            SELECT ln.maLoaiNL, ln.tenLoaiNL
            FROM DANHMUC_NGUYENLIEU ln
        `);
        res.json(rows);
    } catch (err) {
        console.error("Lỗi fetchAllLoaiNL", err);
        res.status(500).json({ error: err.sqlMessage });
    }
};

export const deleteLoaiNL = async (req, res) => {
    const { maLoaiNL } = req.params;

    try {
        const [result] = await db.execute(
            `
            DELETE FROM DANHMUC_NGUYENLIEU
            WHERE maLoaiNL = ?
        `,
            [maLoaiNL]
        );

        if (result.affectedRows > 0) {
            res.status(200).json({
                message: "Loại nguyên liệu đã xóa thành công!",
            });
        } else {
            res.status(404).json({
                message: "Loại nguyên liệu không tồn tại!",
            });
        }
    } catch (err) {
        console.error("Lỗi xóa loại nguyên liệu", err);
        res.status(500).json({ error: err.sqlMessage });
    }
};

export const addLoaiNL = async (req, res) => {
    const { tenLoaiNL } = req.body;

    try {
        const [result] = await db.execute(
            `
            INSERT INTO DANHMUC_NGUYENLIEU (tenLoaiNL)
            VALUES (?)
        `,
            [tenLoaiNL]
        );

        if (result.affectedRows > 0) {
            res.status(200).json({
                message: "Loại nguyên liệu đã được thêm thành công!",
            });
        } else {
            res.status(400).json({
                message: "Không thể thêm loại nguyên liệu!",
            });
        }
    } catch (err) {
        console.error("Lỗi thêm loại nguyên liệu", err);
        res.status(500).json({ error: err.sqlMessage });
    }
};

export const updateLoaiNL = async (req, res) => {
    const { maLoaiNL } = req.params;
    const { tenLoaiNL } = req.body;

    try {
        const [result] = await db.execute(
            `
            UPDATE DANHMUC_NGUYENLIEU
            SET tenLoaiNL = ?
            WHERE maLoaiNL = ?
        `,
            [tenLoaiNL, maLoaiNL]
        );

        if (result.affectedRows > 0) {
            res.status(200).json({
                message: "Loại nguyên liệu đã được cập nhật thành công!",
            });
        } else {
            res.status(404).json({
                message: "Loại nguyên liệu không tồn tại!",
            });
        }
    } catch (err) {
        console.error("Lỗi cập nhật loại nguyên liệu", err);
        res.status(500).json({ error: err.sqlMessage });
    }
};
