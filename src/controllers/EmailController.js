const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

const buildHtml = (subject, body) => {
  const bodyHtml = body.replace(/\n/g, "<br>");
  const year = new Date().getFullYear();

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 0;">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#1e3a8a 0%,#1e40af 100%);padding:28px 40px;text-align:center;">
            <div style="color:#ffffff;font-size:20px;font-weight:700;letter-spacing:0.5px;">Ký Túc Xá</div>
            <div style="color:#93c5fd;font-size:13px;margin-top:4px;">Trường Đại học Thủy lợi</div>
          </td>
        </tr>

        <!-- Subject banner -->
        <tr>
          <td style="background:#eff6ff;border-bottom:2px solid #bfdbfe;padding:14px 40px;">
            <p style="margin:0;color:#1e40af;font-size:15px;font-weight:700;">${subject}</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px 40px;">
            <p style="margin:0 0 20px;color:#1e293b;font-size:14px;line-height:1.8;">
              Kính gửi Sinh viên,
            </p>
            <p style="margin:0 0 24px;color:#334155;font-size:14px;line-height:1.8;">
              ${bodyHtml}
            </p>
            <p style="margin:24px 0 0;color:#475569;font-size:13px;line-height:1.7;">
              Nếu có thắc mắc, vui lòng liên hệ Ban Quản lý Ký túc xá qua email
              <a href="mailto:${process.env.MAIL_USER}" style="color:#2563eb;text-decoration:none;">${process.env.MAIL_USER}</a>
              hoặc đến trực tiếp văn phòng KTX trong giờ hành chính.
            </p>
          </td>
        </tr>

        <!-- Divider -->
        <tr>
          <td style="padding:0 40px;">
            <div style="border-top:1px solid #e2e8f0;"></div>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:20px 40px;text-align:center;">
            <p style="margin:0 0 4px;color:#64748b;font-size:12px;font-weight:600;">
              BAN QUẢN LÝ KÝ TÚC XÁ – TRƯỜNG ĐẠI HỌC THỦY LỢI
            </p>
            <p style="margin:0;color:#94a3b8;font-size:11px;">
              175 Tây Sơn, Đống Đa, Hà Nội &nbsp;|&nbsp; ĐT: (024) 3563 3351
            </p>
            <p style="margin:8px 0 0;color:#cbd5e1;font-size:11px;">
              © ${year} Trường Đại học Thủy lợi. Email này được gửi tự động, vui lòng không trả lời.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
};

const EmailController = {
  /**
   * POST /api/email/send
   * Body: { to: string | string[], subject: string, body: string }
   */
  send: async (req, res) => {
    try {
      const { to, subject, body } = req.body;

      if (!to || !subject || !body) {
        return res.status(400).json({ success: false, message: "Thiếu thông tin: to, subject, body" });
      }

      const recipients = Array.isArray(to) ? to.join(", ") : to;

      await transporter.sendMail({
        from: `"KTX – ĐH Thủy lợi" <${process.env.MAIL_USER}>`,
        to: recipients,
        subject,
        html: buildHtml(subject, body),
      });

      res.json({ success: true, message: "Gửi email thành công" });
    } catch (err) {
      console.error("[EmailController.send]", err.message);
      res.status(500).json({ success: false, message: err.message || "Gửi email thất bại" });
    }
  },
};

module.exports = EmailController;
