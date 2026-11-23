/**
 * Lõi Watch Party realtime (Socket.IO), dùng chung cho 2 cách chạy:
 *  - Gắn vào chính server của web (server.js): cùng tên miền, cùng cổng (Hostinger Node.js app)
 *  - Chạy riêng (socket-server/index.mjs) trên VPS / dịch vụ khác
 *
 * Server giữ trạng thái video "chuẩn" của phòng: { playing, time, updatedAt, episode }.
 * Vị trí hiện tại = time + (now - updatedAt)/1000 khi đang phát → người vào trễ đúng giây.
 * Xác thực bằng token HS256 do Next.js cấp (/api/watch-party/[code]/socket-token).
 */
import { Server } from 'socket.io';
import { jwtVerify } from 'jose';

/**
 * @param {import('node:http').Server} httpServer
 * @param {{ secret?: string, origins?: string[], path?: string }} [opts]
 */
export function attachWatchParty(httpServer, opts = {}) {
  const secret = opts.secret || process.env.SOCKET_SECRET || process.env.SESSION_SECRET || 'changethissecret12345';
  const key = new TextEncoder().encode(secret);
  const origins = opts.origins || (process.env.SOCKET_CORS_ORIGIN || '*').split(',').map((s) => s.trim()).filter(Boolean);
  const path = opts.path || '/socket.io';

  const ROOM_TTL_MS = 30 * 60 * 1000; // xoá phòng trống sau 30 phút
  const MAX_CHAT = 500;

  /** @type {Map<string, {state: object, users: Map<string, object>, allowAll: boolean, hostId: number, emptySince: number|null}>} */
  const rooms = new Map();

  const now = () => Date.now();
  const round3 = (n) => Math.round(n * 1000) / 1000;

  function currentTime(state, at = now()) {
    return state.playing ? state.time + Math.max(0, at - state.updatedAt) / 1000 : state.time;
  }

  function getRoom(roomId, init) {
    let room = rooms.get(roomId);
    if (!room) {
      room = {
        state: { playing: false, time: 0, updatedAt: now(), episode: init.episode || null, version: 0, by: null },
        users: new Map(),
        allowAll: false,
        hostId: init.hostId,
        emptySince: null,
      };
      rooms.set(roomId, room);
    }
    return room;
  }

  function publicState(room) {
    const t = now();
    return { ...room.state, time: round3(currentTime(room.state, t)), updatedAt: t, serverNow: t, allowAll: room.allowAll };
  }

  function presence(room) {
    // Gộp nhiều tab của cùng 1 người
    const byUser = new Map();
    for (const u of room.users.values()) byUser.set(u.userId, u);
    return [...byUser.values()].map(({ userId, username, faction, isHost }) => ({ userId, username, faction, isHost }));
  }

  const io = new Server(httpServer, {
    cors: { origin: origins.includes('*') ? true : origins, credentials: true },
    path,
    pingInterval: 20000,
    pingTimeout: 20000,
    maxHttpBufferSize: 16 * 1024,
  });

  // ---------- Xác thực khi kết nối ----------
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('NO_TOKEN'));
      const { payload } = await jwtVerify(token, key, { algorithms: ['HS256'], audience: 'watch-party' });
      if (!payload.room || !payload.uid) return next(new Error('BAD_TOKEN'));
      socket.data.user = {
        userId: Number(payload.uid),
        username: String(payload.name || 'Ẩn danh').slice(0, 60),
        faction: payload.faction === 'girlz' ? 'girlz' : 'boiz',
        isHost: !!payload.host,
        room: String(payload.room),
        hostId: Number(payload.hostId),
        episode: payload.ep || null,
      };
      next();
    } catch {
      next(new Error('AUTH_FAILED'));
    }
  });

  // Chống spam: tối đa `limit` sự kiện / `windowMs`
  function rateLimiter(limit, windowMs) {
    let hits = [];
    return () => {
      const t = now();
      hits = hits.filter((h) => t - h < windowMs);
      if (hits.length >= limit) return false;
      hits.push(t);
      return true;
    };
  }

  io.on('connection', (socket) => {
    const u = socket.data.user;
    const roomId = u.room;
    const room = getRoom(roomId, { episode: u.episode, hostId: u.hostId });
    room.emptySince = null;
    room.users.set(socket.id, u);
    socket.join(roomId);

    const allowControl = rateLimiter(20, 5000);
    const allowChat = rateLimiter(8, 5000);
    const canControl = () => u.isHost || room.allowAll;

    // Trạng thái hiện tại cho người mới vào (kể cả vào trễ)
    socket.emit('room:state', publicState(room));
    io.to(roomId).emit('room:presence', presence(room));
    socket.to(roomId).emit('room:notice', { type: 'join', username: u.username });

    // Đồng bộ đồng hồ (NTP đơn giản)
    socket.on('time:ping', (clientSent, ack) => {
      if (typeof ack === 'function') ack({ clientSent, serverNow: now() });
    });

    socket.on('sync:request', (...args) => {
      // ack có thể là tham số đầu hoặc cuối tuỳ cách client gọi
      const ack = args.reverse().find((a) => typeof a === 'function');
      if (ack) ack(publicState(room));
    });

    // Điều khiển video: play | pause | seek | episode | rate-limit
    socket.on('control', (msg = {}, ack) => {
      const reply = (r) => typeof ack === 'function' && ack(r);
      if (!canControl()) return reply({ ok: false, error: 'NOT_ALLOWED', state: publicState(room) });
      if (!allowControl()) return reply({ ok: false, error: 'RATE_LIMIT' });

      const s = room.state;
      const t = now();
      const time = Number(msg.time);
      const validTime = Number.isFinite(time) && time >= 0 && time < 24 * 3600;

      switch (msg.action) {
        case 'play':
          s.time = validTime ? time : currentTime(s, t);
          s.playing = true;
          break;
        case 'pause':
          s.time = validTime ? time : currentTime(s, t);
          s.playing = false;
          break;
        case 'seek':
          if (!validTime) return reply({ ok: false, error: 'BAD_TIME' });
          s.time = time;
          break;
        case 'episode':
          if (typeof msg.episode !== 'string' || !msg.episode || msg.episode.length > 255) return reply({ ok: false, error: 'BAD_EPISODE' });
          s.episode = msg.episode;
          s.time = 0;
          s.playing = false;
          break;
        default:
          return reply({ ok: false, error: 'BAD_ACTION' });
      }
      s.updatedAt = t;
      s.version += 1;
      s.by = { userId: u.userId, username: u.username, action: msg.action };
      const out = publicState(room);
      io.to(roomId).emit('room:state', out);
      reply({ ok: true, state: out });
    });

    // Chủ phòng cho phép / không cho phép mọi người điều khiển
    socket.on('room:allowAll', (value, ack) => {
      if (!u.isHost) return typeof ack === 'function' && ack({ ok: false });
      room.allowAll = !!value;
      io.to(roomId).emit('room:state', publicState(room));
      if (typeof ack === 'function') ack({ ok: true });
    });

    // Chat: tin đã lưu DB qua API (có id) → phát realtime cho cả phòng
    socket.on('chat:new', (msg = {}) => {
      if (!allowChat()) return;
      const content = String(msg.content || '').trim().slice(0, MAX_CHAT);
      const id = Number(msg.id);
      if (!content || !Number.isFinite(id)) return;
      io.to(roomId).emit('chat:new', {
        id,
        content,
        user_id: u.userId,
        username: u.username,
        faction: u.faction,
        created_at: new Date().toISOString(),
      });
    });

    socket.on('disconnect', () => {
      room.users.delete(socket.id);
      io.to(roomId).emit('room:presence', presence(room));
      if (![...room.users.values()].some((x) => x.userId === u.userId)) {
        socket.to(roomId).emit('room:notice', { type: 'leave', username: u.username });
      }
      if (room.users.size === 0) {
        room.emptySince = now();
        // Không ai xem → tạm dừng tại vị trí hiện tại để người vào sau không bị "nhảy"
        if (room.state.playing) {
          room.state.time = currentTime(room.state);
          room.state.playing = false;
          room.state.updatedAt = now();
        }
      }
    });
  });

  // Dọn phòng trống
  const cleanup = setInterval(() => {
    const t = now();
    for (const [id, room] of rooms) {
      if (room.users.size === 0 && room.emptySince && t - room.emptySince > ROOM_TTL_MS) rooms.delete(id);
    }
  }, 60 * 1000);
  cleanup.unref?.();

  // ---------- Rạp Chung: namespace công khai /cinema (chỉ nhận) ----------
  // Ai mở trang cũng nghe được chat + cập nhật hàng chờ; gửi tin đi qua API (có đăng nhập, lưu DB, chống spam)
  // rồi API phát lại qua namespace này. Middleware xác thực ở trên chỉ áp cho namespace "/".
  const cinema = io.of('/cinema');
  let viewersTimer = null;
  const emitViewers = () => {
    // Gộp nhiều lần vào/ra liên tiếp thành 1 lần phát
    if (viewersTimer) return;
    viewersTimer = setTimeout(() => {
      viewersTimer = null;
      cinema.emit('presence', { viewers: cinema.sockets.size });
    }, 500);
  };
  cinema.on('connection', (socket) => {
    socket.emit('presence', { viewers: cinema.sockets.size });
    emitViewers();
    socket.on('disconnect', emitViewers);
  });

  return { io, stats: () => ({ rooms: rooms.size, cinemaViewers: cinema.sockets.size }) };
}
