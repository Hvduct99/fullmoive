# HƯỚNG DẪN SỬA LỖI ĐĂNG KÝ (LỖI 500) & FIX GIAO DIỆN

## 1. Sửa lỗi 500 khi đăng ký (Quan trọng nhất)
Lỗi `500 Internal Server Error` khi đăng ký tài khoản mới là do **database chưa có bảng `users`**. Bạn cần chạy file SQL để tạo bảng này trên hosting (phpMyAdmin).

### Cách làm:
1. Đăng nhập vào **phpMyAdmin** trên Hostinger (hoặc hosting bạn đang dùng).
2. Chọn database của bạn (ví dụ: `u123456789_movie`).
3. Nhấn vào tab **Import** (Nhập).
4. Chọn file `database/schema_users.sql` trong thư mục code của bạn và nhấn **Go** (Thực hiện).
   - Hoặc copy nội dung file này, vào tab **SQL**, paste vào và nhấn **Go**.

Sau khi chạy xong, bảng `users` sẽ được tạo và chức năng Đăng ký sẽ hoạt động.

## 2. Sửa lỗi nút Đăng nhập/Đăng ký không hiện ở trang chủ
Tôi đã sửa lại code trong file `components/Header.jsx`.
- Trước đây nút bị ẩn trên màn hình nhỏ/mobile hoặc do lỗi kiểm tra trạng thái đăng nhập.
- Giờ tôi đã bỏ class ẩn (`hidden`) và sửa logic kiểm tra session để nút luôn hiển thị nếu chưa đăng nhập.

## 3. Cập nhật mã nguồn
Sau khi làm bước 1 xong, bạn hãy deploy lại code mới nhất lên Vercel/Hostinger để áp dụng sửa lỗi giao diện.
