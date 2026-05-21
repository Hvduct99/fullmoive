import nodemailer from 'nodemailer';

let transporter;

function getTransporter() {
  if (transporter) return transporter;
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    throw new Error('SMTP chưa được cấu hình. Hãy đặt SMTP_HOST, SMTP_USER, SMTP_PASS trong .env');
  }
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT || 587),
    secure: SMTP_SECURE === 'true',
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  return transporter;
}

export async function sendVerificationEmail({ to, code }) {
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  await getTransporter().sendMail({
    from: `"GenzMovie" <${from}>`,
    to,
    subject: 'Mã xác nhận đăng ký GenzMovie',
    text: `Mã xác nhận của bạn là: ${code}\nMã có hiệu lực trong 10 phút.`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#fafafa;border-radius:8px">
        <h2 style="color:#111">Xác nhận đăng ký GenzMovie</h2>
        <p>Mã xác nhận của bạn là:</p>
        <p style="font-size:28px;letter-spacing:6px;font-weight:bold;color:#d97706">${code}</p>
        <p style="color:#555">Mã có hiệu lực trong 10 phút. Vui lòng không chia sẻ mã này với người khác.</p>
      </div>
    `,
  });
}
