import { db } from "../db.js";

export const getMonAnSold = async (req, res) => {
    try {
        const [rows] = await db.execute(
            `
            SELECT
                m.maMonAn,
                m.tenMonAn,
                SUM(ch.soLuong) AS soLuongBan
            FROM
                CHITIET_HOADON ch
            JOIN
                MONAN m ON ch.maMonAn = m.maMonAn
            JOIN
                HOADON h ON ch.maHoaDon = h.maHoaDon
            WHERE
                h.trangThai = 'da_hoan_thanh'  -- Chỉ tính các hóa đơn đã hoàn thành
            GROUP BY
                m.maMonAn, m.tenMonAn;
            `
        );

        // Kiểm tra xem có dữ liệu trả về không
        if (rows.length === 0) {
            return res
                .status(404)
                .json({ message: "Không có món ăn nào được bán." });
        }

        return res.json(rows);
    } catch (err) {
        console.error("Lỗi khi tính số lượng món ăn đã bán:", err);
        return res
            .status(500)
            .json({ message: "Lỗi server khi tính số lượng món ăn." });
    }
};

export const getSoLuongHoaDonDaHoanThanh = async (req, res) => {
    const { year, month } = req.query;

    try {
        let query;
        let params = [year];

        if (month && month !== "") {
            // Truy vấn nếu tháng có giá trị
            query = `
                SELECT COUNT(*) AS soLuongHoaDon
                FROM HOADON
                WHERE trangThai = 'da_hoan_thanh' 
                AND YEAR(thoiGianDatBan) = ? 
                AND MONTH(thoiGianDatBan) = ?;
            `;
            params.push(month); // Thêm tháng vào tham số nếu có
        } else {
            // Truy vấn nếu tháng không có giá trị (tính tổng cho cả năm)
            query = `
                SELECT COUNT(*) AS soLuongHoaDon
                FROM HOADON
                WHERE trangThai = 'da_hoan_thanh' 
                AND YEAR(thoiGianDatBan) = ?;
            `;
        }

        const [rows] = await db.execute(query, params);

        res.json(rows[0]);
    } catch (err) {
        console.error("Lỗi khi lấy số lượng hóa đơn da_hoan_thanh:", err);
        res.status(500).json({ message: "Lỗi server" });
    }
};

export const getTongDoanhThuDaHoanThanh = async (req, res) => {
    const { year, month } = req.query;

    try {
        let query;
        let params = [year];

        if (month && month !== "") {
            // Truy vấn nếu tháng có giá trị
            query = `
                SELECT SUM(thanhTien) AS tongDoanhThu
                FROM HOADON
                WHERE trangThai = 'da_hoan_thanh'
                AND YEAR(thoiGianDatBan) = ? 
                AND MONTH(thoiGianDatBan) = ?;
            `;
            params.push(month); // Thêm tháng vào tham số nếu có
        } else {
            // Truy vấn nếu tháng không có giá trị (tính tổng cho cả năm)
            query = `
                SELECT SUM(thanhTien) AS tongDoanhThu
                FROM HOADON
                WHERE trangThai = 'da_hoan_thanh'
                AND YEAR(thoiGianDatBan) = ?;
            `;
        }

        const [rows] = await db.execute(query, params);

        res.json(rows[0]);
    } catch (err) {
        console.error("Lỗi khi lấy tổng doanh thu da_hoan_thanh:", err);
        res.status(500).json({ message: "Lỗi server" });
    }
};

export const getSoLuongKhachHangVaiTro1 = async (req, res) => {
    const { year, month } = req.query;

    try {
        let query;
        let params = [year];

        if (month && month !== "") {
            // Truy vấn nếu tháng có giá trị
            query = `
                SELECT COUNT(*) AS soLuongKhachHang
                FROM TAIKHOAN
                WHERE maVaiTro = 1
                AND YEAR(ngayTaoTK) = ? 
                AND MONTH(ngayTaoTK) = ?;
            `;
            params.push(month); // Thêm tháng vào tham số nếu có
        } else {
            // Truy vấn nếu tháng không có giá trị (tính tổng cho cả năm)
            query = `
                SELECT COUNT(*) AS soLuongKhachHang
                FROM TAIKHOAN
                WHERE maVaiTro = 1
                AND YEAR(ngayTaoTK) = ?;
            `;
        }

        const [rows] = await db.execute(query, params);

        res.json(rows[0]);
    } catch (err) {
        console.error(
            "Lỗi khi lấy số lượng khách hàng với mã vai trò = 1:",
            err
        );
        res.status(500).json({ message: "Lỗi server" });
    }
};

export const getTongTienPhieuNhapKho = async (req, res) => {
    const { year, month } = req.query;

    try {
        let query;
        let params = [year];

        if (month && month !== "") {
            // Truy vấn nếu tháng có giá trị
            query = `
                SELECT SUM(tongTien) AS tongTien
                FROM PHIEU_NHAPKHO
                WHERE YEAR(thoiGianNhapKho) = ? 
                AND MONTH(thoiGianNhapKho) = ?;
            `;
            params.push(month); // Thêm tháng vào tham số nếu có
        } else {
            // Truy vấn nếu tháng không có giá trị (tính tổng cho cả năm)
            query = `
                SELECT SUM(tongTien) AS tongTien
                FROM PHIEU_NHAPKHO
                WHERE YEAR(thoiGianNhapKho) = ?;
            `;
        }

        const [rows] = await db.execute(query, params);

        // Kiểm tra xem có dữ liệu trả về không
        if (rows.length === 0 || rows[0].tongTien === null) {
            return res
                .status(404)
                .json({ message: "Không có dữ liệu phiếu nhập kho." });
        }

        // Trả về tổng tiền
        res.json(rows[0]);
    } catch (err) {
        console.error("Lỗi khi lấy tổng tiền phiếu nhập kho:", err);
        res.status(500).json({
            message: "Lỗi server khi lấy tổng tiền phiếu nhập kho.",
        });
    }
};

// // Hàm lấy doanh thu và lợi nhuận theo ngày hoặc tháng
export const getDoanhThuVaLoiNhuan = async (req, res) => {
    const { year, month } = req.query;
    console.log("Received year:", year, "Received month:", month);

    try {
        let queryDoanhThu, queryLoiNhuan;
        let params = [year];

        if (month && month !== "") {
            // Nếu có tháng, tính tổng doanh thu và lợi nhuận theo ngày
            queryDoanhThu = `
                SELECT DAY(thoiGianDatBan) AS ngay, SUM(thanhTien) AS tongDoanhThu
                FROM HOADON
                WHERE trangThai = 'da_hoan_thanh'
                AND YEAR(thoiGianDatBan) = ?
                AND MONTH(thoiGianDatBan) = ?
                GROUP BY DAY(thoiGianDatBan)
                ORDER BY ngay;
            `;
            queryLoiNhuan = `
                SELECT DAY(thoiGianNhapKho) AS ngay, SUM(tongTien) AS tongTienNhapKho
                FROM PHIEU_NHAPKHO
                WHERE YEAR(thoiGianNhapKho) = ?
                AND MONTH(thoiGianNhapKho) = ?
                GROUP BY DAY(thoiGianNhapKho)
                ORDER BY ngay;
            `;
            params.push(month); // Thêm tháng vào query nếu có
        } else {
            // Nếu không có tháng, tính tổng doanh thu và lợi nhuận theo tháng
            queryDoanhThu = `
                SELECT MONTH(thoiGianDatBan) AS thang, SUM(thanhTien) AS tongDoanhThu
                FROM HOADON
                WHERE trangThai = 'da_hoan_thanh'
                AND YEAR(thoiGianDatBan) = ?
                GROUP BY MONTH(thoiGianDatBan)
                ORDER BY thang;
            `;
            queryLoiNhuan = `
                SELECT MONTH(thoiGianNhapKho) AS thang, SUM(tongTien) AS tongTienNhapKho
                FROM PHIEU_NHAPKHO
                WHERE YEAR(thoiGianNhapKho) = ?
                GROUP BY MONTH(thoiGianNhapKho)
                ORDER BY thang;
            `;
        }

        // Lấy tổng doanh thu từ bảng HOADON
        const [rowsDoanhThu] = await db.execute(queryDoanhThu, params);

        // Lấy tổng tiền nhập kho từ bảng PHIEU_NHAPKHO
        const [rowsLoiNhuan] = await db.execute(queryLoiNhuan, params);

        // Nếu có tháng, sắp xếp theo ngày
        if (month && month !== "") {
            rowsDoanhThu.sort((a, b) => a.ngay - b.ngay);
            rowsLoiNhuan.sort((a, b) => a.ngay - b.ngay);
        } else {
            // Nếu không có tháng, sắp xếp theo tháng
            rowsDoanhThu.sort((a, b) => a.thang - b.thang);
            rowsLoiNhuan.sort((a, b) => a.thang - b.thang);
        }

        // Mảng doanh thu và lợi nhuận mặc định
        let doanhThu = [];
        let loiNhuan = [];
        let labels = [];

        // Nếu có tháng, labels là các ngày trong tháng
        if (month && month !== "") {
            const totalDaysInMonth = new Date(year, month, 0).getDate(); // Số ngày trong tháng
            labels = Array.from({ length: totalDaysInMonth }, (_, i) => {
                const date = new Date(year, month - 1, i + 1);
                return `${String(date.getDate()).padStart(2, "0")}/${String(
                    date.getMonth() + 1
                ).padStart(2, "0")}/${date.getFullYear()}`;
            });

            // Tạo mảng doanh thu và lợi nhuận theo ngày
            doanhThu = new Array(totalDaysInMonth).fill(0);
            loiNhuan = new Array(totalDaysInMonth).fill(0);

            // Cập nhật doanh thu và lợi nhuận theo ngày
            rowsDoanhThu.forEach((row) => {
                const dayIndex = row.ngay - 1; // Chỉ số ngày trong mảng (ngày bắt đầu từ 1, mảng bắt đầu từ 0)
                doanhThu[dayIndex] = row.tongDoanhThu;
            });

            rowsLoiNhuan.forEach((row) => {
                const dayIndex = row.ngay - 1; // Chỉ số ngày trong mảng
                loiNhuan[dayIndex] = row.tongTienNhapKho;
            });
        } else {
            // Nếu không có tháng, labels là các tháng trong năm
            labels = Array.from({ length: 12 }, (_, i) => `Tháng ${i + 1}`);

            // Tạo mảng doanh thu và lợi nhuận theo tháng
            doanhThu = new Array(12).fill(0);
            loiNhuan = new Array(12).fill(0);

            // Cập nhật doanh thu và lợi nhuận theo tháng
            rowsDoanhThu.forEach((row) => {
                const monthIndex = row.thang - 1; // Chỉ số tháng trong mảng
                doanhThu[monthIndex] = row.tongDoanhThu;
            });

            rowsLoiNhuan.forEach((row) => {
                const monthIndex = row.thang - 1; // Chỉ số tháng trong mảng
                loiNhuan[monthIndex] = row.tongTienNhapKho;
            });
        }

        // Tính lợi nhuận
        const loiNhuanData = doanhThu.map((doanhThuValue, index) => {
            return doanhThuValue - loiNhuan[index]; // Lợi nhuận = Doanh thu - Chi phí nhập kho
        });

        // Trả về dữ liệu doanh thu và lợi nhuận
        res.json({
            labels: labels, // labels theo ngày hoặc tháng
            doanhThuDataFromAPI: doanhThu, // Dữ liệu doanh thu
            loiNhuanDataFromAPI: loiNhuanData, // Dữ liệu lợi nhuận
        });
    } catch (err) {
        console.error("Lỗi khi lấy doanh thu và lợi nhuận:", err);
        res.status(500).json({
            message: "Lỗi server khi lấy doanh thu và lợi nhuận.",
        });
    }
};
