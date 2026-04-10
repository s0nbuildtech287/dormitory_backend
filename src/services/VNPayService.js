const crypto = require("crypto");
const qs = require("querystring");

class VNPayService {
  constructor() {
    this.tmnCode    = process.env.VNPAY_TMN_CODE;
    this.hashSecret = process.env.VNPAY_HASH_SECRET;
    this.vnpUrl     = process.env.VNPAY_URL;
    this.returnUrl  = process.env.VNPAY_RETURN_URL;
  }

  /**
   * Sắp xếp object theo key tăng dần (yêu cầu của VNPay)
   */
  sortObject(obj) {
    return Object.keys(obj)
      .sort()
      .reduce((sorted, key) => {
        sorted[key] = obj[key];
        return sorted;
      }, {});
  }

  /**
   * Tạo chữ ký HMAC-SHA512
   */
  createSignature(params) {
    const signData = qs.stringify(params, { encode: false });
    return crypto.createHmac("sha512", this.hashSecret)
      .update(Buffer.from(signData, "utf-8"))
      .digest("hex");
  }

  /**
   * Tạo URL thanh toán VNPay
   * @param {object} options
   * @param {number}  options.amount      - Số tiền (VND, chưa nhân 100)
   * @param {string}  options.txnRef      - Mã tham chiếu giao dịch (invoice_id / contract_id)
   * @param {string}  options.orderInfo   - Mô tả đơn hàng
   * @param {string}  options.orderType   - Loại đơn hàng (other / billpayment)
   * @param {string}  options.ipAddr      - IP khách hàng
   * @param {string}  [options.bankCode]  - Mã ngân hàng (tuỳ chọn)
   * @param {string}  [options.locale]    - Ngôn ngữ (vn / en)
   */
  createPaymentUrl(options) {
    const {
      amount,
      txnRef,
      orderInfo,
      orderType = "other",
      ipAddr,
      bankCode,
      locale = "vn",
    } = options;

    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const createDate =
      `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
      `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;

    let params = {
      vnp_Version:   "2.1.0",
      vnp_Command:   "pay",
      vnp_TmnCode:   this.tmnCode,
      vnp_Locale:    locale,
      vnp_CurrCode:  "VND",
      vnp_TxnRef:    txnRef,
      vnp_OrderInfo: orderInfo,
      vnp_OrderType: orderType,
      vnp_Amount:    amount * 100,   // VNPay yêu cầu nhân 100
      vnp_ReturnUrl: this.returnUrl,
      vnp_IpAddr:    ipAddr,
      vnp_CreateDate: createDate,
    };

    if (bankCode) params.vnp_BankCode = bankCode;

    params = this.sortObject(params);
    params.vnp_SecureHash = this.createSignature(params);

    return `${this.vnpUrl}?${qs.stringify(params, { encode: false })}`;
  }

  /**
   * Xác minh chữ ký từ VNPay (dùng cho cả IPN và ReturnURL)
   * @param {object} vnpParams - Query params từ VNPay (req.query)
   * @returns {{ valid: boolean, params: object }}
   */
  verifySignature(vnpParams) {
    const params = { ...vnpParams };
    const receivedHash = params["vnp_SecureHash"];

    delete params["vnp_SecureHash"];
    delete params["vnp_SecureHashType"];

    const sorted = this.sortObject(params);
    const expectedHash = this.createSignature(sorted);

    return {
      valid: receivedHash === expectedHash,
      params: sorted,
    };
  }
}

module.exports = new VNPayService();
