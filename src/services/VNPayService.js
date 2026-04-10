const crypto = require("crypto");

class VNPayService {
  constructor() {
    this.tmnCode    = process.env.VNPAY_TMN_CODE;
    this.hashSecret = process.env.VNPAY_HASH_SECRET;
    this.vnpUrl     = process.env.VNPAY_URL;
    this.returnUrl  = process.env.VNPAY_RETURN_URL;
  }

  /** Sắp xếp object theo key tăng dần (yêu cầu của VNPay) */
  sortObject(obj) {
    return Object.keys(obj)
      .sort()
      .reduce((sorted, key) => {
        sorted[key] = obj[key];
        return sorted;
      }, {});
  }

  /**
   * Encode params theo chuẩn VNPay: encodeURIComponent + space thành +
   * VNPay ký và verify trên chuỗi này
   */
  encodeParams(params) {
    return Object.entries(params).reduce((o, [k, v]) => {
      o[k] = encodeURIComponent(v).replace(/%20/g, "+");
      return o;
    }, {});
  }

  /** Loại bỏ dấu tiếng Việt — VNPay chỉ nhận ASCII cho vnp_OrderInfo */
  sanitizeOrderInfo(str) {
    return (str || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d").replace(/Đ/g, "D")
      .replace(/[^a-zA-Z0-9 _\-.]/g, "")
      .trim()
      .substring(0, 255);
  }

  /** Tạo HMAC-SHA512 từ encoded signData */
  sign(encodedParams) {
    const signData = Object.entries(encodedParams)
      .map(([k, v]) => `${k}=${v}`)
      .join("&");
    return crypto
      .createHmac("sha512", this.hashSecret)
      .update(Buffer.from(signData, "utf-8"))
      .digest("hex");
  }

  /**
   * Tạo URL thanh toán VNPay
   */
  createPaymentUrl({ amount, txnRef, orderInfo, orderType = "other", ipAddr, bankCode, locale = "vn" }) {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const createDate =
      `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
      `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;

    let params = {
      vnp_Version:    "2.1.0",
      vnp_Command:    "pay",
      vnp_TmnCode:    this.tmnCode,
      vnp_Locale:     locale,
      vnp_CurrCode:   "VND",
      vnp_TxnRef:     String(txnRef),
      vnp_OrderInfo:  this.sanitizeOrderInfo(orderInfo),
      vnp_OrderType:  orderType,
      vnp_Amount:     String(Math.round(amount * 100)),
      vnp_ReturnUrl:  this.returnUrl,
      vnp_IpAddr:     ipAddr,
      vnp_CreateDate: createDate,
    };

    if (bankCode) params.vnp_BankCode = bankCode;

    params = this.sortObject(params);
    const encoded = this.encodeParams(params);
    const secureHash = this.sign(encoded);

    // URL = encoded query string + hash (không encode hash)
    const queryString = Object.entries(encoded)
      .map(([k, v]) => `${k}=${v}`)
      .join("&");

    return `${this.vnpUrl}?${queryString}&vnp_SecureHash=${secureHash}`;
  }

  /**
   * Verify chữ ký từ VNPay callback (IPN / ReturnURL)
   * req.query đã được Express decode — cần encode lại để verify đúng
   */
  verifySignature(vnpParams) {
    const params = { ...vnpParams };
    const receivedHash = params["vnp_SecureHash"];

    delete params["vnp_SecureHash"];
    delete params["vnp_SecureHashType"];

    const sorted = this.sortObject(params);
    const encoded = this.encodeParams(sorted);
    const expectedHash = this.sign(encoded);

    return {
      valid: receivedHash === expectedHash,
      params: sorted,
    };
  }
}

module.exports = new VNPayService();
