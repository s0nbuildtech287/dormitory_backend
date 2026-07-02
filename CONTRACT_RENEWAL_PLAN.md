# Kế hoạch: Nhắc gia hạn hợp đồng & Thanh toán gia hạn qua VNPay

## Tổng quan luồng

```
[Scheduler hàng ngày]
    └── Tìm hợp đồng Active còn ≤ 35 ngày
            └── Gửi email nhắc sinh viên
                    └── Sinh viên vào portal → Ấn "Gia hạn hợp đồng"
                            └── Redirect VNPay → Thanh toán
                                    └── VNPay IPN callback
                                            └── Cộng 6 tháng vào end_date
```

---

## Phần 1 — Email tự động nhắc hạn

### Những gì đã có
- `ContractService.sendRenewalReminders(contractIds)` — soạn và gửi email, phân biệt năm 4 (thông báo kết thúc) vs các năm khác (thông báo gia hạn)
- `ContractService.getExpiringContracts(days)` — lấy hợp đồng sắp hết hạn theo số ngày
- `scheduler.js` — cron chạy mỗi ngày 00:01
- Route `GET /contracts/expiring` + `POST /contracts/send-renewal-emails` — admin có thể gửi thủ công

### Việc cần làm

#### Backend — `scheduler.js`
Thêm function `sendExpiryReminders()` vào cron hàng ngày:

```js
async function sendExpiryReminders() {
    try {
        const ContractService = require('../services/ContractService');

        // Lấy hợp đồng Active còn ≤ 35 ngày, chưa gửi email trong 7 ngày gần nhất
        const expiring = await ContractService.getExpiringContracts(35);
        const toNotify = expiring.filter(c => {
            if (!c.renewal_reminded_at) return true;
            const lastSent = new Date(c.renewal_reminded_at);
            const daysSinceLast = (Date.now() - lastSent) / (1000 * 60 * 60 * 24);
            return daysSinceLast >= 7; // Gửi tối đa 1 lần/tuần
        });

        if (toNotify.length === 0) return;

        const ids = toNotify.map(c => c.id);
        const result = await ContractService.sendRenewalReminders(ids, 'system', null);

        // Cập nhật renewal_reminded_at
        if (result.sent > 0) {
            await db.query(
                `UPDATE student_contracts SET renewal_reminded_at = NOW()
                 WHERE id = ANY($1::text[])`,
                [result.details.sent]
            );
        }

        console.log(`[Scheduler] ✅ Gửi email nhắc gia hạn: ${result.sent} thành công, ${result.failed} thất bại`);
    } catch (err) {
        console.error('[Scheduler] ❌ Lỗi gửi email nhắc gia hạn:', err.message);
    }
}
```

#### Database — Migration
Thêm 1 cột vào `student_contracts`:
```sql
ALTER TABLE student_contracts ADD COLUMN renewal_reminded_at TIMESTAMPTZ DEFAULT NULL;
```

#### Frontend Admin — `billing_management` hoặc `contract_management`
Thêm tab **"Sắp hết hạn"** hiển thị danh sách hợp đồng còn ≤ 35 ngày với:
- Badge màu vàng/đỏ theo số ngày còn lại (≤ 7 ngày: đỏ, 8–35 ngày: vàng)
- Nút "Gửi email nhắc" cho từng hợp đồng
- Nút "Gửi tất cả" để gửi loạt

---

## Phần 2 — Gia hạn hợp đồng qua VNPay

### Những gì đã có
- VNPay flow hoàn chỉnh cho `invoice` và `deposit`
- `VNPayService.createPaymentUrl()` — tạo URL thanh toán
- `VNPayController.ipn()` — xử lý callback từ VNPay
- Trang `/payment/result` — hiển thị kết quả thanh toán

### Việc cần làm

#### Backend

**1. Migration thêm cột theo dõi gia hạn:**
```sql
ALTER TABLE student_contracts 
ADD COLUMN renewal_requested_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN renewal_count INTEGER DEFAULT 0;
```

**2. `VNPayController` — thêm xử lý type `renew`:**

Trong `_parseTxnRef`:
```js
// txnRef format: "renew_<contractId>_<timestamp>"
```

Trong `_handleSuccess`:
```js
} else if (type === "renew") {
    const contract = await StudentContractDAO.findById(id);
    if (!contract) return { rsp: "01", msg: "Contract not found" };
    if (contract.renewal_requested_at) {
        // Kiểm tra đã xử lý chưa (idempotent)
        const alreadyRenewed = new Date(contract.renewal_requested_at) > new Date(contract.end_date - 35*24*60*60*1000);
        if (alreadyRenewed) return { rsp: "02", msg: "Already renewed" };
    }
    // Cộng 6 tháng
    const newEndDate = new Date(contract.end_date);
    newEndDate.setMonth(newEndDate.getMonth() + 6);
    await StudentContractDAO.update(id, {
        end_date: newEndDate.toISOString().split('T')[0],
        status: 'Active',
        renewal_requested_at: new Date(),
        renewal_count: (contract.renewal_count || 0) + 1,
        updated_at: new Date()
    });
}
```

Trong `createPayment` — thêm case `renew`:
```js
// type = "renew", id = contractId
// amount = tiền thuê 1 tháng * 6 (hoặc cố định theo config)
```

**3. Route mới trong `contractRoutes.js`:**
```js
// Sinh viên tự gia hạn hợp đồng của mình
router.post("/:id/request-renewal", ContractController.requestRenewal);
```

**4. `ContractController.requestRenewal`:**
- Kiểm tra hợp đồng thuộc về user đang đăng nhập
- Kiểm tra còn ≤ 35 ngày hoặc đã Expired
- Sinh viên năm 4 không được gia hạn
- Tạo VNPay URL với `txnRef = "renew_<contractId>_<ts>"`, amount = `rent_price * 6`
- Trả về `{ paymentUrl }`

#### Frontend — Portal sinh viên (`/contract`)

**Thêm vào trang hợp đồng sinh viên:**

1. **Banner cảnh báo** khi còn ≤ 35 ngày:
```jsx
{daysLeft <= 35 && contract.snapshot_year !== 4 && (
    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
        <p className="font-bold text-amber-800">
            Hợp đồng còn {daysLeft} ngày nữa là hết hạn
        </p>
        <p className="text-sm text-amber-600 mt-1">
            Gia hạn ngay để tiếp tục ở lại ký túc xá.
        </p>
        <button onClick={handleRenew} className="mt-3 px-5 py-2 bg-amber-600 text-white rounded-xl text-sm font-bold">
            Gia hạn hợp đồng (6 tháng)
        </button>
    </div>
)}
```

2. **Banner thông báo năm 4** — không cho gia hạn:
```jsx
{daysLeft <= 35 && contract.snapshot_year === 4 && (
    <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4">
        <p className="font-bold text-rose-800">Hợp đồng sắp hết hạn và sẽ không được gia hạn</p>
        <p className="text-sm text-rose-600 mt-1">
            Bạn đang học năm cuối. Vui lòng hoàn tất thủ tục trả phòng trước ngày {fmtDate(contract.end_date)}.
        </p>
    </div>
)}
```

3. **Handler gia hạn:**
```js
const handleRenew = async () => {
    const res = await requestRenewal(contract.id); // gọi POST /contracts/:id/request-renewal
    if (res.success) window.location.href = res.data.paymentUrl;
};
```

4. **Trang `/payment/result`** — thêm case hiển thị "Gia hạn thành công" khi VNPay return với type `renew`.

---

## Phần 3 — Thứ tự thực hiện

| Bước | Việc làm | Ưu tiên |
|---|---|---|
| 1 | Migration SQL thêm `renewal_reminded_at`, `renewal_requested_at`, `renewal_count` | Cao |
| 2 | Thêm `sendExpiryReminders()` vào scheduler | Cao |
| 3 | Thêm `requestRenewal` vào Controller + Route | Cao |
| 4 | Xử lý type `renew` trong VNPay IPN | Cao |
| 5 | UI portal sinh viên — banner + nút gia hạn | Cao |
| 6 | UI admin — tab "Sắp hết hạn" + nút gửi email thủ công | Trung bình |
| 7 | Kiểm tra idempotent (tránh gia hạn 2 lần nếu IPN gọi 2 lần) | Cao |
| 8 | Test end-to-end với tài khoản VNPay sandbox | Trung bình |

---

## Quy tắc nghiệp vụ

| Điều kiện | Hành vi |
|---|---|
| Còn ≤ 35 ngày, năm 1-3 | Cho phép gia hạn, hiện nút |
| Còn ≤ 35 ngày, năm 4 | Không cho gia hạn, hiện banner cảnh báo trả phòng |
| Đã Expired (hết hạn) | Cho phép gia hạn nếu còn trong vòng 7 ngày sau hết hạn |
| Email nhắc | Gửi tối đa 1 lần/tuần, không gửi trùng trong 7 ngày |
| IPN VNPay | Idempotent — nếu đã gia hạn thì trả `rsp: "02"` |
| Số tháng gia hạn | Cố định 6 tháng |
| Số tiền gia hạn | `rent_price * 6` (tiền thuê 6 tháng) |
