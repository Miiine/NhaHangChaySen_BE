import { db } from "../db.js";

export const fetchAllPhieuNhapKho = async (req, res) => {
    try {
        const [rows] = await db.execute(`
      SELECT 
        pnk.maNhapKho,
        pnk.maTaiKhoan,
        pnk.thoiGianNhapKho,
        pnk.tongTien,
        pnk.maNCC,

        -- Thông tin tài khoản nhập
        JSON_OBJECT(
          'maTaiKhoan', tk.maTaiKhoan,
          'tenTaiKhoan', tk.tenTaiKhoan,
          'email', tk.email
        ) AS taiKhoan,

        -- Thông tin nhà cung cấp
        JSON_OBJECT(
          'maNCC', ncc.maNCC,
          'tenNCC', ncc.tenNCC,
          'email', ncc.email,
          'SDT', ncc.SDT,
          'diaChiChiTiet', ncc.diaChiChiTiet
        ) AS nhaCungCap,

        -- Danh sách chi tiết nguyên liệu nhập
        COALESCE((
          SELECT JSON_ARRAYAGG(
            JSON_OBJECT(
              'maNguyenLieu', ctnk.maNguyenLieu,
              'tenNguyenLieu', nl.tenNguyenLieu,
              'maLoaiNL', nl.maLoaiNL,
              'tenLoaiNL', dml.tenLoaiNL,
              'donGia', ctnk.donGia,
              'soLuong', ctnk.soLuong,
              'donViTinh', ctnk.donViTinh
            )
          )
          FROM CHITIET_NHAPKHO ctnk
          LEFT JOIN NGUYENLIEU nl ON ctnk.maNguyenLieu = nl.maNguyenLieu
          LEFT JOIN DANHMUC_NGUYENLIEU dml ON nl.maLoaiNL = dml.maLoaiNL
          WHERE ctnk.maNhapKho = pnk.maNhapKho
        ), JSON_ARRAY()) AS chiTietNhapKho

      FROM PHIEU_NHAPKHO pnk
      LEFT JOIN TAIKHOAN tk ON pnk.maTaiKhoan = tk.maTaiKhoan
      LEFT JOIN NHACUNGCAP ncc ON pnk.maNCC = ncc.maNCC
    `);

        // JSON.parse các trường JSON trả về từ DB
        const data = rows.map((r) => ({
            ...r,
            taiKhoan:
                typeof r.taiKhoan === "string"
                    ? JSON.parse(r.taiKhoan)
                    : r.taiKhoan,
            nhaCungCap:
                typeof r.nhaCungCap === "string"
                    ? JSON.parse(r.nhaCungCap)
                    : r.nhaCungCap,
            chiTietNhapKho:
                typeof r.chiTietNhapKho === "string"
                    ? JSON.parse(r.chiTietNhapKho)
                    : r.chiTietNhapKho,
        }));

        res.json(data);
    } catch (err) {
        console.error("Lỗi fetchAllPhieuNhapKho:", err);
        res.status(500).json({ message: "Lỗi server" });
    }
};

export const deletePhieuNhapKho = async (req, res) => {
    const maNhapKho = req.params.maNhapKho;

    try {
        // Xóa các chi tiết nhập kho
        await db.execute(`DELETE FROM CHITIET_NHAPKHO WHERE maNhapKho = ?`, [
            maNhapKho,
        ]);

        // Xóa phiếu nhập kho
        await db.execute(`DELETE FROM PHIEU_NHAPKHO WHERE maNhapKho = ?`, [
            maNhapKho,
        ]);

        res.status(200).json({ message: "Đã xóa phiếu nhập kho thành công" });
    } catch (err) {
        console.error("Lỗi khi xóa phiếu nhập kho:", err);
        res.status(500).json({ message: "Lỗi khi xóa phiếu nhập kho" });
    }
};

export const addPhieuNhapKho = async (req, res) => {
    const { maTaiKhoan, maNCC, chiTietNhapKho } = req.body;
    // chiTietNhapKho là JSON-string hoặc object mảng:
    // [{ maNguyenLieu, donGia, soLuong, donViTinh }, …]
    let details;
    try {
        details =
            typeof chiTietNhapKho === "string"
                ? JSON.parse(chiTietNhapKho)
                : chiTietNhapKho;
    } catch {
        return res
            .status(400)
            .json({ message: "Dữ liệu chi tiết không hợp lệ" });
    }

    // Tính tổng tiền
    const tongTien = details.reduce(
        (sum, it) => sum + Number(it.donGia) * Number(it.soLuong),
        0
    );

    try {
        await db.beginTransaction();

        // 1) Tạo phiếu nhập kho
        const [r1] = await db.execute(
            `INSERT INTO PHIEU_NHAPKHO (maTaiKhoan, maNCC, tongTien) VALUES (?, ?, ?)`,
            [maTaiKhoan || null, maNCC || null, tongTien]
        );
        const maNhapKho = r1.insertId;

        // 2) Tạo chi tiết
        for (const it of details) {
            // chèn chi tiết
            await db.execute(
                `INSERT INTO CHITIET_NHAPKHO
                (maNhapKho, maNguyenLieu, donGia, soLuong, donViTinh)
                VALUES (?, ?, ?, ?, ?)`,
                [
                    maNhapKho,
                    it.maNguyenLieu,
                    it.donGia,
                    it.soLuong,
                    it.donViTinh,
                ]
            );
            // tăng soLuongCon của nguyên liệu
            await db.execute(
                `UPDATE NGUYENLIEU 
                SET soLuongCon = soLuongCon + ? 
                WHERE maNguyenLieu = ?`,
                [it.soLuong, it.maNguyenLieu]
            );
        }

        await db.commit();
        res.status(201).json({ success: true, maNhapKho });
    } catch (err) {
        await db.rollback();
        console.error("Lỗi addPhieuNhapKho:", err);
        res.status(500).json({ message: "Lỗi server khi nhập kho" });
    }
};

export const updatePhieuNhapKho = async (req, res) => {
    const maNhapKho = Number(req.params.maNhapKho);
    const { maTaiKhoan, maNCC, chiTietNhapKho } = req.body;

    // 1) Parse chi tiết
    let details;
    try {
        details =
            typeof chiTietNhapKho === "string"
                ? JSON.parse(chiTietNhapKho)
                : chiTietNhapKho;
    } catch {
        return res
            .status(400)
            .json({ message: "Dữ liệu chi tiết không hợp lệ" });
    }

    // 2) Tính tổng tiền mới
    const tongTien = details.reduce(
        (sum, it) => sum + Number(it.donGia) * Number(it.soLuong),
        0
    );

    try {
        await db.beginTransaction();

        // 3) Lấy chi tiết cũ để hoàn trả tồn kho
        const [oldRows] = await db.execute(
            `
            SELECT maNguyenLieu, soLuong FROM CHITIET_NHAPKHO WHERE maNhapKho = ?`,
            [maNhapKho]
        );

        // Kiểm tra đủ kho để loại bỏ số lượng cũ
        for (const { maNguyenLieu, soLuong } of oldRows) {
            const [stockRows] = await db.execute(
                `SELECT soLuongCon FROM NGUYENLIEU WHERE maNguyenLieu = ?`,
                [maNguyenLieu]
            );
            const currentStock = stockRows[0]?.soLuongCon || 0;
            if (currentStock < soLuong) {
                await db.rollback();
                return res.status(400).json({
                    message: `Nguyên liệu ${maNguyenLieu} chỉ còn ${currentStock}, không đủ để loại bỏ ${soLuong}`,
                });
            }
        }

        for (const { maNguyenLieu, soLuong } of oldRows) {
            await db.execute(
                `UPDATE NGUYENLIEU SET soLuongCon = soLuongCon - ? WHERE maNguyenLieu = ?`,
                [soLuong, maNguyenLieu]
            );
        }

        // 4) Xóa chi tiết cũ
        await db.execute(`DELETE FROM CHITIET_NHAPKHO WHERE maNhapKho = ?`, [
            maNhapKho,
        ]);

        // 5) Cập nhật header phiếu
        await db.execute(
            `UPDATE PHIEU_NHAPKHO
         SET maTaiKhoan = ?, maNCC = ?, tongTien = ?
       WHERE maNhapKho = ?`,
            [maTaiKhoan || null, maNCC || null, tongTien, maNhapKho]
        );

        // 6) Chèn chi tiết mới và tăng tồn kho
        for (const it of details) {
            await db.execute(
                `INSERT INTO CHITIET_NHAPKHO
           (maNhapKho, maNguyenLieu, donGia, soLuong, donViTinh)
         VALUES (?, ?, ?, ?, ?)`,
                [
                    maNhapKho,
                    it.maNguyenLieu,
                    it.donGia,
                    it.soLuong,
                    it.donViTinh,
                ]
            );
            await db.execute(
                `UPDATE NGUYENLIEU 
           SET soLuongCon = soLuongCon + ?
         WHERE maNguyenLieu = ?`,
                [it.soLuong, it.maNguyenLieu]
            );
        }

        await db.commit();
        res.json({ success: true });
    } catch (err) {
        await db.rollback();
        console.error("Lỗi updatePhieuNhapKho:", err);
        res.status(500).json({
            message: "Lỗi server khi cập nhật phiếu nhập kho",
        });
    }
};
