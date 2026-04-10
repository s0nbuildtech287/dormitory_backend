const VNPayService  = require("../services/VNPayService");
const InvoiceDAO    = require("../dao/InvoiceDAO");
const StudentContractDAO = require("../dao/StudentContractDAO");
const LogSystemDAO  = require("../dao/LogSystemDAO");

class VNPayController {
  /**
   * POST /api/vnpay/create-payment
   * Tạo URL thanh toán VNPay cho hóa đơn hoặc tiền cọc hợp đồng
   * Body: { type: "invoice"|"deposit", id, amount, orderInfo }
   */
  async createPayment(req, res, next) {
    try {
      const { type, id, amount, orderInfo } = req.body;

      if (!type || !id || !amount) {
        return res.status(400).json({ success: false, message: "Thiếu thông tin thanh toán" });
      }

      const ipAddr =
        req.headers["x-forwarded-for"]?.split(",")[0].trim() ||
        req.socket?.remoteAddress ||
        "127.0.0.1";

      // txnRef = type_id để phân biệt khi IPN về
      const txnRef = `${type}_${id}_${Date.now()}`;

      const paymentUrl = VNPayService.createPaymentUrl({
        amount:    Number(amount),
        txnRef,
        orderInfo: orderInfo || `Thanh toan ${type} ${id}`,
        orderType: type === "invoice" ? "billpayment" : "other",
        ipAddr,
      });

      res.json({ success: true, data: { paymentUrl, txnRef } });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/vnpay/ipn
   * Server-to-server callback từ VNPay — cập nhật DB
   */
  async ipn(req, res) {
    try {
      const { valid, params } = VNPayService.verifySignature(req.query);

      if (!valid) {
        return res.status(200).json({ RspCode: "97", Message: "Fail checksum" });
      }

      const responseCode = params["vnp_ResponseCode"];
      const txnRef       = params["vnp_TxnRef"]; // type_id_timestamp
      const transactionNo = params["vnp_TransactionNo"];

      // Parse txnRef: "invoice_abc123_1234567890" hoặc "deposit_xyz_..."
      const parts = txnRef.split("_");
      const type  = parts[0]; // "invoice" | "deposit"
      const id    = parts[1]; // invoice_id hoặc contract_id

      if (responseCode === "00") {
        if (type === "invoice") {
          const invoice = await InvoiceDAO.findById(id);
          if (!invoice) return res.status(200).json({ RspCode: "01", Message: "Order not found" });
          if (invoice.status === "Đã thanh toán") {
            return res.status(200).json({ RspCode: "02", Message: "Order already confirmed" });
          }
          await InvoiceDAO.markAsPaid(id, "VNPay");
          await InvoiceDAO.update(id, { payment_reference: transactionNo });

        } else if (type === "deposit") {
          const contract = await StudentContractDAO.findById(id);
          if (!contract) return res.status(200).json({ RspCode: "01", Message: "Order not found" });
          if (contract.deposit_paid) {
            return res.status(200).json({ RspCode: "02", Message: "Order already confirmed" });
          }
          await StudentContractDAO.update(id, {
            deposit_paid: true,
            updated_at: new Date(),
          });
        }

        console.log(`[VNPay IPN] ✅ Thanh toán thành công: ${txnRef}`);
        return res.status(200).json({ RspCode: "00", Message: "Confirm Success" });
      }

      // Giao dịch không thành công — không cập nhật DB
      console.log(`[VNPay IPN] ❌ Giao dịch thất bại (${responseCode}): ${txnRef}`);
      return res.status(200).json({ RspCode: "00", Message: "Confirm Success" });

    } catch (error) {
      console.error("[VNPay IPN] Error:", error.message);
      return res.status(200).json({ RspCode: "99", Message: "Unknown error" });
    }
  }

  /**
   * GET /api/vnpay/return
   * Browser redirect sau khi thanh toán — chỉ verify rồi redirect frontend
   */
  async returnUrl(req, res) {
    try {
      const { valid, params } = VNPayService.verifySignature(req.query);
      const code = valid ? (params["vnp_ResponseCode"] || "99") : "97";

      // Redirect về frontend với đầy đủ thông tin
      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:2807";
      const query = new URLSearchParams({
        code,
        txnRef:        params["vnp_TxnRef"]        || "",
        amount:        params["vnp_Amount"]         || "",
        bankCode:      params["vnp_BankCode"]       || "",
        transactionNo: params["vnp_TransactionNo"]  || "",
        orderInfo:     params["vnp_OrderInfo"]      || "",
        payDate:       params["vnp_PayDate"]        || "",
      });

      res.redirect(`${frontendUrl}/payment/result?${query.toString()}`);
    } catch (error) {
      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:2807";
      res.redirect(`${frontendUrl}/payment/result?code=99`);
    }
  }
}

module.exports = new VNPayController();
