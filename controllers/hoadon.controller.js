import { db } from "../db.js";
import moment from "moment";
import qs from "qs";
import crypto from "crypto";
import Swal from "sweetalert2";
import { createThongBaoLogic } from "../controllers/thongbao.controller.js";

export const fetchAllHoaDon = async (req, res) => {
    try {
        const [rows] = await db.execute(
            `
            SELECT h.maHoaDon, h.maTaiKhoan, h.maBan, h.maKhuyenMai, 
            h.hoTen, h.sdt, h.email, h.soLuongKhach, h.note, 
            h.thoiGianDatBan, h.thoiGianSuDung, h.thoiGianThanhToan, h.thoiGianCoc, h.thoiGianHoanThanh, h.thoiGianNhanBan,
            h.tongTienMonAn, h.phuPhiKV, h.tienGiam, h.thue, h.thanhTien, h.daThanhToan,
            h.phuongThucTT, h.trangThaiTT, h.trangThai, h.maGiaoDichNH, h.trangThaiDG,

            b.maKhuVuc, b.maLoaiBan, b.trangThai as trangThaiBan,
            kv.tenKhuVuc, 
            lb.soLuongKhachToiDa, lb.tenLoai,
            km.tenKhuyenMai, km.phanTram, km.soLuong, km.dieuKienApDung,

            COALESCE((
                SELECT JSON_ARRAYAGG(
                    JSON_OBJECT(
                        'maHoaDon', ch.maHoaDon,
                        'maMonAn', ch.maMonAn,
                        'soLuong', ch.soLuong,

                        'tenMonAn', m.tenMonAn,
                        'donGia', m.donGia,
                        'donViTinh', m.donViTinh,
                        'anhMonAn', (
                            SELECT JSON_ARRAYAGG(
                                JSON_OBJECT(
                                    'url', ha.URL,
                                    'anhChinh', ha.anhChinh
                                )
                            )
                            FROM HINHANH_MONAN ha
                            WHERE ha.maMonAn = ch.maMonAn
                        )
                    )
                )
                FROM CHITIET_HOADON ch
                LEFT JOIN MONAN m ON ch.maMonAn = m.maMonAn
                WHERE ch.maHoaDon = h.maHoaDon
                ), JSON_ARRAY()) AS chiTietHoaDon

                FROM HOADON h
                LEFT JOIN BAN b ON h.maBan = b.maBan
                LEFT JOIN KHUVUC kv ON b.maKhuVuc = kv.maKhuVuc
                LEFT JOIN LOAIBAN lb ON b.maLoaiBan = lb.maLoaiBan
                LEFT JOIN KHUYENMAI km ON h.maKhuyenMai = km.maKhuyenMai
                ORDER BY h.maHoaDon;
        `
        );

        // JSON.parse các trường JSON:
        const data = rows.map((r) => ({
            ...r,
            anhMonAn:
                typeof r.anhMonAn === "string"
                    ? JSON.parse(r.anhMonAn)
                    : r.anhMonAn,
            chiTietHoaDon:
                typeof r.chiTietHoaDon === "string"
                    ? JSON.parse(r.chiTietHoaDon)
                    : r.chiTietHoaDon,
        }));
        res.json(data);
    } catch (err) {
        console.error("Lỗi fetchAllHoaDon", err);
        res.status(500).json({ message: "Lỗi server" });
    }
};

export const addHoaDon = async (req, res) => {
    const {
        maTaiKhoan,
        maBan,
        maKhuyenMai,
        hoTen,
        sdt,
        email,
        soLuongKhach,
        note,
        tongTienMonAn,
        phuPhiKV,
        tienGiam,
        thue,
        thanhTien,
        phuongThucTT,
        trangThaiTT,
        trangThai,
        thoiGianSuDung,
        thoiGianThanhToan,
        thoiGianCoc,
        chiTietHoaDon, // Mảng chi tiết món ăn
    } = req.body;

    // Kiểm tra định dạng thời gian hợp lệ (ISO 8601 hoặc YYYY-MM-DD HH:mm:ss)
    const timeFormat = "YYYY-MM-DD HH:mm:ss";
    if (
        !moment(thoiGianSuDung, timeFormat, true).isValid()
        // !moment(thoiGianThanhToan, timeFormat, true).isValid() ||
        // !moment(thoiGianCoc, timeFormat, true).isValid()
    ) {
        return res
            .status(400)
            .json({ message: "Định dạng thời gian không hợp lệ" });
    }

    const maKhuyenMaiFormat =
        maKhuyenMai === "" || maKhuyenMai === null ? null : maKhuyenMai;

    const maBanFormat = maBan === "" || maBan === null ? null : maBan;

    try {
        let missingFields = []; // Mảng để lưu các trường thiếu

        // Kiểm tra từng trường và thêm vào mảng nếu thiếu
        if (!maTaiKhoan) missingFields.push("maTaiKhoan");
        if (!maBan) missingFields.push("maBan");
        if (!hoTen) missingFields.push("hoTen");
        if (!sdt) missingFields.push("sdt");
        if (!soLuongKhach) missingFields.push("soLuongKhach");
        if (!tongTienMonAn) missingFields.push("tongTienMonAn");
        if (!phuPhiKV) missingFields.push("phuPhiKV");
        // if (!tienGiam) missingFields.push("tienGiam");
        if (!thue) missingFields.push("thue");
        if (!thanhTien) missingFields.push("thanhTien");
        if (!thoiGianSuDung) missingFields.push("thoiGianSuDung");

        // Kiểm tra xem mảng thiếu trường có rỗng không
        if (missingFields.length > 0) {
            return res.status(400).json({
                message: `Thiếu thông tin: ${missingFields.join(", ")}`,
            });
        }

        // Bắt đầu giao dịch
        await db.beginTransaction();

        // Thêm hóa đơn vào bảng HOADON
        const [result] = await db.execute(
            `
            INSERT INTO HOADON (
                maTaiKhoan, maBan, maKhuyenMai, hoTen, sdt, email, soLuongKhach, note, 
                tongTienMonAn, phuPhiKV, tienGiam, thue, thanhTien,
                thoiGianSuDung
            ) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
            [
                maTaiKhoan,
                maBanFormat,
                maKhuyenMaiFormat,
                hoTen,
                sdt,
                email,
                soLuongKhach,
                note,
                tongTienMonAn,
                phuPhiKV,
                tienGiam,
                thue,
                thanhTien,
                // phuongThucTT,
                // trangThaiTT,
                // trangThai,
                thoiGianSuDung,
                // thoiGianThanhToan,
                // thoiGianCoc,
            ]
        );

        // Lấy maHoaDon của hóa đơn vừa thêm
        const maHoaDon = result.insertId;

        // Cập nhật trạng thái bàn tương ứng thành 'dat_cho'
        // await db.execute(
        //     `UPDATE BAN SET trangThai = 'dat_cho' WHERE maBan = ?`,
        //     [maBanFormat]
        // );

        // Thêm chi tiết hóa đơn vào bảng CHITIET_HOADON
        const chiTietInsertPromises = chiTietHoaDon.map(async (item) => {
            const { maMonAn, soLuong } = item;
            await db.execute(
                `
                INSERT INTO CHITIET_HOADON (maHoaDon, maMonAn, soLuong) 
                VALUES (?, ?, ?)
            `,
                [maHoaDon, maMonAn, soLuong]
            );

            //Cập nhật số lượng nguyên liệu
            await updateIngredientQuantity(maMonAn, soLuong);
        });

        // Chờ tất cả các chi tiết hóa đơn được chèn xong
        await Promise.all(chiTietInsertPromises);

        // Gọi hàm cập nhật số lượng khuyến mãi nếu có mã khuyến mãi
        if (maKhuyenMaiFormat) {
            try {
                await updateKhuyenMaiQuantity(maKhuyenMaiFormat);
            } catch (err) {
                await db.rollback();
                return res.status(400).json({ message: err.message });
            }
        }

        // Commit giao dịch
        await db.commit();

        // Trả về kết quả
        return res.status(201).json({
            message: "Hóa đơn đã được tạo thành công!",
            maHoaDon: maHoaDon,
        });
    } catch (err) {
        // Rollback giao dịch nếu có lỗi
        await db.rollback();
        console.error("Lỗi thêm hóa đơn:", err);
        if (!res.headersSent) {
            return res.status(500).json({ message: "Lỗi server" });
        }
    }
};

//Hàm cập nhật số lượng khuyến mãi:
export const updateKhuyenMaiQuantity = async (maKhuyenMai) => {
    if (!maKhuyenMai) {
        throw new Error("Mã khuyến mãi không hợp lệ!");
    }

    const [result] = await db.execute(
        `SELECT soLuong FROM KHUYENMAI WHERE maKhuyenMai = ?`,
        [maKhuyenMai]
    );
    if (result.length === 0) {
        throw new Error("Mã khuyến mãi không tồn tại!");
    }
    if (result[0].soLuong <= 0) {
        throw new Error("Mã khuyến mãi không còn số lượng!");
    }
    const [rows] = await db.execute(
        `UPDATE KHUYENMAI SET soLuong = soLuong - 1 WHERE maKhuyenMai = ? AND soLuong > 0`,
        [maKhuyenMai]
    );
    if (rows.affectedRows === 0) {
        throw new Error("Mã khuyến mãi không hợp lệ hoặc đã hết!");
    }
};

//Hàm restore số lượng khuyến mãi
export async function restoreCoupon(db, maHoaDon) {
    const [rows] = await db.execute(
        `SELECT maKhuyenMai FROM HOADON WHERE maHoaDon = ?`,
        [maHoaDon]
    );
    const maKhuyenMai = rows[0]?.maKhuyenMai;
    if (maKhuyenMai) {
        await db.execute(
            `UPDATE KHUYENMAI
         SET soLuong = soLuong + 1
       WHERE maKhuyenMai = ?`,
            [maKhuyenMai]
        );
    }
}

//Hàm cập nhật số lượng nguyên liệu
const updateIngredientQuantity = async (maMonAn, soLuongMonAn) => {
    try {
        const [ingredientData] = await db.execute(
            `
            SELECT maNguyenLieu, soLuongNL
            FROM CHITIET_MONAN
            WHERE maMonAn = ?
        `,
            [maMonAn]
        );

        for (let ingredient of ingredientData) {
            const { maNguyenLieu, soLuongNL } = ingredient;

            await db.execute(
                `
                UPDATE NGUYENLIEU
                SET soLuongCon = soLuongCon - ?
                WHERE maNguyenLieu = ?
            `,
                [soLuongNL * soLuongMonAn, maNguyenLieu]
            );
        }
    } catch (err) {
        console.error("Lỗi khi cập nhật số lượng nguyên liệu:", err);
        throw err;
    }
};

//hàm restore số lượng nguyên liệu
export async function restoreIngredients(db, maHoaDon) {
    const [items] = await db.execute(
        `SELECT maMonAn, soLuong FROM CHITIET_HOADON WHERE maHoaDon = ?`,
        [maHoaDon]
    );
    for (const { maMonAn, soLuong } of items) {
        const [ings] = await db.execute(
            `SELECT maNguyenLieu, soLuongNL FROM CHITIET_MONAN WHERE maMonAn = ?`,
            [maMonAn]
        );
        for (const { maNguyenLieu, soLuongNL } of ings) {
            await db.execute(
                `UPDATE NGUYENLIEU 
            SET soLuongCon = soLuongCon + ?
          WHERE maNguyenLieu = ?`,
                [soLuongNL * soLuong, maNguyenLieu]
            );
        }
    }
}

export const uploadPayment = async (req, res) => {
    const { maHoaDon } = req.params;
    const {
        trangThaiTT, // 'toan_bo' hoặc 'coc'
        phuongThucTT, // 'vnpay' hoặc 'bank'
        maGiaoDichNH, // mã giao dịch ngân hàng (nếu có)
    } = req.body;

    if (!maHoaDon) {
        return res.status(400).json({ message: "Thiếu mã hóa đơn" });
    }

    if (!trangThaiTT || !["toan_bo", "coc"].includes(trangThaiTT)) {
        return res
            .status(400)
            .json({ message: "Trạng thái thanh toán không hợp lệ" });
    }

    if (!phuongThucTT || !["VNPay", "bank"].includes(phuongThucTT)) {
        return res
            .status(400)
            .json({ message: "Phương thức thanh toán không hợp lệ" });
    }

    // Lấy thời gian hiện tại chuẩn định dạng MySQL
    const currentTime = moment().format("YYYY-MM-DD HH:mm:ss");

    // Xác định trường thời gian cập nhật dựa trên trạng thái thanh toán
    let timeField = "";
    if (trangThaiTT === "toan_bo") {
        timeField = "thoiGianThanhToan";
    } else if (trangThaiTT === "coc") {
        timeField = "thoiGianCoc";
    }

    try {
        // Lấy thanhTien từ DB
        const [rows] = await db.execute(
            `SELECT thanhTien FROM HOADON WHERE maHoaDon = ?`,
            [maHoaDon]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: "Không tìm thấy hóa đơn" });
        }

        let thanhTien = Number(rows[0].thanhTien);
        if (isNaN(thanhTien)) {
            return res
                .status(400)
                .json({ message: "Giá trị thanhTien không hợp lệ" });
        }

        let daThanhToan = 0;
        if (trangThaiTT === "coc") {
            daThanhToan = thanhTien * 0.25;
        } else if (trangThaiTT === "toan_bo") {
            daThanhToan = thanhTien;
        }

        const [result] = await db.execute(
            `
      UPDATE HOADON
      SET 
        trangThaiTT = ?,
        phuongThucTT = ?,
        maGiaoDichNH = ?,
        ${timeField} = ?,
        daThanhToan = ?,
        trangThai='cho_duyet'
      WHERE maHoaDon = ?
    `,
            [
                trangThaiTT,
                phuongThucTT,
                maGiaoDichNH || null,
                currentTime,
                daThanhToan,
                maHoaDon,
            ]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Không tìm thấy hóa đơn" });
        }

        res.json({ message: "Cập nhật thanh toán thành công" });
    } catch (err) {
        console.error("Lỗi cập nhật thanh toán:", err);
        res.status(500).json({ message: "Lỗi server" });
    }
};

const vnp_TmnCode = "N8H03WDC";
const vnp_HashSecret = "N4AIZ1NR9YK2L5785OX6LQRJLG0PLCU0";
const vnp_Url = "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";
// const vnp_ReturnUrl = "http://localhost:5173/checkout-return";
const vnp_ReturnUrl = "http://localhost:3000/api/hoadon/checkout-return";

// Tạo URL thanh toán
export const createVNPayPayment = async (req, res) => {
    const ipAddr =
        req.headers["x-forwarded-for"] || req.connection.remoteAddress;
    const { maHoaDon, amount, paymentType } = req.body;

    console.log("Received maHoaDon:", maHoaDon);
    console.log("Received amount:", amount);
    console.log("Received paymentType :", paymentType);

    if (!maHoaDon || !amount || !paymentType) {
        return res.status(400).json({ message: "Thiếu thông tin bắt buộc." });
    }

    try {
        // 1. Cập nhật trạng thái thanh toán vào DB ngay lúc tạo URL
        await db.execute(
            `UPDATE HOADON SET trangThaiTT = ? WHERE maHoaDon = ?`,
            [paymentType, maHoaDon]
        );

        // 2. Tạo URL thanh toán VNPay như bình thường
        const createDate = moment().format("YYYYMMDDHHmmss");

        const vnp_Params = {
            vnp_Version: "2.1.0",
            vnp_Command: "pay",
            vnp_TmnCode,
            vnp_Locale: "vn",
            vnp_CurrCode: "VND",
            vnp_TxnRef: maHoaDon.toString(),
            vnp_OrderInfo: `Thanh toan hoa don #${maHoaDon}`,
            vnp_OrderType: paymentType || "",
            vnp_Amount: amount * 100,
            vnp_ReturnUrl,
            vnp_IpAddr: ipAddr,
            vnp_CreateDate: createDate,
        };

        const redirectUrl = new URL(
            "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html"
        );

        // Sắp xếp các tham số trong vnp_Params
        Object.entries(vnp_Params)
            .sort(([key1], [key2]) =>
                key1.toString().localeCompare(key2.toString())
            )
            .forEach(([key, value]) => {
                if (
                    !value ||
                    value === "" ||
                    value === undefined ||
                    value === null
                ) {
                    return;
                }
                redirectUrl.searchParams.append(key, value.toString());
            });

        // Tạo chữ ký HMAC SHA512
        const hmac = crypto.createHmac("sha512", vnp_HashSecret);
        const signed = hmac
            .update(
                Buffer.from(redirectUrl.search.slice(1).toString(), "utf-8") // Dùng slice để loại bỏ dấu "?" trong URL
            )
            .digest("hex");

        // Thêm chữ ký vào URL
        redirectUrl.searchParams.append("vnp_SecureHash", signed);

        // In ra kết quả URL đã hoàn chỉnh (bao gồm chữ ký)
        console.log("Generated Payment URL: ", redirectUrl.toString());

        // Trả về URL thanh toán VNPay cho client
        res.json({ paymentUrl: redirectUrl.toString() });
    } catch (error) {
        console.error("Lỗi khi tạo URL thanh toán:", error);
        res.status(500).json({ message: "Lỗi server khi tạo URL thanh toán." });
    }
};

export const vnpayReturn = async (req, res) => {
    try {
        const vnp_Params = { ...req.query };
        // 1. Lấy chuỗi query gốc chưa decode từ URL
        const url = new URL(req.originalUrl, `http://${req.headers.host}`);
        const rawQuery = url.searchParams.toString(); // chuỗi query gốc (có decode rồi)

        // Nhưng url.searchParams.toString() trả về đã decode (chuyển + thành space...)
        // Nên bạn cần lấy raw query string từ req.originalUrl hoặc req.url

        // Ví dụ lấy raw query string:
        const rawQueryString = req.url.split("?")[1] || "";

        // 2. Tách thành mảng tham số
        const paramsArr = rawQueryString.split("&");

        // 3. Lọc bỏ vnp_SecureHash và vnp_SecureHashType
        const filteredParamsArr = paramsArr.filter(
            (p) =>
                !p.startsWith("vnp_SecureHash=") &&
                !p.startsWith("vnp_SecureHashType=")
        );

        // 4. Sắp xếp tham số theo tên key (theo thứ tự alphabet)
        filteredParamsArr.sort((a, b) => {
            const keyA = a.split("=")[0];
            const keyB = b.split("=")[0];
            return keyA.localeCompare(keyB);
        });

        // 5. Nối lại chuỗi tham số
        const signData = filteredParamsArr.join("&");

        // 6. Tạo chữ ký
        const hmac = crypto.createHmac("sha512", vnp_HashSecret);
        const signed = hmac.update(signData).digest("hex");

        // 7. Lấy chữ ký VNPay gửi
        const secureHash = req.query.vnp_SecureHash;

        console.log("Chuỗi dữ liệu ký:", signData);
        console.log("Chữ ký VNPay gửi:", secureHash);
        console.log("Chữ ký tạo lại:", signed);

        if (signed === secureHash) {
            const responseCode = req.query.vnp_ResponseCode;
            const maHoaDon = req.query.vnp_TxnRef;

            // Truy vấn paymentType (trangThaiTT) từ DB dựa vào maHoaDon
            const [rows] = await db.execute(
                "SELECT trangThaiTT, thanhTien FROM HOADON WHERE maHoaDon = ?",
                [maHoaDon]
            );
            if (rows.length === 0) {
                return res.status(404).send("Không tìm thấy hóa đơn");
            }
            const paymentType = rows[0].trangThaiTT;
            const thanhTien = Number(rows[0].thanhTien);
            // Xác định cột thời gian cần cập nhật
            let timeField = "";
            if (paymentType === "toan_bo") {
                timeField = "thoiGianThanhToan";
            } else if (paymentType === "coc") {
                timeField = "thoiGianCoc";
            }

            // Tính daThanhToan theo paymentType
            let daThanhToan = 0;
            if (paymentType === "coc") {
                daThanhToan = thanhTien * 0.25;
            } else if (paymentType === "toan_bo") {
                daThanhToan = thanhTien;
            }

            if (responseCode === "00") {
                await db.execute(
                    `UPDATE HOADON 
                        SET phuongThucTT = ?, 
                            maGiaoDichNH = ?, 
                            ${timeField} = ?,
                            daThanhToan = ?,
                            trangThai='cho_duyet'
                    WHERE maHoaDon = ?`,
                    [
                        "VNPay",
                        vnp_Params.vnp_TransactionNo || null,
                        moment().format("YYYY-MM-DD HH:mm:ss"),
                        daThanhToan,
                        maHoaDon,
                    ]
                );

                // --- Tạo thông báo ---
                // Lấy maTaiKhoan (người gửi) và thông tin hóa đơn
                const [hdRows] = await db.execute(
                    "SELECT thanhTien, daThanhToan, maTaiKhoan FROM HOADON WHERE maHoaDon = ?",
                    [maHoaDon]
                );
                const hdInfo = hdRows[0];
                const maNguoiGui = hdInfo?.maTaiKhoan;

                // Lấy mã admin người nhận
                const [adminRows] = await db.execute(
                    "SELECT maTaiKhoan FROM TAIKHOAN WHERE email = ? LIMIT 1",
                    ["nhahangchaysen171@gmail.com"]
                );
                const maNguoiNhan =
                    adminRows.length > 0 ? adminRows[0].maTaiKhoan : null;

                const formatCurrency = (value) => {
                    if (!value && value !== 0) return "";
                    const num = Number(value);
                    if (isNaN(num)) return "";
                    return num.toLocaleString("vi-VN") + " đ";
                };

                if (maNguoiNhan && hdInfo) {
                    const tieuDe = "Vui lòng duyệt đơn hàng!";
                    const noiDung = `
                            Mã hóa đơn: ${maHoaDon}
                            Người đặt: ${hdInfo.maTaiKhoan}
                            Phương thức thanh toán: VNPay
                            Trạng thái thanh toán: ${
                                paymentType === "toan_bo"
                                    ? "Thanh toán toàn bộ"
                                    : "Thanh toán cọc (25%)"
                            }
                            Tổng tiền: ${formatCurrency(hdInfo.thanhTien)}
                            Đã thanh toán: ${formatCurrency(hdInfo.daThanhToan)}
                        `;

                    await createThongBaoLogic({
                        maNguoiGui,
                        maNguoiNhan,
                        tieuDe,
                        noiDung,
                        loaiThongBao: "Duyệt đơn",
                    });
                }

                return res.redirect("http://localhost:5173/LichSuDatBan");
            } else {
                return res.redirect("/payment-failed");
            }
        } else {
            return res.status(400).send("Chữ ký không hợp lệ");
        }
    } catch (error) {
        console.error(error);
        return res.status(500).send("Lỗi server");
    }
};

//Cập nhật trạng thái để hủy đơn đặt bàn
export const updateTrangThai = async (req, res) => {
    const { maHoaDon } = req.params;
    const { trangThai } = req.body;

    try {
        await db.beginTransaction();

        if (trangThai === "da_huy") {
            await restoreCoupon(db, maHoaDon);
            await restoreIngredients(db, maHoaDon);
        }

        await db.execute(`UPDATE HOADON SET trangThai = ? WHERE maHoaDon = ?`, [
            trangThai,
            maHoaDon,
        ]);

        await db.commit();
        res.json({ success: true });
    } catch (err) {
        await db.rollback();
        console.error(err);
        res.status(500).json({ error: "Lỗi server" });
    }
};

export const autoCancelHoaDon = async (req, res) => {
    const { maHoaDon } = req.body;
    if (!maHoaDon) {
        return res.status(400).json({ error: "Thiếu mã hóa đơn" });
    }

    try {
        const [rows] = await db.execute(
            `SELECT trangThai, trangThaiTT, thoiGianDatBan 
         FROM HOADON 
        WHERE maHoaDon = ?`,
            [maHoaDon]
        );
        if (rows.length === 0) {
            return res.status(404).json({ error: "Không tìm thấy hóa đơn" });
        }
        const hd = rows[0];

        // Kiểm tra điều kiện hủy tự động (chưa thanh toán, chưa hủy, quá 1 giờ từ lúc đặt)
        const now = Date.now();
        const placedTime = new Date(hd.thoiGianDatBan).getTime();
        if (
            hd.trangThaiTT === "chua_thanh_toan" &&
            hd.trangThai !== "da_huy" &&
            hd.thoiGianDatBan &&
            now - placedTime > 60 * 60 * 1000
        ) {
            await db.beginTransaction();

            await restoreCoupon(db, maHoaDon);
            await restoreIngredients(db, maHoaDon);

            await db.execute(
                `UPDATE HOADON SET trangThai = 'da_huy' WHERE maHoaDon = ?`,
                [maHoaDon]
            );

            await db.commit();
            return res.json({ message: "Đã hủy và hoàn tác thành công" });
        }

        return res.status(400).json({ error: "Không thể hủy hóa đơn" });
    } catch (err) {
        await db.rollback();
        console.error("Lỗi autoCancelHoaDon:", err);
        return res.status(500).json({ error: "Lỗi server" });
    }
};

//------------------Admin------------------//
export const completeHoaDon = async (req, res) => {
    const { maHoaDon } = req.params;

    if (!maHoaDon) {
        return res.status(400).json({ message: "Thiếu mã hóa đơn" });
    }

    const now = moment().format("YYYY-MM-DD HH:mm:ss");

    try {
        // Bắt đầu transaction
        await db.beginTransaction();

        // Cập nhật trạng thái hóa đơn
        const [result] = await db.execute(
            `UPDATE HOADON 
             SET trangThai = 'da_hoan_thanh', thoiGianHoanThanh = ? 
             WHERE maHoaDon = ?`,
            [now, maHoaDon]
        );

        if (result.affectedRows === 0) {
            await db.rollback();
            return res.status(404).json({ message: "Không tìm thấy hóa đơn" });
        }

        // Lấy mã bàn của hóa đơn vừa cập nhật
        const [rows] = await db.execute(
            `SELECT maBan FROM HOADON WHERE maHoaDon = ?`,
            [maHoaDon]
        );

        if (rows.length === 0 || !rows[0].maBan) {
            await db.rollback();
            return res
                .status(404)
                .json({ message: "Không tìm thấy bàn tương ứng" });
        }

        const maBan = rows[0].maBan;

        // Cập nhật trạng thái bàn thành 'trong'
        await db.execute(`UPDATE BAN SET trangThai = 'trong' WHERE maBan = ?`, [
            maBan,
        ]);

        // Commit transaction
        await db.commit();

        return res.json({
            message:
                "Cập nhật trạng thái hoàn thành và trạng thái bàn thành công",
        });
    } catch (error) {
        await db.rollback();
        console.error("Lỗi cập nhật trạng thái hoàn thành:", error);
        return res.status(500).json({ message: "Lỗi server" });
    }
};

export const updatePayment = async (req, res) => {
    const { maHoaDon } = req.params;
    const { phuongThucTT } = req.body;
    const now = moment().format("YYYY-MM-DD HH:mm:ss");

    try {
        await db.beginTransaction();

        // Update bảng HOADON
        const [result] = await db.execute(
            `UPDATE HOADON
                SET phuongThucTT = ?, trangThaiTT = 'toan_bo', trangThai = 'da_hoan_thanh', 
                    thoiGianThanhToan = ?, thoiGianHoanThanh = ?
                    WHERE maHoaDon = ?`,
            [phuongThucTT, now, now, maHoaDon]
        );

        if (result.affectedRows === 0) {
            await db.rollback();
            return res.status(404).json({ message: "Không tìm thấy hóa đơn" });
        }

        // Lấy mã bàn tương ứng
        const [rows] = await db.execute(
            `SELECT maBan FROM HOADON WHERE maHoaDon = ?`,
            [maHoaDon]
        );

        if (rows.length === 0 || !rows[0].maBan) {
            await db.rollback();
            return res.status(404).json({ message: "Không tìm thấy bàn" });
        }

        // Cập nhật trạng thái bàn thành 'trong'
        await db.execute(`UPDATE BAN SET trangThai = 'trong' WHERE maBan = ?`, [
            rows[0].maBan,
        ]);

        await db.commit();
        res.json({
            message: "Cập nhật thanh toán và trạng thái bàn thành công",
        });
    } catch (error) {
        await db.rollback();
        console.error("Lỗi cập nhật thanh toán:", error);
        res.status(500).json({ message: "Lỗi server" });
    }
};

export const confirmHoaDon = async (req, res) => {
    const { maHoaDon } = req.params;

    if (!maHoaDon) {
        return res.status(400).json({ message: "Thiếu mã hóa đơn" });
    }

    try {
        await db.beginTransaction();

        // Cập nhật trạng thái đơn hàng
        const [updateHoaDon] = await db.execute(
            `UPDATE HOADON SET trangThai = 'da_duyet' WHERE maHoaDon = ?`,
            [maHoaDon]
        );

        if (updateHoaDon.affectedRows === 0) {
            await db.rollback();
            return res.status(404).json({ message: "Không tìm thấy hóa đơn" });
        }

        // Lấy mã bàn từ hóa đơn
        // const [rows] = await db.execute(
        //     `SELECT maBan FROM HOADON WHERE maHoaDon = ?`,
        //     [maHoaDon]
        // );

        // if (rows.length === 0 || !rows[0].maBan) {
        //     await db.rollback();
        //     return res
        //         .status(404)
        //         .json({ message: "Không tìm thấy bàn tương ứng" });
        // }

        // Cập nhật trạng thái bàn thành 'dat_cho'
        // await db.execute(
        //     `UPDATE BAN SET trangThai = 'dat_cho' WHERE maBan = ?`,
        //     [rows[0].maBan]
        // );

        await db.commit();

        res.json({
            message: "Xác nhận đơn hàng thành công",
        });
    } catch (error) {
        await db.rollback();
        console.error("Lỗi cập nhật trạng thái xác nhận:", error);
        res.status(500).json({ message: "Lỗi server" });
    }
};

export const cancelHoaDon = async (req, res) => {
    const { maHoaDon } = req.params;

    if (!maHoaDon) {
        return res.status(400).json({ message: "Thiếu mã hóa đơn" });
    }

    try {
        await db.beginTransaction();

        await restoreCoupon(db, maHoaDon);
        await restoreIngredients(db, maHoaDon);

        const [result] = await db.execute(
            `UPDATE HOADON SET trangThai = 'da_huy' WHERE maHoaDon = ?`,
            [maHoaDon]
        );
        if (result.affectedRows === 0) {
            await db.rollback();
            return res.status(404).json({ message: "Không tìm thấy hóa đơn" });
        }

        const [rows] = await db.execute(
            `SELECT maBan FROM HOADON WHERE maHoaDon = ?`,
            [maHoaDon]
        );
        if (rows.length === 0 || !rows[0].maBan) {
            await db.rollback();
            return res.status(404).json({ message: "Không tìm thấy bàn" });
        }
        const maBan = rows[0].maBan;

        // Cập nhật trạng thái bàn thành 'trong'
        await db.execute(`UPDATE BAN SET trangThai = 'trong' WHERE maBan = ?`, [
            maBan,
        ]);

        await db.commit();
        res.json({
            message: "Hủy đơn và hoàn tác khuyến mãi, nguyên liệu thành công",
        });
    } catch (error) {
        await db.rollback();
        console.error("Lỗi khi hủy đơn:", error);
        res.status(500).json({ message: "Lỗi server" });
    }
};

export const customerReceiveTable = async (req, res) => {
    const { maHoaDon } = req.params;
    if (!maHoaDon) return res.status(400).json({ message: "Thiếu mã hóa đơn" });

    const now = moment().format("YYYY-MM-DD HH:mm:ss");

    try {
        await db.beginTransaction();

        // Cập nhật thời gian nhận bàn
        const [resultHoaDon] = await db.execute(
            `UPDATE HOADON SET thoiGianNhanBan = ? WHERE maHoaDon = ?`,
            [now, maHoaDon]
        );

        if (resultHoaDon.affectedRows === 0) {
            await db.rollback();
            return res.status(404).json({ message: "Không tìm thấy hóa đơn" });
        }

        // Lấy mã bàn từ hóa đơn
        const [rows] = await db.execute(
            `SELECT maBan FROM HOADON WHERE maHoaDon = ?`,
            [maHoaDon]
        );

        if (rows.length === 0 || !rows[0].maBan) {
            await db.rollback();
            return res.status(404).json({ message: "Không tìm thấy bàn" });
        }

        const maBan = rows[0].maBan;

        // Cập nhật trạng thái bàn
        await db.execute(
            `UPDATE BAN SET trangThai = 'dang_phuc_vu' WHERE maBan = ?`,
            [maBan]
        );

        await db.commit();
        res.json({ message: "Khách nhận bàn thành công" });
    } catch (error) {
        await db.rollback();
        console.error("Lỗi khi cập nhật khách nhận bàn:", error);
        res.status(500).json({ message: "Lỗi server" });
    }
};

export const updateBanHoaDon = async (req, res) => {
    const { maHoaDon } = req.params;
    const { maBanMoi } = req.body;

    if (!maHoaDon || !maBanMoi) {
        return res
            .status(400)
            .json({ message: "Thiếu mã hóa đơn hoặc mã bàn mới" });
    }

    try {
        // 1. Lấy thông tin bàn mới, bao gồm khu vực và phụ phí
        const [banRows] = await db.execute(
            `SELECT maKhuVuc FROM BAN WHERE maBan = ?`,
            [maBanMoi]
        );

        if (banRows.length === 0) {
            return res.status(404).json({ message: "Không tìm thấy bàn mới" });
        }

        const maKhuVucMoi = banRows[0].maKhuVuc;

        // 2. Lấy phụ phí khu vực mới
        const [kvRows] = await db.execute(
            `SELECT phuPhi FROM KHUVUC WHERE maKhuVuc = ?`,
            [maKhuVucMoi]
        );

        const phuPhiMoi = kvRows.length > 0 ? kvRows[0].phuPhi : 0;

        // 3. Lấy thông tin hóa đơn hiện tại để tính lại thành tiền
        const [hdRows] = await db.execute(
            `SELECT tongTienMonAn, tienGiam, thue FROM HOADON WHERE maHoaDon = ?`,
            [maHoaDon]
        );

        if (hdRows.length === 0) {
            return res.status(404).json({ message: "Không tìm thấy hóa đơn" });
        }

        const { tongTienMonAn, tienGiam, thue } = hdRows[0];
        // Tính lại thành tiền: tongTienMonAn + phuPhiMoi - tienGiam + thue
        const thanhTienMoi =
            (Number(tongTienMonAn) || 0) +
            (Number(phuPhiMoi) || 0) -
            (Number(tienGiam) || 0) +
            (Number(thue) || 0);

        const thanhTienMoiNumber = Number(thanhTienMoi);

        if (isNaN(thanhTienMoiNumber) || !isFinite(thanhTienMoiNumber)) {
            return res
                .status(400)
                .json({ message: "Giá trị thành tiền không hợp lệ" });
        }
        // 4. Cập nhật hóa đơn
        const [updateResult] = await db.execute(
            `UPDATE HOADON 
            SET maBan = ?, phuPhiKV = ?, thanhTien = ?
            WHERE maHoaDon = ?`,
            [maBanMoi, phuPhiMoi, thanhTienMoiNumber, maHoaDon]
        );

        if (updateResult.affectedRows === 0) {
            return res
                .status(404)
                .json({ message: "Cập nhật hóa đơn thất bại" });
        }

        res.json({ message: "Cập nhật bàn và phụ phí hóa đơn thành công" });
    } catch (error) {
        console.error("Lỗi khi cập nhật bàn trong hóa đơn:", error);
        res.status(500).json({ message: "Lỗi server" });
    }
};

export const adminAddHoaDon = async (req, res) => {
    const {
        maTaiKhoan,
        maBan,
        maKhuyenMai,
        hoTen,
        sdt,
        email,
        soLuongKhach,
        note,
        tongTienMonAn,
        phuPhiKV,
        tienGiam,
        thue,
        thanhTien,
        phuongThucTT,
        trangThaiTT,
        trangThai,
        thoiGianSuDung,
        thoiGianThanhToan,
        thoiGianCoc,
        chiTietHoaDon, // Mảng chi tiết món ăn
    } = req.body;

    // Kiểm tra định dạng thời gian hợp lệ (ISO 8601 hoặc YYYY-MM-DD HH:mm:ss)
    const timeFormat = "YYYY-MM-DD HH:mm:ss";
    if (
        !moment(thoiGianSuDung, timeFormat, true).isValid()
        // !moment(thoiGianThanhToan, timeFormat, true).isValid() ||
        // !moment(thoiGianCoc, timeFormat, true).isValid()
    ) {
        return res
            .status(400)
            .json({ message: "Định dạng thời gian không hợp lệ" });
    }

    const maKhuyenMaiFormat =
        maKhuyenMai === "" || maKhuyenMai === null ? null : maKhuyenMai;

    const maBanFormat = maBan === "" || maBan === null ? null : maBan;

    try {
        let missingFields = []; // Mảng để lưu các trường thiếu

        // Kiểm tra từng trường và thêm vào mảng nếu thiếu
        if (!maTaiKhoan) missingFields.push("maTaiKhoan");
        if (!maBan) missingFields.push("maBan");
        if (!hoTen) missingFields.push("hoTen");
        if (!sdt) missingFields.push("sdt");
        if (!soLuongKhach) missingFields.push("soLuongKhach");
        if (!tongTienMonAn) missingFields.push("tongTienMonAn");
        if (!phuPhiKV) missingFields.push("phuPhiKV");
        // if (!tienGiam) missingFields.push("tienGiam");
        if (!thue) missingFields.push("thue");
        if (!thanhTien) missingFields.push("thanhTien");
        if (!thoiGianSuDung) missingFields.push("thoiGianSuDung");

        // Kiểm tra xem mảng thiếu trường có rỗng không
        if (missingFields.length > 0) {
            return res.status(400).json({
                message: `Thiếu thông tin: ${missingFields.join(", ")}`,
            });
        }

        // Bắt đầu giao dịch
        await db.beginTransaction();

        // Thêm hóa đơn vào bảng HOADON
        const [result] = await db.execute(
            `
            INSERT INTO HOADON (
                maTaiKhoan, maBan, maKhuyenMai, hoTen, sdt, email, soLuongKhach, note, 
                tongTienMonAn, phuPhiKV, tienGiam, thue, thanhTien,
                thoiGianSuDung, trangThaiTT
            ) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
            [
                maTaiKhoan,
                maBanFormat,
                maKhuyenMaiFormat,
                hoTen,
                sdt,
                email,
                soLuongKhach,
                note,
                tongTienMonAn,
                phuPhiKV,
                tienGiam,
                thue,
                thanhTien,
                // phuongThucTT,
                // trangThaiTT,
                // trangThai,
                thoiGianSuDung,
                // thoiGianThanhToan,
                // thoiGianCoc,
                "tt_sau",
            ]
        );

        // Lấy maHoaDon của hóa đơn vừa thêm
        const maHoaDon = result.insertId;

        // Cập nhật trạng thái bàn tương ứng thành 'dat_cho'
        // await db.execute(
        //     `UPDATE BAN SET trangThai = 'dat_cho' WHERE maBan = ?`,
        //     [maBanFormat]
        // );

        // Thêm chi tiết hóa đơn vào bảng CHITIET_HOADON
        const chiTietInsertPromises = chiTietHoaDon.map(async (item) => {
            const { maMonAn, soLuong } = item;
            await db.execute(
                `
                INSERT INTO CHITIET_HOADON (maHoaDon, maMonAn, soLuong) 
                VALUES (?, ?, ?)
            `,
                [maHoaDon, maMonAn, soLuong]
            );

            //Cập nhật số lượng nguyên liệu
            await updateIngredientQuantity(maMonAn, soLuong);
        });

        // Chờ tất cả các chi tiết hóa đơn được chèn xong
        await Promise.all(chiTietInsertPromises);

        // Gọi hàm cập nhật số lượng khuyến mãi nếu có mã khuyến mãi
        if (maKhuyenMaiFormat) {
            await updateKhuyenMaiQuantity(
                { body: { maKhuyenMai: maKhuyenMaiFormat } },
                res
            );
        }

        // Commit giao dịch
        await db.commit();

        // Trả về kết quả
        return res.status(201).json({
            message: "Hóa đơn đã được tạo thành công!",
            maHoaDon: maHoaDon,
        });
    } catch (err) {
        // Rollback giao dịch nếu có lỗi
        await db.rollback();
        console.error("Lỗi thêm hóa đơn:", err);
        if (!res.headersSent) {
            return res.status(500).json({ message: "Lỗi server" });
        }
    }
};

export const deleteHoaDon = async (req, res) => {
    const { maHoaDon } = req.params;

    if (!maHoaDon) {
        return res.status(400).json({ message: "Thiếu mã hóa đơn" });
    }

    try {
        await db.beginTransaction();

        // Xóa chi tiết hóa đơn trước
        await db.execute(`DELETE FROM CHITIET_HOADON WHERE maHoaDon = ?`, [
            maHoaDon,
        ]);

        // Lấy mã bàn của hóa đơn để cập nhật trạng thái bàn
        const [rows] = await db.execute(
            `SELECT maBan FROM HOADON WHERE maHoaDon = ?`,
            [maHoaDon]
        );
        if (rows.length === 0) {
            await db.rollback();
            return res.status(404).json({ message: "Không tìm thấy hóa đơn" });
        }
        const maBan = rows[0].maBan;

        // Xóa hóa đơn
        const [result] = await db.execute(
            `DELETE FROM HOADON WHERE maHoaDon = ?`,
            [maHoaDon]
        );
        if (result.affectedRows === 0) {
            await db.rollback();
            return res.status(404).json({ message: "Xóa hóa đơn thất bại" });
        }

        // Cập nhật trạng thái bàn thành 'trong' nếu có bàn
        if (maBan) {
            await db.execute(
                `UPDATE BAN SET trangThai = 'trong' WHERE maBan = ?`,
                [maBan]
            );
        }

        await db.commit();

        res.json({ message: "Xóa hóa đơn thành công" });
    } catch (error) {
        await db.rollback();
        console.error("Lỗi khi xóa hóa đơn:", error);
        res.status(500).json({ message: "Lỗi server" });
    }
};

export const deleteMultipleHoaDon = async (req, res) => {
    const { maHoaDonList } = req.body;

    if (!Array.isArray(maHoaDonList) || maHoaDonList.length === 0) {
        return res.status(400).json({ message: "Thiếu danh sách mã hóa đơn" });
    }

    try {
        await db.beginTransaction();

        for (const maHoaDon of maHoaDonList) {
            await db.execute(`DELETE FROM CHITIET_HOADON WHERE maHoaDon = ?`, [
                maHoaDon,
            ]);

            const [rows] = await db.execute(
                `SELECT maBan FROM HOADON WHERE maHoaDon = ?`,
                [maHoaDon]
            );
            const maBan = rows.length > 0 ? rows[0].maBan : null;

            const [result] = await db.execute(
                `DELETE FROM HOADON WHERE maHoaDon = ?`,
                [maHoaDon]
            );
            if (result.affectedRows === 0) {
                await db.rollback();
                return res
                    .status(404)
                    .json({ message: `Xóa hóa đơn ${maHoaDon} thất bại` });
            }

            if (maBan) {
                await db.execute(
                    `UPDATE BAN SET trangThai = 'trong' WHERE maBan = ?`,
                    [maBan]
                );
            }
        }

        await db.commit();

        res.json({
            message: `Đã xóa ${maHoaDonList.length} hóa đơn thành công`,
        });
    } catch (error) {
        await db.rollback();
        console.error("Lỗi khi xóa nhiều hóa đơn:", error);
        res.status(500).json({ message: "Lỗi server" });
    }
};

//cập nhật hóa đơn
export const updateHoaDon = async (req, res) => {
    const { maHoaDon } = req.params;
    const {
        maBan,
        maKhuyenMai,

        soLuongKhach,
        note,
        tongTienMonAn,
        phuPhiKV,
        tienGiam,
        thue,
        thanhTien,

        thoiGianSuDung,
        chiTietHoaDon,
    } = req.body;

    if (!maHoaDon) {
        return res.status(400).json({ message: "Thiếu mã hóa đơn" });
    }

    // Kiểm tra ngày sử dụng hợp lệ (nếu có)
    if (thoiGianSuDung) {
        const timeFormat = "YYYY-MM-DD HH:mm:ss";
        if (!moment(thoiGianSuDung, timeFormat, true).isValid()) {
            return res
                .status(400)
                .json({ message: "Định dạng thời gian không hợp lệ" });
        }
    }

    try {
        await db.beginTransaction();

        // Cập nhật thông tin hóa đơn trong bảng HOADON
        const [updateResult] = await db.execute(
            `UPDATE HOADON
       SET maBan = ?, maKhuyenMai = ?, soLuongKhach = ?, note = ?,
       tongTienMonAn = ?, phuPhiKV = ?, tienGiam = ?, thue = ?, thanhTien = ?, thoiGianSuDung = ?
       WHERE maHoaDon = ?`,
            [
                maBan || null,
                maKhuyenMai || null,
                soLuongKhach,
                note || "",
                tongTienMonAn,
                phuPhiKV,
                tienGiam,
                thue,
                thanhTien,
                thoiGianSuDung || null,
                maHoaDon,
            ]
        );

        if (updateResult.affectedRows === 0) {
            await db.rollback();
            return res
                .status(404)
                .json({ message: "Không tìm thấy hóa đơn để cập nhật" });
        }

        // Xóa chi tiết hóa đơn cũ (do có thể cập nhật món, số lượng)
        await db.execute("DELETE FROM CHITIET_HOADON WHERE maHoaDon = ?", [
            maHoaDon,
        ]);

        // Thêm chi tiết hóa đơn mới (nếu có)
        if (Array.isArray(chiTietHoaDon) && chiTietHoaDon.length > 0) {
            const insertPromises = chiTietHoaDon.map(({ maMonAn, soLuong }) =>
                db.execute(
                    "INSERT INTO CHITIET_HOADON (maHoaDon, maMonAn, soLuong) VALUES (?, ?, ?)",
                    [maHoaDon, maMonAn, soLuong]
                )
            );
            await Promise.all(insertPromises);
        }

        await db.commit();
        res.json({ message: "Cập nhật hóa đơn thành công" });
    } catch (error) {
        await db.rollback();
        console.error("Lỗi cập nhật hóa đơn:", error);
        res.status(500).json({ message: "Lỗi server khi cập nhật hóa đơn" });
    }
};
