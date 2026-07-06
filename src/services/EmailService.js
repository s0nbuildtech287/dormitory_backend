const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
    },
});

const LOGO_URL = `${process.env.FRONTEND_URL || `http://localhost:${process.env.PORT || 1234}`}/uploads/logo/logo.png`;

class EmailService {
    async sendOtp(toEmail, otpCode) {
        await transporter.sendMail({
            from: `"KTX Trường Đại học Thủy lợi" <${process.env.MAIL_USER}>`,
            to: toEmail,
            subject: '[KTX Thủy Lợi] Mã xác thực OTP đăng nhập',
            html: `
<!DOCTYPE html>
<html lang="vi">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 0">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#1e3a8a 0%,#1e40af 100%);padding:32px 40px;text-align:center">
            <img src="${LOGO_URL}" alt="Logo TLU" height="64" style="display:block;margin:0 auto 16px;border-radius:8px" onerror="this.style.display='none'" />
            <div style="color:#ffffff;font-size:20px;font-weight:700;letter-spacing:0.5px">Ký Túc Xá</div>
            <div style="color:#93c5fd;font-size:13px;margin-top:4px">Trường Đại học Thủy lợi</div>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 40px">
            <p style="margin:0 0 8px;color:#1e293b;font-size:16px;font-weight:600">Xin chào,</p>
            <p style="margin:0 0 24px;color:#475569;font-size:14px;line-height:1.6">
              Chúng tôi nhận được yêu cầu đăng nhập vào hệ thống quản lý KTX từ tài khoản của bạn.<br>
              Vui lòng sử dụng mã OTP dưới đây để hoàn tất xác thực:
            </p>

            <!-- OTP Box -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr><td align="center" style="padding:8px 0 28px">
                <div style="display:inline-block;background:#eff6ff;border:2px dashed #3b82f6;border-radius:12px;padding:20px 48px">
                  <div style="color:#94a3b8;font-size:11px;font-weight:600;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px">Mã xác thực OTP</div>
                  <div style="color:#1e40af;font-size:38px;font-weight:800;letter-spacing:12px;font-family:'Courier New',monospace">${otpCode}</div>
                </div>
              </td></tr>
            </table>

            <table width="100%" cellpadding="0" cellspacing="0" style="background:#fef9c3;border-radius:8px;margin-bottom:24px">
              <tr><td style="padding:12px 16px;color:#854d0e;font-size:13px">
                ⏱ Mã có hiệu lực trong <strong>5 phút</strong>. Vui lòng không chia sẻ mã này cho bất kỳ ai.
              </td></tr>
            </table>

            <p style="margin:0;color:#94a3b8;font-size:13px;line-height:1.6">
              Nếu bạn không thực hiện yêu cầu này, hãy bỏ qua email này hoặc liên hệ ban quản lý KTX ngay lập tức.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 40px;text-align:center">
            <p style="margin:0;color:#94a3b8;font-size:12px">
              © ${new Date().getFullYear()} Ký Túc Xá – Trường Đại học Thủy lợi<br>
              175 Tây Sơn, Đống Đa, Hà Nội
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
            `,
        });
    }
}

module.exports = new EmailService();
