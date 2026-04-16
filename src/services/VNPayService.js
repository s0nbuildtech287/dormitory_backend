const crypto = require("crypto");

class VNPayService {
  constructor() {
    this.tmnCode    = process.env.VNPAY_TMN_CODE;
    this.hashSecret = process.env.VNPAY_HASH_SECRET;
    this.vnpUrl     = process.env.VNPAY_URL;
    this.returnUrl  = process.env.VNPAY_RETURN_URL;
  }

  sortObject(obj) {
    return Object.keys(obj)
      .sort()
      .reduce((sorted, key) => {
        sorted[key] = obj[key];
        return sorted;
      }, {});
  }

  sanitizeOrderInfo(str) {
    return (str || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\u0111/g, "d").replace(/\u0110/g, "D")
      .replace(/[^a-zA-Z0-9 _\-.]/g, "")
      .trim()
      .substring(0, 255);
  }

  // Ky HMAC-SHA512 theo chuan VNPay: encode value, space -> +
  sign(rawParams) {
    const signData = Object.entries(rawParams)
      .map(([k, v]) => `${k}=${encodeURIComponent(v).replace(/%20/g, "+")}`)
      .join("&");
    return crypto
      .createHmac("sha512", this.hashSecret)
      .update(Buffer.from(signData, "utf-8"))
      .digest("hex");
  }

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

    const signData = Object.entries(params).map(([k, v]) => `${k}=${v}`).join("&");
    console.log("[VNPay create] signData:", signData);
    console.log("[VNPay create] hashSecret:", this.hashSecret);

    const secureHash = this.sign(params);
    console.log("[VNPay create] secureHash:", secureHash);

    const queryString = Object.entries(params)
      .map(([k, v]) => `${k}=${encodeURIComponent(v).replace(/%20/g, "+")}`)
      .join("&");

    return `${this.vnpUrl}?${queryString}&vnp_SecureHash=${secureHash}`;
  }

  // Verify chu ky tu VNPay callback — req.query da duoc Express decode
  verifySignature(vnpParams) {
    const params = { ...vnpParams };
    const receivedHash = params["vnp_SecureHash"];

    delete params["vnp_SecureHash"];
    delete params["vnp_SecureHashType"];

    const sorted = this.sortObject(params);

    const signData = Object.entries(sorted).map(([k, v]) => `${k}=${v}`).join("&");
    console.log("[VNPay verify] signData:", signData);
    console.log("[VNPay verify] receivedHash:", receivedHash);

    const expectedHash = this.sign(sorted);
    console.log("[VNPay verify] expectedHash:", expectedHash);
    console.log("[VNPay verify] match:", receivedHash === expectedHash);

    return {
      valid: receivedHash === expectedHash,
      params: sorted,
    };
  }
}

module.exports = new VNPayService();
