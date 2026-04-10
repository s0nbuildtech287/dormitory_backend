const VNPayService       = require("../services/VNPayService");
const InvoiceDAO         = require("../dao/InvoiceDAO");
const StudentContractDAO = require("../dao/StudentContractDAO");

class VNPayController {

  /** Parse txnRef "invoice_<uuid>_<ts>" hoặc "deposit_<uuid>_<ts>" */
  _parseTxnRef(txnRef) {
    const first = txnRef.indexOf("_");
    const last  = txnRef.lastIndexOf("_");
    return {
      type: txnRef.substring(0, first),
      id:   txnRef.substring(first + 1, last),
    };
  }

  /**
   * Cập nhật DB sau khi thanh toán thành công.
   * Idempotent — gọi nhiều lần không sao.
   */
  async _updatePayment(txnRef, transactionNo) {
    const { type, id } = this._parseTxnRef(txnRef);

    if (type === "invoice") {
      const invoice = await InvoiceDAO.findById(id);
      if (!invoice) return { rsp: "01", msg: "Order not found" };
      if (invoice.status === "Đã thanh toán") return { rsp: "02", msg: "Order already confirmed" };
      await InvoiceDAO.markAsPaid(id, "VNPay");
      if (transactionNo) await InvoiceDAO.update(id, { payment_reference: transactionNo });

    } else if (type === "deposit") {
      const contract = await StudentContractDAO.findById(id);
      if (!contract) return { rsp: "01", msg: "Order not found" };
      if (contract.deposit_paid) return { rsp: "02", msg: "Order already confirmed" };
      await StudentContractDAO.update(id, { deposit_paid: true });
    }

    console.log(`[VNPay] ✅ Updated DB: ${txnRef}`);
    return { rsp: "00", msg: "Success" };
  }

  /** POST /api/vnpay/create-payment */
  async createPayment(req, res, next) {
    try {
      const { type, id, amount, orderInfo } = req.body;
      if (!type || !id || !amount)
        return res.status(400).json({ success: false, message: "Thiếu thông tin thanh toán" });

      const ipAddr =
        req.headers["x-forwarded-for"]?.split(",")[0].trim() ||
        req.socket?.remoteAddress ||
        "127.0.0.1";

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

  /** GET /api/vnpay/ipn — VNPay gọi server-to-server */
  async ipn(req, res) {
    try {
      const { valid, params } = VNPayService.verifySignature(req.query);
      if (!valid) return res.status(200).json({ RspCode: "97", Message: "Fail checksum" });

      if (params["vnp_ResponseCode"] === "00") {
        const { rsp, msg } = await this._updatePayment(
          params["vnp_TxnRef"],
          params["vnp_TransactionNo"]
        );
        return res.status(200).json({ RspCode: rsp, Message: msg });
      }

      return res.status(200).json({ RspCode: "00", Message: "Confirm Success" });
    } catch (error) {
      console.error("[VNPay IPN] Error:", error.message);
      return res.status(200).json({ RspCode: "99", Message: "Unknown error" });
    }
  }

  /** GET /api/vnpay/return — browser redirect về sau thanh toán */
  async returnUrl(req, res) {
    try {
      const { valid, params } = VNPayService.verifySignature(req.query);
      const code = valid ? (params["vnp_ResponseCode"] || "99") : "97";

      if (valid && code === "00") {
        await this._updatePayment(
          params["vnp_TxnRef"],
          params["vnp_TransactionNo"]
        ).catch(err => console.error("[VNPay Return] DB update error:", err.message));
      }

      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:2807";
      const query = new URLSearchParams({
        code,
        txnRef:        params["vnp_TxnRef"]       || "",
        amount:        params["vnp_Amount"]        || "",
        bankCode:      params["vnp_BankCode"]      || "",
        transactionNo: params["vnp_TransactionNo"] || "",
        orderInfo:     params["vnp_OrderInfo"]     || "",
        payDate:       params["vnp_PayDate"]       || "",
      });

      res.redirect(`${frontendUrl}/payment/result?${query.toString()}`);
    } catch (error) {
      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:2807";
      res.redirect(`${frontendUrl}/payment/result?code=99`);
    }
  }
}

const controller = new VNPayController();

// Bind tất cả methods để giữ đúng `this` context khi Express gọi
module.exports = {
  createPayment: controller.createPayment.bind(controller),
  ipn:           controller.ipn.bind(controller),
  returnUrl:     controller.returnUrl.bind(controller),
};
