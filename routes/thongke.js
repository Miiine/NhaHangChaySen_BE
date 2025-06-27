import express from "express";

import {
    getMonAnSold,
    getSoLuongHoaDonDaHoanThanh,
    getTongDoanhThuDaHoanThanh,
    getSoLuongKhachHangVaiTro1,
    getDoanhThuVaLoiNhuan,
} from "../controllers/thongke.controller.js";

const router = express.Router();
router.get("/", getMonAnSold);

// Route lấy số lượng hóa đơn da_hoan_thanh theo ngày đặt bàn, lọc theo năm và tháng
router.get("/soLuongHoaDonDaHoanThanh", getSoLuongHoaDonDaHoanThanh);

// Route lấy tổng doanh thu da_hoan_thanh theo ngày đặt bàn, lọc theo năm và tháng
router.get("/tongDoanhThuDaHoanThanh", getTongDoanhThuDaHoanThanh);

// Route lấy số lượng khách hàng với mã vai trò = 1 theo ngày tạo tài khoản lọc theo năm và tháng
router.get("/soLuongKhachHangVaiTro1", getSoLuongKhachHangVaiTro1);

//Route lấy doanh thu và lợi nhuận theo ngày hoặc tháng
router.get("/doanhThuVaLoiNhuan", getDoanhThuVaLoiNhuan);

export default router;
