import { db } from "../db.js";
import moment from "moment";

export const fetchAllThongBao = async (req, res) => {
    try {
        const [rows] = await db.execute(
            `
            SELECT 
                maThongBao,
                maNguoiNhan,
                maNguoiGui,
                tieuDe,
                noiDung,
                trangThai,
                loaiThongBao,
                thoiGianTao,
                thoiGianCapNhat
            FROM THONGBAO
            ORDER BY thoiGianTao DESC
            `
        );

        res.json(rows);
    } catch (err) {
        console.error("Lỗi getAllThongBao", err);
        res.status(500).json({ message: "Lỗi server" });
    }
};

// đánh dấu 1 TB là đã đọc
export const markAsRead = async (req, res) => {
    const { maThongBao } = req.params;
    try {
        await db.execute(
            `UPDATE THONGBAO SET trangThai = 'da_doc' WHERE maThongBao = ?`,
            [maThongBao]
        );
        res.json({ success: true });
    } catch (err) {
        console.error("Lỗi markAsRead:", err);
        res.status(500).json({ message: "Lỗi server" });
    }
};

export const createThongBao = async (req, res) => {
    // const { maNguoiNhan, maNguoiGui, tieuDe, noiDung, loaiThongBao } = req.body;
    // if (!maNguoiNhan || !tieuDe || !noiDung) {
    //     return res.status(400).json({ message: "Thiếu dữ liệu bắt buộc" });
    // }
    // try {
    //     const [result] = await db.execute(
    //         `INSERT INTO THONGBAO
    //             (maNguoiNhan, maNguoiGui, tieuDe, noiDung, loaiThongBao)
    //          VALUES (?, ?, ?, ?, ?)`,
    //         [
    //             maNguoiNhan,
    //             maNguoiGui || null, // nếu không có người gửi thì để NULL
    //             tieuDe,
    //             noiDung,
    //             loaiThongBao || null,
    //         ]
    //     );
    //     return res
    //         .status(201)
    //         .json({ success: true, maThongBao: result.insertId });
    // } catch (err) {
    //     console.error("Lỗi tạo thông báo:", err);
    //     return res.status(500).json({ message: "Lỗi server" });
    // }
    try {
        const maThongBao = await createThongBaoLogic(req.body);
        res.status(201).json({ success: true, maThongBao });
    } catch (error) {
        console.error("Lỗi tạo thông báo:", error);
        res.status(500).json({ message: error.message || "Lỗi server" });
    }
};

//cho backend khi thanh toán vnpay
export async function createThongBaoLogic({
    maNguoiNhan,
    maNguoiGui,
    tieuDe,
    noiDung,
    loaiThongBao,
}) {
    if (!maNguoiNhan || !tieuDe || !noiDung) {
        throw new Error("Thiếu dữ liệu bắt buộc");
    }

    const [result] = await db.execute(
        `INSERT INTO THONGBAO 
      (maNguoiNhan, maNguoiGui, tieuDe, noiDung, loaiThongBao) 
    VALUES (?, ?, ?, ?, ?)`,
        [maNguoiNhan, maNguoiGui || null, tieuDe, noiDung, loaiThongBao || null]
    );

    return result.insertId;
}

// gửi thông báo nhắc nhở đơn đặt bàn
export const sendReminderForTomorrowBookings = async () => {
    const tomorrowStart = moment()
        .add(1, "days")
        .startOf("day")
        .format("YYYY-MM-DD HH:mm:ss");
    const tomorrowEnd = moment()
        .add(1, "days")
        .endOf("day")
        .format("YYYY-MM-DD HH:mm:ss");

    try {
        // Lấy danh sách hóa đơn đã duyệt, chưa hủy, có ngày sử dụng là ngày mai
        const [rows] = await db.execute(
            `SELECT maHoaDon, maTaiKhoan, hoTen, thoiGianSuDung FROM HOADON 
       WHERE trangThai = 'da_duyet' AND trangThai != 'da_huy' 
       AND thoiGianSuDung BETWEEN ? AND ?`,
            [tomorrowStart, tomorrowEnd]
        );

        for (const hd of rows) {
            if (hd.maTaiKhoan) {
                const tieuDe = `Nhắc nhở đơn đặt bàn ngày mai!`;
                const noiDung = `Bạn có một đơn đặt bàn vào ngày mai (${moment(
                    hd.thoiGianSuDung
                ).format(
                    "DD/MM/YYYY"
                )}). Vui lòng đến đúng giờ để trải nghiệm dịch vụ của chúng tôi. Cảm ơn bạn!`;

                await createThongBao({
                    maNguoiGui: null,
                    maNguoiNhan: hd.maTaiKhoan,
                    tieuDe,
                    noiDung,
                    loaiThongBao: "Đơn đặt bàn",
                });
            }
        }

        console.log(`Đã gửi nhắc nhở ${rows.length} đơn đặt bàn ngày mai.`);
    } catch (error) {
        console.error("Lỗi gửi nhắc nhở đơn đặt bàn ngày mai:", error);
    }
};
