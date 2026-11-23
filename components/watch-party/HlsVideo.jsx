'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';

/**
 * Trình phát HLS (.m3u8) dùng thẻ <video> thật → điều khiển được play/pause/seek
 * (iframe player bên thứ ba không cho phép điều khiển từ ngoài).
 * Safari/iOS phát HLS gốc; trình duyệt khác dùng hls.js.
 */
const HlsVideo = forwardRef(function HlsVideo({ src, poster, className = '' }, ref) {
  const videoRef = useRef(null);
  const [error, setError] = useState('');
  useImperativeHandle(ref, () => videoRef.current, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;
    let hls = null;
    let cancelled = false;
    setError('');

    const native = video.canPlayType('application/vnd.apple.mpegurl');
    (async () => {
      const { default: Hls } = await import('hls.js');
      if (cancelled) return;
      if (Hls.isSupported()) {
        hls = new Hls({ enableWorker: true, backBufferLength: 60, maxBufferLength: 30 });
        hls.loadSource(src);
        hls.attachMedia(video);
        let mediaRetry = 0;
        hls.on(Hls.Events.ERROR, (_e, data) => {
          if (!data.fatal) return;
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            hls.startLoad(); // mạng chập chờn → tải lại
          } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR && mediaRetry < 3) {
            mediaRetry += 1;
            hls.recoverMediaError();
          } else {
            setError('Không phát được nguồn video này. Thử tập khác hoặc tải lại trang.');
            hls.destroy();
          }
        });
      } else if (native) {
        video.src = src;
      } else {
        setError('Trình duyệt không hỗ trợ phát HLS.');
      }
    })();

    return () => {
      cancelled = true;
      if (hls) hls.destroy();
      video.removeAttribute('src');
      video.load();
    };
  }, [src]);

  return (
    <div className={`relative w-full h-full bg-black ${className}`}>
      <video ref={videoRef} poster={poster} controls playsInline preload="auto" className="absolute inset-0 w-full h-full" />
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 text-center p-4">
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}
    </div>
  );
});

export default HlsVideo;
