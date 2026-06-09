# Deploy Đồ Án Lên Google Cloud — Tóm Tắt Toàn Bộ

**Stack:** Node.js + React + PostgreSQL  
**Server:** Google Cloud Compute Engine (e2-small, asia-southeast1-b)  
**IP VM:** `34.143.140.150` (Ephemeral — nên đặt Static sau)  
**Domain:** `https://kytucxatlu.site`  
**Ngày deploy:** 08/06/2026

---

## BƯỚC 1 — Tạo VM trên Google Cloud

Vào [console.cloud.google.com](https://console.cloud.google.com) → Compute Engine → VM instances → Create instance:

```
Name:      do-an-tlu-2026
Region:    asia-southeast1 (Singapore)
Zone:      asia-southeast1-b
Machine:   e2-small (2 vCPU, 2GB RAM)
OS:        Ubuntu 24.04 LTS Minimal x86/64
Disk:      20GB
Model:     Standard
Firewall:  ✅ Allow HTTP  ✅ Allow HTTPS
```

Nhấn **Create** → đợi ~1 phút → có External IP.

---

## BƯỚC 2 — SSH vào VM

Vào VM instances → nhấn nút **SSH** → mở terminal trên browser.

---

## BƯỚC 3 — Cài môi trường

```bash
# Vào root trước
sudo -i

apt update && apt upgrade -y
apt install -y curl git nginx postgresql postgresql-contrib

# Cài Node.js 24
curl -fsSL https://deb.nodesource.com/setup_24.x -o nodesource_setup.sh
bash nodesource_setup.sh
apt install -y nodejs

# Cài PM2
npm install -g pm2
```

Kiểm tra:

```bash
node -v   # v24.x.x
npm -v
pm2 -v
```

---

## BƯỚC 4 — Fix PostgreSQL authentication

> ⚠️ Ubuntu 24 cài PostgreSQL 18 (không phải 16). Kiểm tra version trước:

```bash
find /etc/postgresql -name "pg_hba.conf"
# → /etc/postgresql/18/main/pg_hba.conf
```

Đổi auth sang md5:

```bash
sed -i 's/local   all             postgres                                peer/local   all             postgres                                md5/' /etc/postgresql/18/main/pg_hba.conf

sed -i 's/host    all             all             127.0.0.1\/32            scram-sha-256/host    all             all             127.0.0.1\/32            md5/' /etc/postgresql/18/main/pg_hba.conf

systemctl restart postgresql
```

---

## BƯỚC 5 — Setup PostgreSQL

```bash
# Đổi lại peer để ALTER USER không hỏi password
sed -i 's/local   all             postgres                                md5/local   all             postgres                                peer/' /etc/postgresql/18/main/pg_hba.conf
systemctl restart postgresql

# Set password
sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD '123456';"

# Tạo database
sudo -u postgres psql -c "CREATE DATABASE dormitory_system;"
```

> **Lưu ý:** Script `setup-database.js` hardcode password `123456`. Các script fake data đọc từ `.env`. Đồng nhất password về `123456`.

---

## BƯỚC 6 — Clone code từ GitHub

```bash
mkdir ~/do-an && cd ~/do-an
git clone https://github.com/s0nbuildtech287/dormitory_backend.git
cd dormitory_backend

# Checkout sang nhánh deploy
git checkout deploy

# Cài dependencies
npm install
```

---

## BƯỚC 7 — Tạo file .env

```bash
cat > /root/do-an/dormitory_backend/.env << 'ENVEOF'
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=123456
DB_NAME=dormitory_system

JWT_SECRET=your_super_secret_jwt_key_change_this_in_production_12345
JWT_EXPIRE=7d

MAIL_USER=buixu4ns0n@gmail.com
MAIL_PASS=zhol ytje bcgv lwix

VNPAY_TMN_CODE=JPN6EDY8
VNPAY_HASH_SECRET=LHPQE98GFZU42QK1P7WXX8AHKNFIVZ7L
VNPAY_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNPAY_RETURN_URL=https://kytucxatlu.site/api/vnpay/return
FRONTEND_URL=https://kytucxatlu.site

OPENAI_API_KEY=sk-proj-...
OPENAI_MAX_TOKENS=2000
OPENAI_TEMPERATURE=0.7
CHAT_RATE_LIMIT=15

GOOGLE_APPLICATION_CREDENTIALS=src/config/accounts/account-vision.json
VISION_VALIDATION_ENABLED=true
ENVEOF
```

---

## BƯỚC 8 — Fake data

```bash
cd /root/do-an/dormitory_backend/scripts
node fake-all-data.js
```

Script chạy 10 bước tự động:

```
1. Setup Database Schema   → 16 bảng, enum, index, trigger
2. Fake Rooms              → 400 phòng (4 tòa A/B/C/D)
3. Fake Students           → 999 sinh viên + hợp đồng
4. Fake Invoices           → hóa đơn tháng hiện tại
5. Fake Invoices History   → 5 tháng lịch sử
6. Fake Assets             → tài sản phòng + kho
7. Fake Disciplinary       → phiếu kỷ luật
8. Fake Notifications      → 92 thông báo
9. Fake Activity Logs      → 20 log hoạt động
10. Fake Student Feedbacks → 10 phản ánh
```

Tài khoản mặc định:

```
Admin:   admin / 123
SV đặc: xu4ns0n@gmail.com / 123  (phòng room-200)
```

---

## BƯỚC 9 — Upload file Google Service Accounts

Các file `.json` service account bị gitignore, upload thủ công:

SSH browser → ⚙️ → **Upload file** → upload từng file `.json` → move vào đúng thư mục:

```bash
mkdir -p /root/do-an/dormitory_backend/src/config/accounts
mv /home/xu4ns0n/*.json /root/do-an/dormitory_backend/src/config/accounts/
```

---

## BƯỚC 10 — Build Frontend

Trên máy Windows, sửa `.env` frontend:

```dotenv
VITE_BACKEND_URL=https://kytucxatlu.site
```

Build và push:

```bash
cd dormitory_frontend
npm run build

xcopy /E /Y dist "..\dormitory_backend\dist\"
cd ..\dormitory_backend
git add dist/
git commit -m "build with production url"
git push
```

Trên VM:

```bash
cd /root/do-an/dormitory_backend
git pull
```

---

## BƯỚC 11 — Chạy Backend với PM2

```bash
cd /root/do-an/dormitory_backend
pm2 start src/server.js --name "dormitory-tlu"
pm2 save
pm2 startup
# Copy lệnh nó in ra rồi chạy tiếp
```

Test:

```bash
curl http://localhost:1234
# → trả về HTML của React app
```

---

## BƯỚC 12 — Cấu hình Nginx

```bash
bash -c 'cat > /etc/nginx/sites-available/dormitory << EOF
server {
    listen 80;
    server_name kytucxatlu.site www.kytucxatlu.site 34.143.140.150;
    client_max_body_size 20M;
    location / {
        proxy_pass http://127.0.0.1:1234;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }
}
EOF'

ln -s /etc/nginx/sites-available/dormitory /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx
```

---

## BƯỚC 13 — Mua Domain + Cấu hình DNS

- Mua domain `kytucxatlu.site` tại tenten.vn (~30k/năm)
- Thêm 2 record A tại Tenten (hoặc Cloudflare):

```
@ → 34.143.140.150
www → 34.143.140.150
```

---

## BƯỚC 14 — Cloudflare

1. Đăng ký [cloudflare.com](https://cloudflare.com) → Add domain `kytucxatlu.site` → plan Free
2. Cloudflare tự scan DNS records — cập nhật IP đúng `34.143.140.150`
3. Đổi Nameserver trên Tenten:

```
julissa.ns.cloudflare.com
yew.ns.cloudflare.com
```

4. Cloudflare SSL/TLS → chọn **Flexible**

> ⚠️ Dùng **Flexible** vì VM không có SSL certificate. Nếu dùng Full sẽ bị lỗi 521.

---

## BƯỚC 15 — Mở GCP Firewall

Vào **GCP Console → VPC Network → Firewall → Create Firewall Rule:**

```
Name:             allow-http-https
Network:          default
Direction:        Ingress
Action:           Allow
Targets:          All instances in the network
Source IP ranges: 0.0.0.0/0
Protocols/ports:  TCP: 80, 443
```

---

## BƯỚC 16 — Mở port PostgreSQL để kết nối pgAdmin

**GCP Firewall — tạo thêm rule:**

```
Name:     allow-postgres
Source:   0.0.0.0/0
Protocol: TCP  Port: 5432
```

**Trên VM:**

```bash
sed -i "s/#listen_addresses = 'localhost'/listen_addresses = '*'/" /etc/postgresql/18/main/postgresql.conf
echo "host    all             all             0.0.0.0/0               md5" | tee -a /etc/postgresql/18/main/pg_hba.conf
systemctl restart postgresql
```

**pgAdmin kết nối:**

```
Host:     34.143.140.150
Port:     5432
Database: dormitory_system
Username: postgres
Password: 123456
```

---

## Kết quả cuối cùng

```
✅ Domain:     https://kytucxatlu.site  (HTTPS qua Cloudflare Flexible)
✅ Fallback:   http://34.143.140.150    (HTTP, vào thẳng VM)
✅ PostgreSQL: 34.143.140.150:5432
✅ PM2:        tự restart khi VM reboot
✅ Cloudflare: CDN + DDoS protection + SSL mode Flexible
```

---

## Lệnh hay dùng khi quản lý

```bash
# Xem trạng thái app
pm2 list

# Xem log realtime
pm2 logs dormitory-tlu

# Xóa log cũ
pm2 flush

# Restart app
pm2 restart dormitory-tlu

# Khi pull code mới về
cd /root/do-an/dormitory_backend && git pull && pm2 restart dormitory-tlu

# Xem trạng thái Nginx
systemctl status nginx

# Restart Nginx
systemctl restart nginx
```

---

## Xử lý sự cố

| Lỗi | Nguyên nhân | Fix |
|-----|-------------|-----|
| 521 | Cloudflare không vào được VM | Kiểm tra GCP Firewall, Nginx có chạy không |
| 522 | VM đang tắt hoặc IP đổi | Kiểm tra VM status, cập nhật DNS |
| ERR_TOO_MANY_REDIRECTS | Cloudflare Full + không có SSL trên VM | Đổi Cloudflare SSL sang Flexible |
| Failed to fetch | Frontend gọi http:// nhưng trang load https:// | Build lại với VITE_BACKEND_URL=https:// |
| IP đổi sau restart | IP Ephemeral | Đặt Static IP trên GCP |
| pg_hba.conf not found | PostgreSQL version khác 16 | Dùng version 18: /etc/postgresql/18/main/ |