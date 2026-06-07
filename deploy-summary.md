# Deploy Đồ Án Lên Google Cloud — Tóm Tắt Toàn Bộ

**Stack:** Node.js + React + PostgreSQL  
**Server:** Google Cloud Compute Engine (e2-small, asia-southeast1-b)  
**IP VM:** `34.21.241.215`  
**Ngày deploy:** 07/06/2026

---

## BƯỚC 1 — Tạo VM trên Google Cloud

- Vào [console.cloud.google.com](https://console.cloud.google.com) → Compute Engine → VM instances → Create instance
- Cấu hình:
  ```
  Name:      do-an-server
  Region:    asia-southeast1 (Singapore)
  Zone:      asia-southeast1-b
  Machine:   e2-small (2 vCPU, 2GB RAM)
  OS:        Ubuntu 24.04 LTS Minimal x86/64
  Disk:      20GB
  Model:     Standard
  Firewall:  ✅ Allow HTTP  ✅ Allow HTTPS
  ```
- Nhấn **Create** → đợi ~1 phút → có External IP: `34.21.241.215`

---

## BƯỚC 2 — SSH vào VM

- Vào VM instances → nhấn nút **SSH** → mở terminal trên browser

---

## BƯỚC 3 — Cài môi trường

```bash
# Update hệ thống
sudo apt update && sudo apt upgrade -y

# Cài các tool cần thiết
sudo apt install -y curl git nginx postgresql postgresql-contrib

# Cài Node.js 24 (đồng bộ với máy local)
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt install -y nodejs

# Cài PM2 (giữ Node chạy ngầm 24/7)
sudo npm install -g pm2
```

Kiểm tra:
```bash
node -v   # v24.16.0
npm -v    # 11.13.0
pm2 -v    # 7.0.1
```

---

## BƯỚC 4 — Fix PostgreSQL authentication

Ubuntu 24 dùng `scram-sha-256` và `peer` mặc định, cần đổi sang `md5`:

```bash
# Đổi local auth từ peer → md5 (để ALTER USER bằng password)
sudo sed -i 's/local   all             postgres                                peer/local   all             postgres                                md5/' /etc/postgresql/16/main/pg_hba.conf

# Đổi TCP auth từ scram-sha-256 → md5
sudo sed -i 's/host    all             all             127.0.0.1\/32            scram-sha-256/host    all             all             127.0.0.1\/32            md5/' /etc/postgresql/16/main/pg_hba.conf

sudo systemctl restart postgresql
```

---

## BƯỚC 5 — Setup PostgreSQL

```bash
# Set password cho user postgres
sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD '123456';"

# Tạo database
sudo -u postgres psql -c "CREATE DATABASE dormitory_system;"
```

> **Lưu ý:** Script `setup-database.js` không dùng dotenv nên hardcode password `123456`. Các script fake data dùng dotenv đọc từ `.env`. Vì vậy đồng nhất password về `123456`.

---

## BƯỚC 6 — Clone code từ GitHub

```bash
mkdir ~/do-an
cd ~/do-an
git clone https://github.com/s0nbuildtech287/dormitory_backend.git
cd dormitory_backend

# Checkout sang nhánh deploy
git stash
git checkout deploy

# Cài dependencies
npm install
```

---

## BƯỚC 7 — Tạo file .env

```bash
cat > .env << 'EOF'
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
VNPAY_RETURN_URL=http://34.21.241.215:1234/api/vnpay/return
FRONTEND_URL=http://34.21.241.215

OPENAI_API_KEY=sk-proj-...
OPENAI_MAX_TOKENS=2000
OPENAI_TEMPERATURE=0.7
CHAT_RATE_LIMIT=15

GOOGLE_APPLICATION_CREDENTIALS=src/config/accounts/account-vision.json
VISION_VALIDATION_ENABLED=true
EOF
```

---

## BƯỚC 8 — Fake data

```bash
cd scripts
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

Tài khoản mặc định sau khi fake:
```
Admin:   admin / 123
SV đặc: xu4ns0n@gmail.com / 123  (phòng room-200)
```

---

## BƯỚC 9 — Upload file Google Service Accounts

Các file `.json` service account bị gitignore, cần upload thủ công:

- SSH browser → ⚙️ → **Upload file** → upload từng file `.json`
- Sau đó move vào đúng thư mục:

```bash
mkdir -p ~/do-an/dormitory_backend/src/config/accounts
mv ~/*.json ~/do-an/dormitory_backend/src/config/accounts/
```

---

## BƯỚC 10 — Build Frontend + Copy dist vào Backend

Trên máy Windows, sửa `.env` của frontend:
```dotenv
# VITE_BACKEND_URL=http://localhost:1234
VITE_BACKEND_URL=http://34.21.241.215
```

Build và copy dist:
```bash
cd dormitory_frontend
npm run build

# Copy dist vào backend
xcopy /E /Y dist "..\dormitory_backend\dist\"

# Push lên GitHub
cd ..\dormitory_backend
git add dist/
git commit -m "update dist with production url"
git push
```

Trên VM pull về:
```bash
cd ~/do-an/dormitory_backend
git pull
```

---

## BƯỚC 11 — Chạy Backend với PM2

```bash
cd ~/do-an/dormitory_backend
pm2 start src/server.js --name "dormitory-tlu"
pm2 save

# Tự khởi động lại khi VM reboot
pm2 startup
# Copy lệnh nó in ra rồi chạy tiếp, ví dụ:
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u xu4ns0n --hp /home/xu4ns0n
```

Test backend:
```bash
curl http://localhost:1234
# → {"message":"Welcome to the Dormitory System Backend!"}
```

---

## BƯỚC 12 — Cấu hình Nginx

```bash
sudo bash -c 'cat > /etc/nginx/sites-available/dormitory << EOF
server {
    listen 80;
    server_name 34.21.241.215;

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

# Bật site
sudo ln -s /etc/nginx/sites-available/dormitory /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## BƯỚC 13 — Mở port PostgreSQL để kết nối pgAdmin local

**GCP Console → VPC Network → Firewall → Create Firewall Rule:**
```
Name:     allow-postgres
Targets:  All instances
Source:   0.0.0.0/0
Protocol: TCP
Port:     5432
```

**Cho PostgreSQL lắng nghe từ ngoài:**
```bash
sudo sed -i "s/#listen_addresses = 'localhost'/listen_addresses = '*'/" /etc/postgresql/16/main/postgresql.conf
echo "host    all             all             0.0.0.0/0               md5" | sudo tee -a /etc/postgresql/16/main/pg_hba.conf
sudo systemctl restart postgresql
```

**Kết nối pgAdmin:**
```
Host:     34.21.241.215
Port:     5432
Database: dormitory_system
Username: postgres
Password: 123456
```

---

## Kết quả cuối cùng

```
✅ App chạy tại:     http://34.21.241.215
✅ Backend API:      http://34.21.241.215/api
✅ PostgreSQL:       34.21.241.215:5432
✅ PM2 tự restart   khi VM reboot
✅ Nginx reverse proxy + Socket.IO support
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
git pull && pm2 restart dormitory-tlu

# Xem trạng thái Nginx
sudo systemctl status nginx

# Restart Nginx
sudo systemctl restart nginx
```
