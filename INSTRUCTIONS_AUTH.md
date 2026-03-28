
# Hướng Dẫn Cài Đặt Auth & Dashboard Movie App

## 1. Cài Đặt Dependencies
Chạy lệnh sau trong terminal để cài đặt các thư viện cần thiết cho việc mã hóa mật khẩu và xử lý phiên đăng nhập:
```bash
npm install bcryptjs jose
```
(Nếu muốn thêm biểu đồ cho Dashboard, hãy cài thêm: `npm install recharts`)

## 2. Cập Nhật Database
1. Mở phpMyAdmin hoặc công cụ quản lý MySQL của bạn.
2. Select database của dự án.
3. Import file `database/schema_users.sql` để tạo các bảng mới (users, transactions, watch_history, etc.).

## 3. Cấu Hình Biến Môi Trường (.env)
Thêm (hoặc cập nhật) các biến sau vào file `.env`:
```env
SESSION_SECRET="chuoi_bao_mat_ngau_nhien_dai_it_nhat_32_ky_tu"
```

## 4. Tài Khoản Admin
Hiện tại chưa có trang đăng ký Admin riêng. Bạn vui lòng:
1. Đăng ký một tài khoản User bình thường tại trang `/register`.
2. Truy cập Database, tìm bảng `users`.
3. Sửa cột `role` của user vừa tạo từ `member` thành `admin`.
4. Đăng nhập lại để truy cập `/admin`.

## 5. Cấu trúc Thư mục Mới
- `/app/login` & `/app/register`: Trang xác thực.
- `/app/admin`: Trang quản trị (Dashboard, Users).
- `/app/user`: Trang người dùng (Profile, History, Billing).
- `/app/api/auth`: API đăng nhập/đăng ký.
- `/lib/password.js` & `/lib/session.js`: Tiện ích bảo mật.

## 6. Lưu ý
- Hệ thống sử dụng JWT lưu trong Cookie (HttpOnly) để bảo mật.
- Mật khẩu được mã hóa bằng `bcrypt`.
- Middleware bảo vệ route Admin đã được tích hợp trong Layout (`app/admin/layout.jsx`).

Chúc bạn thành công!
