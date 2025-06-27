import { db } from "../db.js";
import bcrypt from "bcryptjs";

export const fetchAllTaiKhoan = async (req, res) => {
    try {
        const [rows] = await db.execute(`
            SELECT tk.maTaiKhoan, tk.maVaiTro, tk.email, tk.matKhau, tk.tenTaiKhoan, tk.ngayTaoTK, tk.trangThai, tk.anhTaiKhoan, tk.SDT, tk.diaChi, tk.maPhuongXa, tk.ngaySinh, tk.gioiTinh,
            vt.tenVaiTro
            FROM TAIKHOAN tk
            LEFT JOIN VAITRO_TAIKHOAN vt ON tk.maVaiTro = vt.maVaiTro;
        `);
        res.json(rows);
    } catch (err) {
        console.error("Lỗi getAllTaiKhoan: ", err);
        res.status(500).json({ message: "Lỗi server" });
    }
};

export const updateTaiKhoan = async (req, res) => {
    const maTaiKhoan = req.params.maTaiKhoan;
    const {
        oldPassword,
        avatar,
        matKhauMoi,
        tenTaiKhoan,
        sdt,
        ngaySinh,
        gioiTinh,
        diaChiCuThe,
        maPhuongXa,
    } = req.body;

    try {
        const [rows] = await db.execute(
            `
            SELECT matKhau FROM TAIKHOAN WHERE maTaiKhoan = ?
        `,
            [maTaiKhoan]
        );

        if (rows.length === 0) {
            return res.status(400).json({ message: "Tài khoản không tồn tại" });
        }

        const hashedPassword = rows[0].matKhau;

        // Nếu có mật khẩu, yêu cầu nhập mật khẩu cũ
        if (hashedPassword) {
            if (!oldPassword) {
                return res
                    .status(400)
                    .json({ message: "Vui lòng nhập mật khẩu cũ" });
            }
            const isMatch = await bcrypt.compare(oldPassword, hashedPassword);
            if (!isMatch) {
                return res
                    .status(401)
                    .json({ message: "Mật khẩu cũ không đúng" });
            }
        }
        // Nếu không có mật khẩu (Google login), bỏ qua kiểm tra mật khẩu cũ

        const fieldsToUpdate = [];
        const params = [];

        if (matKhauMoi) {
            const newHashed = await bcrypt.hash(matKhauMoi, 10);
            fieldsToUpdate.push("matKhau = ?");
            params.push(newHashed);
        }
        if (avatar !== undefined) {
            fieldsToUpdate.push("anhTaiKhoan = ?");
            params.push(avatar);
        }
        if (tenTaiKhoan !== undefined) {
            fieldsToUpdate.push("tenTaiKhoan = ?");
            params.push(tenTaiKhoan);
        }
        if (sdt !== undefined) {
            fieldsToUpdate.push("SDT = ?");
            params.push(sdt);
        }
        if (ngaySinh !== undefined) {
            const dateOnly = new Date(ngaySinh).toISOString().slice(0, 10); // 'YYYY-MM-DD'
            fieldsToUpdate.push("ngaySinh = ?");
            params.push(dateOnly === "" ? null : dateOnly);
        }
        if (gioiTinh !== undefined) {
            fieldsToUpdate.push("gioiTinh = ?");
            params.push(gioiTinh === "" ? null : gioiTinh);
        }
        if (diaChiCuThe !== undefined) {
            fieldsToUpdate.push("diaChi = ?");
            params.push(diaChiCuThe);
        }
        if (maPhuongXa !== undefined) {
            fieldsToUpdate.push("maPhuongXa = ?");
            params.push(maPhuongXa === "" ? null : maPhuongXa);
        }

        if (fieldsToUpdate.length === 0) {
            return res
                .status(400)
                .json({ message: "Không có dữ liệu cập nhật" });
        }

        params.push(maTaiKhoan);
        const sql = `UPDATE TAIKHOAN SET ${fieldsToUpdate.join(
            ","
        )} WHERE maTaiKhoan = ?`;
        await db.execute(sql, params);

        res.json({ message: "Cập nhật tài khoản thành công" });
    } catch (err) {
        console.error("Lỗi updateTaiKhoan: ", err);
        res.status(500).json({ message: "Lỗi server" });
    }
};

export const createKhachHangDinIn = async (req, res) => {
    try {
        const { tenTaiKhoan, sdt } = req.body;

        if (!tenTaiKhoan || !sdt) {
            return res.status(400).json({
                message: "Vui lòng nhập tên tài khoản và số điện thoại",
            });
        }

        // Insert dữ liệu, email và mật khẩu để null
        const [result] = await db.execute(
            `INSERT INTO TAIKHOAN (tenTaiKhoan, SDT, maVaiTro, email, matKhau)
       VALUES (?, ?, 1, NULL, NULL)`,
            [tenTaiKhoan, sdt]
        );

        res.status(201).json({
            message: "Tạo khách hàng thành công",
            maTaiKhoan: result.insertId,
        });
    } catch (err) {
        console.error("Lỗi createKhachHang:", err);
        res.status(500).json({ message: "Lỗi server" });
    }
};

export const deleteTaiKhoan = async (req, res) => {
    const { maTaiKhoan } = req.params;
    try {
        const [result] = await db.execute(
            "DELETE FROM TAIKHOAN WHERE maTaiKhoan = ?",
            [maTaiKhoan]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Tài khoản không tồn tại" });
        }

        res.json({ message: "Tài khoản đã được xóa thành công" });
    } catch (err) {
        console.error("Lỗi xóa tài khoản:", err);
        res.status(500).json({ message: "Lỗi khi xóa tài khoản" });
    }
};

// Hàm cập nhật trạng thái tài khoản
export const updateTrangThaiTaiKhoan = async (req, res) => {
    const maTaiKhoan = req.params.maTaiKhoan;
    // const trangThai = req.body.trangThai;
    const trangThai = req.body.trangThai.trangThai;

    console.log("Trạng thái nhận được:", trangThai);

    // console.log("Cấu trúc req.body:", req.body);
    // console.log("Giá trị của trangThai:", req.body.trangThai);

    // Kiểm tra xem giá trị trangThai có phải là chuỗi hợp lệ không
    if (typeof trangThai !== "string") {
        return res.status(400).json({ message: "Trạng thái phải là chuỗi" });
    }

    // Kiểm tra giá trị của trangThai có hợp lệ không
    const validStatuses = ["hoat_dong", "khoa"];
    if (!validStatuses.includes(trangThai)) {
        return res.status(400).json({ message: "Trạng thái không hợp lệ" });
    }

    try {
        // Kiểm tra tài khoản có tồn tại không
        const [rows] = await db.execute(
            `SELECT * FROM TAIKHOAN WHERE maTaiKhoan = ?`,
            [maTaiKhoan]
        );

        if (rows.length === 0) {
            return res.status(400).json({ message: "Tài khoản không tồn tại" });
        }

        // Cập nhật trạng thái tài khoản
        const [result] = await db.execute(
            `UPDATE TAIKHOAN SET trangThai = ? WHERE maTaiKhoan = ?`,
            [trangThai, maTaiKhoan]
        );

        if (result.affectedRows === 0) {
            return res
                .status(400)
                .json({ message: "Không thể cập nhật trạng thái" });
        }

        res.json({ message: "Cập nhật trạng thái tài khoản thành công" });
    } catch (err) {
        console.error("Lỗi cập nhật trạng thái tài khoản:", err);
        res.status(500).json({ message: "Lỗi server" });
    }
};

export const createKhachHang = async (req, res) => {
    const { tenTaiKhoan, email, SDT, maVaiTro } = req.body;

    // Kiểm tra dữ liệu đầu vào
    if (!tenTaiKhoan || !maVaiTro || (!email && !SDT)) {
        return res
            .status(400)
            .json({ message: "Vui lòng nhập đầy đủ thông tin." });
    }

    try {
        // Insert tài khoản vào cơ sở dữ liệu
        const [result] = await db.execute(
            `INSERT INTO TAIKHOAN (tenTaiKhoan, email, SDT, maVaiTro) VALUES (?, ?, ?, ?)`,
            [tenTaiKhoan, email, SDT, maVaiTro]
        );

        res.status(201).json({
            message: "Tạo khách hàng thành công",
            maTaiKhoan: result.insertId,
        });
    } catch (err) {
        console.error("Lỗi tạo khách hàng:", err);
        res.status(500).json({ message: "Lỗi server" });
    }
};

export const adminUpdateTaiKhoan = async (req, res) => {
    const maTaiKhoan = req.params.maTaiKhoan;
    const { tenTaiKhoan, email, SDT, maVaiTro } = req.body;

    try {
        const [rows] = await db.execute(
            `SELECT * FROM TAIKHOAN WHERE maTaiKhoan = ?`,
            [maTaiKhoan]
        );

        if (rows.length === 0) {
            return res.status(400).json({ message: "Tài khoản không tồn tại" });
        }

        // Cập nhật thông tin tài khoản
        const [updateResult] = await db.execute(
            `UPDATE TAIKHOAN SET tenTaiKhoan = ?, email = ?, SDT = ?, maVaiTro = ? WHERE maTaiKhoan = ?`,
            [tenTaiKhoan, email, SDT, maVaiTro, maTaiKhoan]
        );

        res.json({ message: "Cập nhật tài khoản thành công" });
    } catch (err) {
        console.error("Lỗi cập nhật tài khoản:", err);
        res.status(500).json({ message: "Lỗi server" });
    }
};
