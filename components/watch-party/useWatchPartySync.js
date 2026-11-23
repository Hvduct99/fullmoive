'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * useWatchPartySync — gắn 1 thẻ <video> vào phòng xem chung realtime (Socket.IO).
 *
 * Cơ chế chính:
 *  1. Cờ chống lặp sự kiện: khi CODE tự gọi play()/pause()/currentTime=, ta bật cờ
 *     "đang chờ sự kiện X do mình gây ra". Sự kiện video tương ứng sẽ tiêu thụ cờ đó
 *     và KHÔNG gửi ngược lên server → không có vòng lặp play/pause vô tận.
 *  2. Bù lệch đồng hồ: ping server vài lần, lấy mẫu có RTT nhỏ nhất →
 *     offset = serverNow − (clientSent + RTT/2). Vị trí chuẩn của phòng được tính
 *     theo giờ server nên mọi máy cùng một mốc.
 *  3. Sửa trôi: mỗi giây so vị trí thật với vị trí chuẩn. Lệch > 1s → nhảy thẳng;
 *     lệch nhỏ → tăng/giảm playbackRate vài % để bắt kịp mượt mà, không giật.
 *  4. Vào trễ: server gửi { time, updatedAt, playing } → tính đúng giây hiện tại.
 */

const HARD_SEEK_THRESHOLD = 1.0; // giây
const SOFT_SYNC_THRESHOLD = 0.2; // giây
const MAX_RATE_DELTA = 0.08; // ±8% tốc độ khi bắt kịp
const FLAG_TTL_MS = 4000;
const SEEK_DEBOUNCE_MS = 350;

export function computeTarget(state, serverNowMs) {
  if (!state) return 0;
  return state.playing ? state.time + Math.max(0, serverNowMs - state.updatedAt) / 1000 : state.time;
}

export default function useWatchPartySync({ code, video: videoEl, socketUrl, isHost = false, selfId = null, enabled = true, onEpisodeChange, onChat, onNotice }) {
  const [status, setStatus] = useState(socketUrl ? 'idle' : 'disabled'); // idle|connecting|connected|reconnecting|error|disabled
  const [error, setError] = useState('');
  const [roomState, setRoomState] = useState(null);
  const [presence, setPresence] = useState([]);
  const [needsGesture, setNeedsGesture] = useState(false);
  const [clock, setClock] = useState({ offset: 0, rtt: null });
  const [lastAction, setLastAction] = useState(null);
  const [canControl, setCanControl] = useState(isHost);

  // Phần tử <video> có thể mount muộn (sau khi tải phòng) → giữ trong ref + làm dependency
  const videoRef = useRef(null);
  videoRef.current = videoEl || null;
  const socketRef = useRef(null);
  const stateRef = useRef(null);
  const offsetRef = useRef(0);
  const isHostRef = useRef(isHost);
  isHostRef.current = isHost;
  const needsGestureRef = useRef(false);
  const selfIdRef = useRef(selfId);
  selfIdRef.current = selfId;
  // Số lệnh điều khiển mình đã gửi nhưng server chưa xác nhận
  const pendingRef = useRef(0);
  const flagsRef = useRef({ play: 0, pause: 0, seek: 0 }); // hạn dùng (ms) của cờ chống lặp
  const seekTimerRef = useRef(null);
  const cbRef = useRef({ onEpisodeChange, onChat, onNotice });
  cbRef.current = { onEpisodeChange, onChat, onNotice };

  const serverNow = useCallback(() => Date.now() + offsetRef.current, []);

  // ---------- Cờ chống lặp ----------
  const raise = (kind) => { flagsRef.current[kind] = Date.now() + FLAG_TTL_MS; };
  const consume = (kind) => {
    if (flagsRef.current[kind] > Date.now()) { flagsRef.current[kind] = 0; return true; }
    return false;
  };

  const safePlay = useCallback((video) => {
    raise('play');
    const p = video.play();
    if (p && typeof p.catch === 'function') {
      p.then(() => setNeedsGesture(false)).catch((err) => {
        flagsRef.current.play = 0;
        if (err && err.name === 'NotAllowedError') setNeedsGesture(true); // trình duyệt chặn autoplay
      });
    }
  }, []);

  const safePause = (video) => { raise('pause'); video.pause(); };
  const safeSeek = (video, t) => {
    const dur = Number.isFinite(video.duration) && video.duration > 0 ? video.duration - 0.25 : Infinity;
    raise('seek');
    video.currentTime = Math.max(0, Math.min(t, dur));
  };

  /** Áp trạng thái phòng vào video local. */
  const applyState = useCallback((s, { force = false } = {}) => {
    const video = videoRef.current;
    if (!video || !s) return;
    if (video.readyState < 1) return; // chưa có metadata → sẽ áp lại ở 'loadedmetadata'
    const target = computeTarget(s, serverNow());
    const diff = Math.abs(video.currentTime - target);
    // Đang dừng: khớp gần như tuyệt đối (0.05s); đang phát: để vòng sửa trôi xử lý mượt
    if (force || diff > (s.playing ? 0.5 : 0.05)) safeSeek(video, target);
    if (s.playing && video.paused) safePlay(video);
    if (!s.playing && !video.paused) safePause(video);
    if (!s.playing) video.playbackRate = 1;
  }, [videoRef, serverNow, safePlay]);

  // ---------- Đồng bộ đồng hồ ----------
  const syncClock = useCallback(async (samples = 5) => {
    const socket = socketRef.current;
    if (!socket?.connected) return;
    let best = null;
    for (let i = 0; i < samples; i++) {
      const res = await new Promise((resolve) => {
        const sent = Date.now();
        const timer = setTimeout(() => resolve(null), 3000);
        socket.emit('time:ping', sent, (r) => {
          clearTimeout(timer);
          const recv = Date.now();
          resolve(r ? { rtt: recv - sent, offset: r.serverNow - (sent + (recv - sent) / 2) } : null);
        });
      });
      if (res && (!best || res.rtt < best.rtt)) best = res;
    }
    if (best) {
      offsetRef.current = best.offset;
      setClock({ offset: Math.round(best.offset), rtt: best.rtt });
    }
  }, []);

  // ---------- Kết nối ----------
  useEffect(() => {
    if (!enabled || !socketUrl || !code) { setStatus(socketUrl ? 'idle' : 'disabled'); return; }
    let cancelled = false;
    let clockTimer = null;
    let socket = null;

    const getToken = async () => {
      const res = await fetch(`/api/watch-party/${code}/socket-token`, { cache: 'no-store' });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.message || 'Không lấy được token');
      return d.token;
    };

    (async () => {
      setStatus('connecting');
      setError('');
      let io;
      try {
        ({ io } = await import('socket.io-client'));
      } catch {
        setStatus('error'); setError('Không tải được thư viện realtime'); return;
      }
      if (cancelled) return;

      socket = io(socketUrl, {
        // Bắt đầu bằng HTTP long-polling rồi tự nâng cấp lên WebSocket nếu proxy cho phép
        // → luôn kết nối được kể cả khi hosting chặn WebSocket
        transports: ['polling', 'websocket'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 8000,
        timeout: 10000,
        // Lấy token mới mỗi lần (re)connect → không lo token hết hạn
        auth: (cb) => { getToken().then((token) => cb({ token })).catch(() => cb({ token: '' })); },
      });
      socketRef.current = socket;

      socket.on('connect', async () => {
        setStatus('connected');
        setError('');
        await syncClock(6);
        socket.emit('sync:request', (s) => s && handleState(s, true));
      });
      socket.on('disconnect', () => setStatus('reconnecting'));
      socket.io.on('reconnect_attempt', () => setStatus('reconnecting'));
      socket.on('connect_error', (err) => {
        setStatus('error');
        setError(err?.message === 'AUTH_FAILED' || err?.message === 'NO_TOKEN' ? 'Xác thực realtime thất bại' : 'Không kết nối được máy chủ đồng bộ');
      });

      const handleState = (s, force = false) => {
        // Server gửi updatedAt = serverNow tại thời điểm phát → dùng thẳng
        const prev = stateRef.current;
        // Phản hồi (echo) cho chính thao tác của mình: video đã ở đúng chỗ → chỉ cập nhật trạng thái, không áp lại
        if (!force && pendingRef.current > 0 && s.by && s.by.userId === selfIdRef.current && s.by.action !== 'episode') {
          stateRef.current = s;
          setRoomState(s);
          setLastAction({ ...s.by, at: Date.now() });
          return;
        }
        stateRef.current = s;
        setRoomState(s);
        if (s.by) setLastAction({ ...s.by, at: Date.now() });
        const allowed = isHostRef.current || !!s.allowAll;
        setCanControl(allowed);
        if (s.episode && (!prev || prev.episode !== s.episode || force)) {
          cbRef.current.onEpisodeChange?.(s.episode);
        }
        applyState(s, { force });
      };

      socket.on('room:state', (s) => handleState(s));
      socket.on('room:presence', (list) => setPresence(list));
      socket.on('chat:new', (m) => cbRef.current.onChat?.(m));
      socket.on('room:notice', (n) => cbRef.current.onNotice?.(n));

      clockTimer = setInterval(() => syncClock(3), 30000);
    })();

    return () => {
      cancelled = true;
      clearInterval(clockTimer);
      clearTimeout(seekTimerRef.current);
      if (socket) { socket.removeAllListeners(); socket.disconnect(); }
      socketRef.current = null;
    };
  }, [code, socketUrl, enabled, syncClock, applyState]);

  // ---------- Sự kiện local của video → gửi server ----------
  const emitControl = useCallback((action, extra = {}) => {
    const socket = socketRef.current;
    if (!socket?.connected) return;
    // Cập nhật lạc quan: vòng sửa trôi lấy vị trí mới ngay, không kéo ngược thao tác của chính mình
    const cur = stateRef.current;
    if (cur && action !== 'episode') {
      const t = Number.isFinite(extra.time) ? extra.time : computeTarget(cur, serverNow());
      stateRef.current = {
        ...cur,
        time: t,
        updatedAt: serverNow(),
        playing: action === 'play' ? true : action === 'pause' ? false : cur.playing,
      };
    }
    pendingRef.current += 1;
    let settled = false;
    const settle = () => { if (!settled) { settled = true; pendingRef.current = Math.max(0, pendingRef.current - 1); } };
    const timer = setTimeout(settle, 5000); // phòng khi mất ack
    socket.emit('control', { action, ...extra }, (r) => {
      clearTimeout(timer);
      settle();
      if (r && !r.ok && r.state) { stateRef.current = r.state; setRoomState(r.state); applyState(r.state, { force: true }); }
    });
  }, [applyState, serverNow]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const allowed = () => isHostRef.current || !!stateRef.current?.allowAll;
    const revert = () => {
      cbRef.current.onNotice?.({ type: 'denied' });
      if (stateRef.current) applyState(stateRef.current, { force: true });
    };

    const onPlay = () => {
      if (consume('play')) return;
      if (!socketRef.current?.connected || !stateRef.current) return;
      if (!allowed()) return revert();
      if (!stateRef.current.playing) emitControl('play', { time: video.currentTime });
    };
    const onPause = () => {
      if (consume('pause')) return;
      if (video.ended) return;
      if (!socketRef.current?.connected || !stateRef.current) return;
      if (!allowed()) return revert();
      if (stateRef.current.playing) emitControl('pause', { time: video.currentTime });
    };
    const onSeeked = () => {
      if (consume('seek')) return;
      if (!socketRef.current?.connected || !stateRef.current) return;
      if (!allowed()) return revert();
      // Giữ vị trí mới ngay (tránh vòng sửa trôi kéo ngược trong lúc chờ debounce)
      stateRef.current = { ...stateRef.current, time: video.currentTime, updatedAt: serverNow() };
      // Kéo thanh thời gian liên tục → chỉ gửi vị trí cuối cùng
      clearTimeout(seekTimerRef.current);
      seekTimerRef.current = setTimeout(() => emitControl('seek', { time: video.currentTime }), SEEK_DEBOUNCE_MS);
    };
    const onMeta = () => { if (stateRef.current) applyState(stateRef.current, { force: true }); };

    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('seeked', onSeeked);
    video.addEventListener('loadedmetadata', onMeta);
    return () => {
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('seeked', onSeeked);
      video.removeEventListener('loadedmetadata', onMeta);
    };
  }, [videoEl, emitControl, applyState, serverNow]);

  // ---------- Vòng sửa trôi thời gian ----------
  useEffect(() => {
    const t = setInterval(() => {
      const video = videoRef.current;
      const s = stateRef.current;
      if (!video || !s || video.readyState < 3 || video.seeking || !socketRef.current?.connected) return;
      const target = computeTarget(s, serverNow());
      const diff = video.currentTime - target; // >0: đang nhanh hơn phòng
      if (s.playing) {
        if (video.paused) { if (!needsGestureRef.current) safePlay(video); return; }
        if (Math.abs(diff) > HARD_SEEK_THRESHOLD) {
          safeSeek(video, target);
          video.playbackRate = 1;
        } else if (Math.abs(diff) > SOFT_SYNC_THRESHOLD) {
          video.playbackRate = 1 - Math.max(-MAX_RATE_DELTA, Math.min(MAX_RATE_DELTA, diff * 0.5));
        } else if (video.playbackRate !== 1) {
          video.playbackRate = 1;
        }
      } else {
        if (!video.paused) safePause(video);
        if (Math.abs(diff) > 0.05) safeSeek(video, target);
      }
    }, 1000);
    return () => clearInterval(t);
  }, [videoRef, serverNow, safePlay]);

  needsGestureRef.current = needsGesture;

  useEffect(() => { setCanControl(isHost || !!stateRef.current?.allowAll); }, [isHost]);

  // Quay lại tab → xin trạng thái mới nhất
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState !== 'visible') return;
      socketRef.current?.emit('sync:request', (s) => { if (s) { stateRef.current = s; setRoomState(s); applyState(s); } });
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [applyState]);

  /** Người dùng bấm "Tham gia xem" khi trình duyệt chặn autoplay. */
  const resumeWithGesture = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    setNeedsGesture(false);
    const s = stateRef.current;
    if (s) {
      safeSeek(video, computeTarget(s, serverNow()));
      if (s.playing) safePlay(video);
    }
  }, [videoRef, serverNow, safePlay]);

  const changeEpisode = useCallback((episode) => emitControl('episode', { episode }), [emitControl]);

  const setAllowAll = useCallback((value) => {
    socketRef.current?.emit('room:allowAll', !!value);
  }, []);

  const broadcastChat = useCallback((msg) => {
    socketRef.current?.emit('chat:new', msg);
  }, []);

  return {
    status, error, roomState, presence, canControl, needsGesture, clock, lastAction,
    serverNow, resumeWithGesture, changeEpisode, setAllowAll, broadcastChat,
    connected: status === 'connected',
  };
}
