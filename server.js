import express from "express";
import path from "path";
import cors from "cors";
import dotenv from "dotenv";
import authRouter from "./routes/auth.js";
import khuVucRouter from "./routes/khuvuc.js";
import monAnRouter from "./routes/monan.js";
import khuyenMaiRouter from "./routes/khuyenmai.js";
import loaiMonAnRouter from "./routes/loaimonan.js";
import lichSuTimKiemRouter from "./routes/lichsutimkiem.js";
import taiKhoanRouter from "./routes/taikhoan.js";
import loaiNLRouter from "./routes/loainguyenlieu.js";
import nguyenLieuRouter from "./routes/nguyenlieu.js";
import yeuThichRouter from "./routes/yeuthich.js";
import gioHangRouter from "./routes/giohang.js";
import loaiBanRouter from "./routes/loaiban.js";
import banRouter from "./routes/ban.js";
import hoaDonRouter from "./routes/hoadon.js";
import diaChiRouter from "./routes/diachi.js";
import danhGiaRouter from "./routes/danhgia.js";
import nhaCungCapRouter from "./routes/nhacungcap.js";
import thongBaoRouter from "./routes/thongbao.js";
import phieuNhapKhoRouter from "./routes/phieunhapkho.js";
import thongKeRouter from "./routes/thongke.js";
import recommendDishesRouter from "./routes/recommendDishes.js";
import recommendDishesByUserRouter from "./routes/recommendDishesByUser.js";

import cron from "node-cron";
import { sendReminderForTomorrowBookings } from "./controllers/thongbao.controller.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// ⚠️ Cho phép truy cập ảnh public
app.use("/uploads", express.static("uploads"));

app.use("/api/auth", authRouter);
app.use("/api/khuvuc", khuVucRouter);
app.use("/api/monan", monAnRouter);
app.use("/api/khuyenmai", khuyenMaiRouter);
app.use("/api/loaimonan", loaiMonAnRouter);
app.use("/api/lichsutimkiem", lichSuTimKiemRouter);
app.use("/api/taikhoan", taiKhoanRouter);
app.use("/api/loainguyenlieu", loaiNLRouter);
app.use("/api/nguyenlieu", nguyenLieuRouter);
app.use("/api/yeuthich", yeuThichRouter);
app.use("/api/giohang", gioHangRouter);
app.use("/api/loaiban", loaiBanRouter);
app.use("/api/ban", banRouter);
app.use("/api/hoadon", hoaDonRouter);
app.use("/api/diachi", diaChiRouter);
app.use("/api/danhgia", danhGiaRouter);
app.use("/api/nhacungcap", nhaCungCapRouter);
app.use("/api/thongbao", thongBaoRouter);
app.use("/api/phieunhapkho", phieuNhapKhoRouter);
app.use("/api/thongke", thongKeRouter);
app.use("/api/recommend-dishes", recommendDishesRouter);
app.use("/api/recommend-dishes-byUser", recommendDishesByUserRouter);

// Chuyển hướng tất cả các yêu cầu không phải API đến URL của frontend
app.get("*", (req, res) => {
    res.redirect("https://nhahangchaysen-fe.onrender.com");
});

app.get("/", (req, res) => {
    res.send("Backend API is running!");
});

// Lịch chạy cron: mỗi ngày vào lúc 8:00 sáng
// chạy vào phút 0, giờ 8, hàng ngày, hàng tháng, hàng tuần

cron.schedule("0 8 * * *", async () => {
    console.log("Cron job chạy - gửi nhắc nhở đơn đặt bàn ngày mai");

    try {
        await sendReminderForTomorrowBookings();
    } catch (error) {
        console.error("Lỗi khi chạy cron gửi nhắc nhở:", error);
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
