# Phòng Xem Chung realtime — hướng dẫn triển khai

Tài liệu cho người vận hành site, đã quen SSH vào Hostinger và dùng pm2.

Khi chạy, mọi người trong phòng thấy cùng một trạng thái video: **play, pause, tua, đổi tập**. Người vào trễ được đưa tới đúng giây đang chiếu. Chat hiện ra ngay khi gửi.

## Thành phần

| Thành phần | File | Vai trò |
|---|---|---|
| Socket.IO server | `socket-server/index.mjs` | Quản lý phòng theo mã, giữ trạng thái video chuẩn, đồng bộ đồng hồ, phát chat |
| Cấp token | `app/api/watch-party/[code]/socket-token/route.js` | Chỉ thành viên phòng mới lấy được token (hạn 6 giờ) để kết nối socket |
| Hook đồng bộ | `components/watch-party/useWatchPartySync.js` | Gắn vào thẻ `<video>`: chống lặp sự kiện, bù lệch giờ, tự sửa trôi |
| Trình phát | `components/watch-party/HlsVideo.jsx` | Phát `link_m3u8` bằng hls.js (Safari dùng HLS gốc) |
| Trang phòng | `app/user/watch-party/[code]/page.jsx` | Ghép player, hook và chat lại với nhau |

Player cũ trên trang xem phim là iframe của phimapi, nằm ở domain khác nên trình duyệt không cho điều khiển từ ngoài. Vì vậy phòng xem chung phát trực tiếp nguồn `m3u8` của chính phim đó. Nguồn này cho phép phát từ domain khác (đã kiểm tra header `Access-Control-Allow-Origin: *` ở cả playlist lẫn từng đoạn `.ts`).

## Biến môi trường

Thêm vào file `.env` ở thư mục gốc project trên server:

```env
# Địa chỉ socket server mà trình duyệt người xem kết nối tới (bắt buộc https nếu site chạy https)
NEXT_PUBLIC_SOCKET_URL=https://socket.tenmien.com

# Cổng socket server lắng nghe bên trong server
SOCKET_PORT=3001

# Domain được phép kết nối, phân tách bằng dấu phẩy
SOCKET_CORS_ORIGIN=https://tenmien.com,https://www.tenmien.com

# Khoá ký token. Bỏ trống thì dùng SESSION_SECRET (khi web và socket chạy chung server)
SOCKET_SECRET=
```

> **Quan trọng:** `NEXT_PUBLIC_SOCKET_URL` được đóng gói vào code trình duyệt **lúc `npm run build`**. Khi thêm hoặc đổi biến này phải build lại. Workflow deploy đã tự build trên server sau mỗi lần push, nên chỉ cần sửa `.env` trước rồi push, hoặc SSH vào chạy `npm run build && pm2 startOrRestart ecosystem.config.js`.

Chưa đặt `NEXT_PUBLIC_SOCKET_URL` thì phòng vẫn hoạt động: video phát riêng trên từng máy, chat cập nhật mỗi 3 giây. Góc phòng hiện nhãn "Chưa bật realtime".

## Cách A: chạy chung server Hostinger (VPS hoặc gói có SSH và pm2)

1. `ecosystem.config.js` đã khai báo sẵn 2 app: `fullmovie` (Next.js, cổng 3000) và `fullmovie-socket` (Socket.IO, cổng 3001). Workflow deploy chạy `pm2 startOrRestart ecosystem.config.js`, nên socket server tự khởi động sau mỗi lần push.
2. Kiểm tra trên server:
   ```bash
   pm2 status                          # thấy fullmovie-socket đang online
   curl http://127.0.0.1:3001/health   # {"ok":true,...}
   ```
3. Đưa cổng 3001 ra ngoài qua HTTPS (WebSocket cần `wss://`). Với **Nginx**, tạo subdomain `socket.tenmien.com`:
   ```nginx
   server {
     server_name socket.tenmien.com;
     location / {
       proxy_pass http://127.0.0.1:3001;
       proxy_http_version 1.1;
       proxy_set_header Upgrade $http_upgrade;
       proxy_set_header Connection "upgrade";
       proxy_set_header Host $host;
       proxy_read_timeout 3600s;
     }
     # listen 443 ssl; ... (cấp SSL bằng certbot: certbot --nginx -d socket.tenmien.com)
   }
   ```
   Sau đó đặt `NEXT_PUBLIC_SOCKET_URL=https://socket.tenmien.com`.
4. Nếu không dùng subdomain, có thể đặt chung domain với đường dẫn `/socket.io/` (proxy `location /socket.io/` về `127.0.0.1:3001`). Khi đó `NEXT_PUBLIC_SOCKET_URL=https://tenmien.com`.

## Cách B: gói Hostinger không mở được cổng / không có pm2

Deploy riêng thư mục `socket-server/` lên một dịch vụ Node có WebSocket (Render, Railway, Fly.io, VPS bất kỳ):

- Root directory: `socket-server`
- Build: `npm install` · Start: `npm start`
- Biến môi trường:
  - `SOCKET_SECRET`: chuỗi bí mật, **phải giống hệt** `SOCKET_SECRET` (hoặc `SESSION_SECRET`) trong `.env` của web
  - `SOCKET_CORS_ORIGIN=https://tenmien.com,https://www.tenmien.com`
  - `SOCKET_PORT`: theo cổng dịch vụ cấp (nhiều nơi dùng biến `PORT`; đặt `SOCKET_PORT=$PORT`)

Rồi đặt `NEXT_PUBLIC_SOCKET_URL=https://<địa-chỉ-dịch-vụ>` trong `.env` của web và build lại.

## Cách đồng bộ hoạt động

- **Trạng thái chuẩn trên server:** `{ playing, time, updatedAt, episode }`. Vị trí hiện tại = `time + (bây giờ − updatedAt)` khi đang phát. Nhờ vậy người vào trễ nhảy đúng tới giây đang chiếu.
- **Bù lệch đồng hồ:** khi kết nối, client ping server 6 lần, lấy lần có thời gian khứ hồi nhỏ nhất và tính `offset = serverNow − (giờ gửi + RTT/2)`. Việc này lặp lại mỗi 30 giây.
- **Chống lặp sự kiện:** khi code tự gọi `play()`, `pause()` hoặc đặt `currentTime`, hook bật cờ tương ứng. Sự kiện video do chính code gây ra sẽ dùng hết cờ đó và không bị gửi ngược lên server, nên không xảy ra vòng lặp.
- **Tự sửa trôi (mỗi giây):** lệch quá 1 giây thì nhảy thẳng tới vị trí đúng. Lệch 0,2–1 giây thì tăng hoặc giảm tốc độ phát tối đa 8% để bắt kịp mà không giật.
- **Quyền điều khiển:** mặc định chỉ chủ phòng. Chủ phòng có thể bật "Cho mọi người cùng điều khiển". Người không có quyền mà bấm thì video tự quay về trạng thái của phòng.
- **Trình duyệt chặn tự phát:** hiện nút "Bấm để vào xem cùng". Bấm xong là nhảy đúng giây và phát.
- **Chat:** tin nhắn lưu vào database qua API (có `id`), rồi phát realtime qua socket. Phía nhận lọc trùng theo `id`. Người vào sau vẫn thấy lịch sử chat.

## Kiểm tra nhanh sau khi deploy

1. `curl https://socket.tenmien.com/health` trả về `{"ok":true,...}`.
2. Mở cùng một phòng trên 2 trình duyệt bằng 2 tài khoản. Nhãn góc phòng chuyển sang **"Đồng bộ · xx ms"**.
3. Chủ phòng bấm play, tua hoặc pause: máy còn lại làm theo trong khoảng dưới 1 giây.
4. Tải lại trang ở máy khách giữa chừng: máy khách quay lại đúng đoạn đang chiếu.
