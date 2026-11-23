# Phòng Xem Chung realtime — hướng dẫn triển khai

Tài liệu cho người vận hành site trên **Hostinger Node.js app**: Hostinger lấy code từ GitHub, tự build và chạy.

Khi chạy, mọi người trong phòng thấy cùng một trạng thái video: **play, pause, tua, đổi tập**. Người vào trễ được đưa tới đúng giây đang chiếu. Chat hiện ra ngay khi gửi.

## Cách chạy trên Hostinger Node.js app (mặc định, không cần cấu hình thêm)

`server.js` ở thư mục gốc chạy **web (Next.js) và Socket.IO trên cùng một cổng**. Trình duyệt tự kết nối về chính tên miền của web qua đường dẫn `/socket.io`, nên:

- **Không cần** đặt `NEXT_PUBLIC_SOCKET_URL`.
- **Không cần** mở cổng riêng, không cần pm2, không cần SSH.
- Nếu proxy của Hostinger không cho WebSocket, Socket.IO tự dùng HTTP long-polling và vẫn đồng bộ được (đã test cả hai kiểu).

Việc duy nhất cần kiểm tra trong hPanel → Websites → *site* → **cài đặt Node.js app**:

| Mục | Giá trị |
|---|---|
| Build command | `npm run build` |
| Start command | `npm start` (script này chạy `node server.js`) |
| Node.js version | 18 trở lên |

> Preset Next.js của Hostinger chạy `next start` cũng được: `instrumentation.js` tự gắn Socket.IO vào server của Next khi khởi động, nên realtime vẫn chạy mà không cần đổi cấu hình.

Kiểm tra sau khi deploy: mở `https://<tên-miền>/api/health`. Thấy `"realtime":{"enabled":true,...}` là realtime đang chạy. Khi đã đăng nhập, trang này còn báo tình trạng database (bảng thiếu, lỗi migration).

Biến môi trường (đặt trong mục Environment variables của Node.js app):
- `SESSION_SECRET`: đã có sẵn, dùng luôn để ký token realtime.
- `SOCKET_SECRET`: không bắt buộc. Chỉ cần khi muốn dùng khoá riêng cho realtime.

## Thành phần

| Thành phần | File | Vai trò |
|---|---|---|
| Server chính | `server.js` | Next.js + Socket.IO trên cùng cổng, có `/socket-health` |
| Lõi realtime | `socket-server/core.mjs` | Quản lý phòng theo mã, giữ trạng thái video chuẩn, đồng bộ đồng hồ, phát chat |
| Chạy riêng (tuỳ chọn) | `socket-server/index.mjs` | Dùng khi muốn đặt socket server ở máy khác |
| Cấp token | `app/api/watch-party/[code]/socket-token/route.js` | Chỉ thành viên phòng mới lấy được token (hạn 6 giờ) |
| Hook đồng bộ | `components/watch-party/useWatchPartySync.js` | Gắn vào thẻ `<video>`: chống lặp sự kiện, bù lệch giờ, tự sửa trôi |
| Trình phát | `components/watch-party/HlsVideo.jsx` | Phát `link_m3u8` bằng hls.js (Safari dùng HLS gốc) |
| Trang phòng | `app/user/watch-party/[code]/page.jsx` | Ghép player, hook và chat lại với nhau |

Player cũ trên trang xem phim là iframe của phimapi, nằm ở domain khác nên trình duyệt không cho điều khiển từ ngoài. Vì vậy phòng xem chung phát trực tiếp nguồn `m3u8` của chính phim đó. Nguồn này cho phép phát từ domain khác (`Access-Control-Allow-Origin: *` ở cả playlist lẫn từng đoạn `.ts`).

## Tuỳ chọn: chạy socket server ở chỗ khác

Chỉ cần khi muốn tách realtime khỏi web (ví dụ web quá tải):

1. Deploy thư mục `socket-server/` lên dịch vụ Node có WebSocket (VPS, Render, Railway...): `npm install`, rồi `npm start`.
2. Đặt biến môi trường cho dịch vụ đó:
   - `SOCKET_SECRET` = giá trị **giống hệt** `SOCKET_SECRET` (hoặc `SESSION_SECRET`) của web
   - `SOCKET_CORS_ORIGIN=https://tenmien.com,https://www.tenmien.com`
   - `SOCKET_PORT` theo cổng dịch vụ cấp
3. Trong biến môi trường của web, đặt `NEXT_PUBLIC_SOCKET_URL=https://<địa-chỉ-socket-server>` rồi **build lại**, vì biến `NEXT_PUBLIC_*` được đóng gói lúc build.

## Cách đồng bộ hoạt động

- **Trạng thái chuẩn trên server:** `{ playing, time, updatedAt, episode }`. Vị trí hiện tại = `time + (bây giờ − updatedAt)` khi đang phát, nên người vào trễ nhảy đúng tới giây đang chiếu.
- **Bù lệch đồng hồ:** khi kết nối, client ping server 6 lần, lấy lần có thời gian khứ hồi nhỏ nhất và tính `offset = serverNow − (giờ gửi + RTT/2)`. Việc này lặp lại mỗi 30 giây.
- **Chống lặp sự kiện:** khi code tự gọi `play()`, `pause()` hoặc đặt `currentTime`, hook bật cờ tương ứng. Sự kiện video do chính code gây ra sẽ dùng hết cờ đó và không bị gửi ngược lên server.
- **Thao tác của người điều khiển:** vị trí mới được cập nhật ngay tại máy (cập nhật lạc quan). Bản phản hồi của server cho chính thao tác đó được bỏ qua, nên không bị kéo ngược.
- **Tự sửa trôi (mỗi giây):** lệch quá 1 giây thì nhảy thẳng. Lệch 0,2–1 giây thì tăng hoặc giảm tốc độ phát tối đa 8% để bắt kịp mà không giật. Khi đang dừng, khớp tới 0,05 giây.
- **Quyền điều khiển:** mặc định chỉ chủ phòng. Chủ phòng có thể bật "Cho mọi người cùng điều khiển".
- **Trình duyệt chặn tự phát:** hiện nút "Bấm để vào xem cùng".
- **Chat:** tin nhắn lưu database qua API (có `id`), rồi phát realtime qua socket. Phía nhận lọc trùng theo `id`. Tên người gửi lấy từ token nên không giả mạo được.

## Kết quả đo (2 trình duyệt, 2 tài khoản, video HLS thật)

| Tình huống | Độ lệch giữa 2 máy |
|---|---|
| Play | 0,02 giây |
| Tua | 0,1 giây |
| Pause | dưới 0,01 giây |
| Vào trễ / tải lại trang | 0,05 giây |
| Chat | tới nơi sau khoảng 50ms |
