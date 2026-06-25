// Lưu trữ OTP tạm thời trong bộ nhớ RAM: { email: { code, expiresAt } }
const store = new Map();

const OTP_TTL_MS = 5 * 60 * 1000; // 5 phút

function generate() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

function set(email) {
    const code = generate();
    store.set(email, { code, expiresAt: Date.now() + OTP_TTL_MS });
    return code;
}

function verify(email, inputCode) {
    const entry = store.get(email);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) { store.delete(email); return false; }
    if (entry.code !== inputCode) return false;
    store.delete(email); // dùng 1 lần
    return true;
}

module.exports = { set, verify };
