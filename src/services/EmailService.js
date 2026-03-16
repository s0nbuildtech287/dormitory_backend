const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
    },
});

class EmailService {
    async sendOtp(toEmail, otpCode) {
        await transporter.sendMail({
            from: `"Dormitory Unis" <${process.env.MAIL_USER}>`,
            to: toEmail,
            subject: 'Mã xác thực OTP đăng nhập',
            html: `
                <div style="font-family:sans-serif;max-width:400px;margin:auto;padding:32px;border:1px solid #e2e8f0;border-radius:16px">
                    <h2 style="color:#1e293b;margin-bottom:8px">Xác thực đăng nhập</h2>
                    <p style="color:#64748b;margin-bottom:24px">Mã OTP của bạn là:</p>
                    <div style="background:#f1f5f9;border-radius:12px;padding:20px;text-align:center;letter-spacing:0.5em;font-size:32px;font-weight:bold;color:#1e40af">
                        ${otpCode}
                    </div>
                    <p style="color:#94a3b8;font-size:13px;margin-top:20px">Mã có hiệu lực trong <b>5 phút</b>. Không chia sẻ mã này cho bất kỳ ai.</p>
                </div>
            `,
        });
    }
}

module.exports = new EmailService();
