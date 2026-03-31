const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

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
        from: `"KTX TLU" <${process.env.MAIL_USER}>`,
        to: recipients,
        subject,
        html: body.replace(/\n/g, "<br>"),
      });

      res.json({ success: true, message: "Gửi email thành công" });
    } catch (err) {
      console.error("[EmailController.send]", err.message);
      res.status(500).json({ success: false, message: err.message || "Gửi email thất bại" });
    }
  },
};

module.exports = EmailController;
