import { db } from "../db.js";

export const saveSearchHistory = async (req, res) => {
    const { maTaiKhoan, tuKhoa } = req.body;
    console.log("Received data:", { maTaiKhoan, tuKhoa });

    if (!tuKhoa || !maTaiKhoan) {
        console.error("Invalid data:", { maTaiKhoan, tuKhoa });
        return res.status(400).json({ message: "Dữ liệu không hợp lệ!" });
    }

    try {
        const query =
            "INSERT INTO LICHSU_TIMKIEM (maTaiKhoan, tuKhoa) VALUES (?, ?)";
        const [result] = await db.execute(query, [maTaiKhoan, tuKhoa]);
        console.log("Search history saved:", result);
        res.status(200).json({ message: "Lưu từ khóa thành công!", result });
    } catch (err) {
        console.error("Lỗi lưu từ khóa tìm kiếm: ", err);
        res.status(500).json({ message: "Lỗi khi lưu từ khóa tìm kiếm!" });
    }
};
