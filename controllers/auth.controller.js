import { db } from "../db.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import crypto from "crypto";

import { OAuth2Client } from "google-auth-library";
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Cấu hình Nodemailer để gửi email
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

export const register = async (req, res) => {
    const { email, password, username } = req.body;
    try {
        const [rows] = await db.execute(
            "SELECT maTaiKhoan FROM TAIKHOAN WHERE email = ?",
            [email]
        );
        if (rows.length > 0) {
            return res.status(409).json({ message: "Email đã được sử dụng!" });
        }
        // Mã hóa mật khẩu trước khi lưu vào DB
        const hashed = await bcrypt.hash(password, 10);
        // Tạo mã xác nhận (activation token) ngẫu nhiên
        const activationToken = crypto.randomBytes(32).toString("hex");
        await db.execute(
            "INSERT INTO TAIKHOAN (email, matKhau, tenTaiKhoan, activationToken, isActive) VALUES (?, ?, ?, ?, ?)",
            [email, hashed, username, activationToken, false]
        );

        // Gửi email kích hoạt
        // const activationLink = `http://localhost:5173/activate-account?token=${activationToken}`;
        const activationLink = `https://nhahangchaysen-fe.onrender.com/activate-account?token=${activationToken}`;
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: "Kích hoạt tài khoản của bạn",
            html: `<p>Click vào liên kết dưới đây để kích hoạt tài khoản của bạn:</p><p><a href="${activationLink}">Kích hoạt tài khoản</a></p>`,
        };
        await transporter.sendMail(mailOptions);

        res.status(201).json({
            message:
                "Đăng ký thành công! Vui lòng kiểm tra email để kích hoạt tài khoản.",
        });
    } catch (err) {
        console.error("🔥 Lỗi tại register:", err);
        res.status(500).json({ message: "Lỗi server khi đăng ký" });
    }
};

export const login = async (req, res) => {
    const { email, password } = req.body;
    try {
        const [rows] = await db.execute(
            "SELECT * FROM TAIKHOAN WHERE email = ?",
            [email]
        );
        if (rows.length === 0)
            return res.status(404).json({ message: "Email không tồn tại" });

        const user = rows[0];

        // Kiểm tra trạng thái tài khoản
        if (user.trangThai === "khoa") {
            return res.status(403).json({
                message:
                    "Tài khoản của bạn đã bị khóa. Vui lòng liên hệ với nhà hàng để mở lại tài khoản.",
            });
        }

        // Kiểm tra tài khoản đã được kích hoạt chưa
        if (!user.isActive) {
            return res.status(403).json({
                message:
                    "Tài khoản chưa được kích hoạt. Vui lòng kiểm tra email để kích hoạt.",
            });
        }

        const isMatch = await bcrypt.compare(password, user.matKhau);
        if (!isMatch) return res.status(400).json({ message: "Sai mật khẩu" });

        const accessToken = jwt.sign(
            {
                id: user.maTaiKhoan,
                email: user.email,
                maVaiTro: user.maVaiTro,
                SDT: user.SDT,
            },
            process.env.JWT_SECRET,
            { expiresIn: "1h" }
        );

        const refreshToken = jwt.sign(
            {
                id: user.maTaiKhoan,
                email: user.email,
                maVaiTro: user.maVaiTro,
                SDT: user.SDT,
            },
            process.env.JWT_REFRESH_SECRET,
            { expiresIn: "7d" }
        );

        res.json({
            user: {
                id: user.maTaiKhoan,
                username: user.tenTaiKhoan,
                email: user.email,
                maVaiTro: user.maVaiTro,
                SDT: user.SDT,
            },
            token: accessToken,
            refreshToken: refreshToken,
        });
    } catch (err) {
        console.error("🔥 Lỗi tại login:", err); // Thêm log
        res.status(500).json({ message: "Lỗi server khi đăng nhập" });
    }
};

export const refresh = async (req, res) => {
    const { refreshToken } = req.body;
    if (!refreshToken)
        return res.status(401).json({ message: "Không có refresh token" });

    try {
        const decoded = jwt.verify(
            refreshToken,
            process.env.JWT_REFRESH_SECRET
        );
        const newAccessToken = jwt.sign(
            { id: decoded.id },
            process.env.JWT_SECRET,
            { expiresIn: "1h" }
        );
        res.json({ token: newAccessToken });
    } catch (err) {
        console.error("🔥 Lỗi tại refresh token:", err); // Thêm log
        res.status(403).json({
            message: "Refresh token không hợp lệ hoặc đã hết hạn!",
        });
    }
};

export const googleLogin = async (req, res) => {
    const { token } = req.body;

    try {
        // Xác thực token Google
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();

        // Lấy email và thông tin user từ payload
        const email = payload.email;
        const username = payload.name;

        // Kiểm tra user trong DB, nếu chưa có thì tạo mới
        const [rows] = await db.execute(
            "SELECT * FROM TAIKHOAN WHERE email = ?",
            [email]
        );

        let user;
        if (rows.length === 0) {
            // Tạo user mới với password ngẫu nhiên hoặc null
            const [result] = await db.execute(
                "INSERT INTO TAIKHOAN (email, tenTaiKhoan, matKhau, maVaiTro, SDT, isActive) VALUES (?, ?, ?, ?, ?, ?)",
                [email, username, null, 1, null, true]
            );
            const maMonAn = result.insertId;

            // Sau khi insert, lấy ID và chọn lại toàn bộ thông tin user
            const [newUserRows] = await db.execute(
                "SELECT * FROM TAIKHOAN WHERE maTaiKhoan = ?",
                [maMonAn]
            );

            user = newUserRows[0];

            console.log("User ID:", user.maTaiKhoan);
            console.log("User Username:", user.tenTaiKhoan);
        } else {
            user = rows[0];
        }

        // Kiểm tra trạng thái tài khoản
        if (user.trangThai === "khoa") {
            return res.status(403).json({
                message:
                    "Tài khoản của bạn đã bị khóa. Vui lòng liên hệ với nhà hàng để mở lại tài khoản.",
            });
        }

        // Tạo JWT cho app
        const accessToken = jwt.sign(
            {
                id: user.maTaiKhoan,
                email: user.email,
                maVaiTro: user.maVaiTro,
                SDT: user.SDT,
            },
            process.env.JWT_SECRET,
            { expiresIn: "1h" }
        );
        const refreshToken = jwt.sign(
            {
                id: user.maTaiKhoan,
                email: user.email,
                maVaiTro: user.maVaiTro,
                SDT: user.SDT,
            },
            process.env.JWT_REFRESH_SECRET,
            { expiresIn: "7d" }
        );

        res.json({
            user: {
                id: user.maTaiKhoan,
                username: user.tenTaiKhoan,
                email: user.email,
                maVaiTro: user.maVaiTro,
                SDT: user.SDT,
            },
            token: accessToken,
            refreshToken,
        });
    } catch (err) {
        console.error("Lỗi xác thực Google:", err);
        res.status(401).json({ message: "Token Google không hợp lệ" });
    }
};

export const facebookLogin = async (req, res) => {
    const { accessToken } = req.body;
    if (!accessToken) {
        return res
            .status(400)
            .json({ message: "Không có access token Facebook" });
    }

    try {
        // Kiểm tra token với Facebook
        const fbResponse = await fetch(
            `https://graph.facebook.com/me?fields=id,name,email&access_token=${accessToken}`
        );
        const fbData = await fbResponse.json();

        if (fbData.error) {
            return res
                .status(401)
                .json({ message: "Access token Facebook không hợp lệ" });
        }

        const { email, name } = fbData;

        // Kiểm tra user trong DB, tạo mới nếu chưa có
        const [rows] = await db.execute(
            "SELECT * FROM TAIKHOAN WHERE email = ?",
            [email]
        );
        let user;
        if (rows.length === 0) {
            const [result] = await db.execute(
                "INSERT INTO TAIKHOAN (email, tenTaiKhoan, matKhau, maVaiTro, SDT, isActive) VALUES (?, ?, ?, ?, ?, ?)",
                [email, name, null, 1, null, true]
            );
            user = {
                id: result.insertId,
                email,
                username: name,
                maVaiTro: 1,
                SDT: null,
            };
        } else {
            user = rows[0];
        }

        // Kiểm tra trạng thái tài khoản
        if (user.trangThai === "khoa") {
            return res.status(403).json({
                message:
                    "Tài khoản của bạn đã bị khóa. Vui lòng liên hệ với nhà hàng để mở lại tài khoản.",
            });
        }

        // Tạo JWT app
        const accessTokenApp = jwt.sign(
            {
                id: user.maTaiKhoan,
                email: user.email,
                maVaiTro: user.maVaiTro,
                SDT: user.SDT,
            },
            process.env.JWT_SECRET,
            { expiresIn: "1h" }
        );
        const refreshTokenApp = jwt.sign(
            {
                id: user.maTaiKhoan,
                email: user.email,
                maVaiTro: user.maVaiTro,
                SDT: user.SDT,
            },
            process.env.JWT_REFRESH_SECRET,
            { expiresIn: "7d" }
        );

        res.json({
            user: {
                id: user.maTaiKhoan,
                username: user.tenTaiKhoan,
                email: user.email,
                maVaiTro: user.maVaiTro,
                SDT: user.SDT,
            },
            token: accessTokenApp,
            refreshToken: refreshTokenApp,
        });
    } catch (err) {
        console.error("Lỗi đăng nhập Facebook:", err);
        res.status(500).json({ message: "Lỗi server khi đăng nhập Facebook" });
    }
};

export const activateAccount = async (req, res) => {
    const { token } = req.query;

    try {
        const [rows] = await db.execute(
            "SELECT * FROM TAIKHOAN WHERE activationToken = ?",
            [token]
        );

        if (rows.length === 0) {
            return res.status(400).json({ message: "Token không hợp lệ" });
        }

        const user = rows[0];

        // Cập nhật trạng thái tài khoản thành 'active'
        await db.execute(
            "UPDATE TAIKHOAN SET isActive = ? WHERE maTaiKhoan = ?",
            [true, user.maTaiKhoan]
        );

        res.json({ message: "Tài khoản đã được kích hoạt thành công!" });
    } catch (error) {
        console.error("Lỗi kích hoạt tài khoản:", error);
        res.status(500).json({ message: "Lỗi server khi kích hoạt tài khoản" });
    }
};

export const requestPasswordReset = async (req, res) => {
    const { email } = req.body;

    try {
        const [rows] = await db.execute(
            "SELECT maTaiKhoan FROM TAIKHOAN WHERE email = ?",
            [email]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: "Email không tồn tại" });
        }

        // Tạo token reset ngẫu nhiên, 32 bytes hex
        const resetToken = crypto.randomBytes(32).toString("hex");

        // Tạo thời gian hết hạn, sau 1 giờ
        const expireTime = new Date(Date.now() + 3600 * 1000);

        // Lưu token và thời hạn vào database
        await db.execute(
            "UPDATE TAIKHOAN SET resetToken = ?, resetTokenExpire = ? WHERE email = ?",
            [resetToken, expireTime, email]
        );

        // Gửi email chứa link reset
        // const resetLink = `http://localhost:5173/reset-password?token=${resetToken}`;
        const resetLink = `https://nhahangchaysen-fe.onrender.com/reset-password?token=${resetToken}`;
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: "Yêu cầu đặt lại mật khẩu",
            html: `
        <p>Bạn nhận được email này vì bạn (hoặc ai đó) đã yêu cầu đặt lại mật khẩu cho tài khoản của bạn.</p>
        <p>Click vào liên kết dưới đây để đặt lại mật khẩu (link chỉ có hiệu lực trong 1 giờ):</p>
        <p><a href="${resetLink}">Đặt lại mật khẩu</a></p>
        <p>Nếu bạn không yêu cầu, hãy bỏ qua email này.</p>
      `,
        };

        await transporter.sendMail(mailOptions);

        res.json({
            message:
                "Đã gửi email đặt lại mật khẩu. Vui lòng kiểm tra hộp thư.",
        });
    } catch (err) {
        console.error("Lỗi requestPasswordReset:", err);
        res.status(500).json({
            message: "Lỗi server khi yêu cầu đặt lại mật khẩu",
        });
    }
};

export const resetPassword = async (req, res) => {
    const { token, newPassword } = req.body;

    try {
        const [rows] = await db.execute(
            "SELECT * FROM TAIKHOAN WHERE resetToken = ? AND resetTokenExpire > NOW()",
            [token]
        );

        if (rows.length === 0) {
            return res.status(400).json({
                message: "Token đặt lại mật khẩu không hợp lệ hoặc đã hết hạn",
            });
        }

        const user = rows[0];

        // Mã hóa mật khẩu mới
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Cập nhật mật khẩu, đồng thời xóa token reset
        await db.execute(
            "UPDATE TAIKHOAN SET matKhau = ?, resetToken = NULL, resetTokenExpire = NULL WHERE maTaiKhoan = ?",
            [hashedPassword, user.maTaiKhoan]
        );

        res.json({ message: "Đặt lại mật khẩu thành công!" });
    } catch (err) {
        console.error("Lỗi resetPassword:", err);
        res.status(500).json({ message: "Lỗi server khi đặt lại mật khẩu" });
    }
};
