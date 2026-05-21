const GROUP_URL = 'https://zalo.me/g/qgvjac916';

export const metadata = {
  title: 'Tham gia nhóm Zalo - GenzMovie',
};

export default function ZaloPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md bg-[#1a1a1a] rounded-2xl p-6 border border-[#333] text-center">
        <h1 className="text-xl md:text-2xl font-bold text-white mb-2">
          Tham gia nhóm Zalo GenzMovie
        </h1>
        <p className="text-gray-400 text-sm mb-6">
          Quét mã QR bên dưới hoặc bấm vào liên kết để vào nhóm.
        </p>
        <div className="bg-white rounded-xl p-3 mb-5 inline-block">
          <img
            src="/images/QR-nhom.jpg"
            alt="QR nhóm Zalo GenzMovie"
            className="w-64 h-64 object-contain"
          />
        </div>
        <a
          href={GROUP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="block text-yellow-400 hover:underline break-all text-sm"
        >
          {GROUP_URL}
        </a>
      </div>
    </div>
  );
}
