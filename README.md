<div align="center">

# 🚀 PingMe Server

**Hệ thống Backend API & Real-time Gateway cho ứng dụng PingMe**

![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-4479A1?style=for-the-badge&logo=mysql&logoColor=white)
![TypeORM](https://img.shields.io/badge/TypeORM-FE0803?style=for-the-badge&logo=typeorm&logoColor=white)
![Socket.io](https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socket.io&logoColor=white)
![Cloudinary](https://img.shields.io/badge/Cloudinary-3448C5?style=for-the-badge&logo=cloudinary&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white)
![Nodemailer](https://img.shields.io/badge/Nodemailer-22B573?style=for-the-badge&logo=gmail&logoColor=white)

> Máy chủ cung cấp RESTful API và máy chủ WebSocket (Signaling Gateway) mạnh mẽ, bảo mật, xử lý toàn bộ logic nghiệp vụ cho hệ sinh thái Nhắn tin, Gọi điện và Chia sẻ vị trí PingMe.

</div>

---

## 🌟 1. Tính năng chính

Hệ thống Server được thiết kế theo kiến trúc Module, đảm bảo tính mở rộng và toàn vẹn dữ liệu cho mọi nền tảng Client (App) và Admin (Manager):

### 🔐 Xác thực & Phân quyền (Auth Module)

- Mã hóa mật khẩu an toàn với **Bcrypt**.
- Quản lý phiên làm việc bằng **JWT** (Access Token & Refresh Token riêng biệt).
- Hỗ trợ xác thực 2 lớp **(2FA/OTP)** qua Email chuyên dụng cho tài khoản Quản trị viên (Admin).

### 💬 Trò chuyện & Cuộc gọi (Chat & WebRTC Gateway)

- **Real-time Messaging:** Giao tiếp thời gian thực qua **WebSockets** (nhắn tin, trạng thái "đang nhập", "đã xem").
- **WebRTC Signaling:** Hoạt động như máy chủ trung gian chuyển tiếp tín hiệu (`offer`, `answer`, `ICE candidates`) để thiết lập cuộc gọi Audio/Video P2P giữa các thiết bị.

### 🗺️ Khám phá & Sự kiện Bản đồ (Map Challenges)

- Xử lý luồng cập nhật định vị GPS dưới nền.
- Thuật toán tính toán khoảng cách địa lý **(Haversine)** để xác minh người dùng khi tương tác với sự kiện bản đồ.
- Hệ thống Transaction an toàn khi trả thưởng (Vật phẩm) để chống gian lận.

### 📸 Quản lý Khoảnh khắc (Moments)

- API lấy chữ ký bảo mật **(Presigned URL)** hỗ trợ upload trực tiếp ảnh/video lên **Cloudinary**.
- Hệ thống tiếp nhận và xử lý báo cáo (Report) các nội dung vi phạm tiêu chuẩn cộng đồng.

### 🛡️ Quản trị Hệ thống (Admin Services)

- API Dashboard cung cấp số liệu thống kê thời gian thực (số users, số kết nối online).
- Endpoint đặc quyền hỗ trợ khóa tài khoản, thu hồi vật phẩm và xóa vĩnh viễn bài viết vi phạm (kèm theo xóa file trên Cloud).

---

## 🛠️ 2. Công nghệ sử dụng

| Hạng mục | Công nghệ |
|---|---|
| **Core Framework** | [NestJS](https://nestjs.com/) (Node.js) |
| **Ngôn ngữ** | TypeScript |
| **Database** | MySQL |
| **ORM** | TypeORM |
| **Real-time** | Socket.IO |
| **Lưu trữ đa phương tiện** | [Cloudinary](https://cloudinary.com/) |
| **Bảo mật** | Passport-JWT, Bcrypt, Throttler (Rate Limiting) |
| **Email** | Nodemailer (SMTP Gmail) |
| **Task Scheduling** | `@nestjs/schedule` |

---

## 🚀 3. Cách cài đặt và chạy Project

### 📋 Yêu cầu hệ thống

- [Node.js](https://nodejs.org/) phiên bản **v18+**
- Máy chủ **MySQL** đã được cài đặt và khởi chạy

### 💻 Các bước thực hiện

**Bước 1: Clone project về máy**

```bash
git clone https://github.com/chuonghoai/PingMe-Backend.git
cd ping-me-server
```

**Bước 2: Cài đặt dependencies**

```bash
npm install
```

**Bước 3: Cấu hình biến môi trường**

Tạo file `.env` ở thư mục gốc (xem hướng dẫn chi tiết ở mục 4).

**Bước 4: Khởi chạy Server**

```bash
# Môi trường phát triển
npm run start:dev

# Build & chạy Production
npm run build
npm run start:prod
```

**Bước 5: Kiểm tra kết nối**

Máy chủ mặc định sẽ chạy tại: `http://localhost:3000`

---

## ⚙️ 4. Cấu hình Environment

Tạo file `.env` ở thư mục gốc của project (ngang hàng với `package.json`) với nội dung sau:

```env
# ==========================================
# Server
# ==========================================
PORT=3000

# ==========================================
# JWT Secrets
# ==========================================
JWT_ACCESS_SECRET=your_access_secret_key
JWT_REFRESH_SECRET=your_refresh_secret_key

# JWT Expiration
JWT_ACCESS_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=360d

# ==========================================
# Cloudinary
# ==========================================
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
CLOUDINARY_FOLDER=api_uploads

# ==========================================
# Mail Config (SMTP Gmail)
# ==========================================
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=your_email@gmail.com
MAIL_PASS=your_app_password
MAIL_FROM="PingMe App <noreply@pingme.com>"

# ==========================================
# Database (MySQL)
# ==========================================
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASS=your_db_password
DB_NAME=pingme

# ==========================================
# Admin Account (mặc định khi seed)
# ==========================================
ADMIN_MAIL=your_admin_email@gmail.com
ADMIN_PASSWORD=your_admin_password
```

> **Lưu ý:** Để lấy `MAIL_PASS` cho Gmail, hãy tạo **App Password** tại [https://myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords) (yêu cầu bật xác minh 2 bước).

---

## 🤝 5. Đóng góp (Contributing)

Mọi đóng góp để phát triển dự án luôn được trân trọng!

1. 🍴 **Fork** dự án
2. 🌿 Tạo nhánh tính năng: `git checkout -b feature/AwesomeFeature`
3. 💾 **Commit** thay đổi: `git commit -m 'Thêm tính năng AwesomeFeature'`
4. 🚀 **Push** lên nhánh: `git push origin feature/AwesomeFeature`
5. 📬 Mở **Pull Request** và mô tả chi tiết thay đổi của bạn

---

## 👨‍💻 6. Credits / Author

- **Dự án:** Máy chủ PingMe (Nhắn tin & Chia sẻ vị trí)
- **Phát triển bởi:** 
  * **Trương Hoài Chương**
  * **Phạm Hoài Nam**
* **Môn học:** Lập trình di động nâng cao
* **Trường:** Đại học Công nghệ Kỹ thuật TP.HCM (HCMUTE)


---

<div align="center">
<i>Dự án này là mã nguồn mở và được tạo ra với mục đích học tập.

</i>
</div>
