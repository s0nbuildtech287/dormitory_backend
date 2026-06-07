# Cấu hình Nginx — Dormitory System

## Nginx là gì?

Nginx đóng vai trò **reverse proxy** — đứng giữa internet và Node.js app, nhận request từ người dùng rồi chuyển vào backend.

```
Người dùng → https://kytucxatlu.site (port 443)
                    ↓
              Cloudflare (CDN + bảo vệ)
                    ↓
                  NGINX (port 443/80)
                    ↓
          Node.js (port 1234)
```

Không có Nginx, người dùng phải gõ `http://34.21.241.215:1234` — xấu và không chuyên nghiệp.

---

## File config 1: `/etc/nginx/sites-available/dormitory`

> Domain chính + HTTPS (Certbot tự tạo)

```nginx
server {
    server_name kytucxatlu.site www.kytucxatlu.site;
    client_max_body_size 20M;

    location / {
        proxy_pass http://127.0.0.1:1234;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    listen 443 ssl; # managed by Certbot
    ssl_certificate /etc/letsencrypt/live/kytucxatlu.site/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/kytucxatlu.site/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
}

# Redirect HTTP → HTTPS tự động
server {
    if ($host = www.kytucxatlu.site) {
        return 301 https://$host$request_uri;
    }
    if ($host = kytucxatlu.site) {
        return 301 https://$host$request_uri;
    }
    listen 80;
    server_name kytucxatlu.site www.kytucxatlu.site;
    return 404;
}
```

---

## File config 2: `/etc/nginx/sites-available/dormitory-ip`

> Fallback qua IP — dùng khi domain/Cloudflare sập

```nginx
server {
    listen 80;
    server_name 34.21.241.215;

    client_max_body_size 20M;

    location / {
        proxy_pass http://127.0.0.1:1234;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

> ⚠️ Khi vào bằng IP thì chỉ có HTTP (không có HTTPS), frontend gọi API sẽ bị Mixed Content nếu build với `https://`. Dùng để kiểm tra server còn sống không là chính.

---

## Giải thích từng dòng

### Khai báo server block

```nginx
server { ... }
```

Một "server block" = một virtual host. Có thể có nhiều block nếu chạy nhiều domain/app. Hiện tại có 2 file config = 3 server block.

---

### Lắng nghe port

```nginx
listen 443 ssl;  # HTTPS
listen 80;       # HTTP
```

- Port **443** — HTTPS, có SSL certificate
- Port **80** — HTTP, tự động redirect sang 443

---

### Tên server

```nginx
server_name kytucxatlu.site www.kytucxatlu.site;
```

Nginx xác định request này thuộc về server nào. Khai báo cả 2 để người dùng gõ có hoặc không có `www` đều vào được.

---

### SSL Certificate (do Certbot cấp)

```nginx
ssl_certificate /etc/letsencrypt/live/kytucxatlu.site/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/kytucxatlu.site/privkey.pem;
```

- Certificate từ **Let's Encrypt** — miễn phí, tự động gia hạn
- Hết hạn: **2026-09-05**, Certbot tự gia hạn trước khi hết

---

### Giới hạn file upload

```nginx
client_max_body_size 20M;
```

Cho phép upload file tối đa **20MB**. Quan trọng vì đồ án có OCR/upload ảnh CCCD. Mặc định Nginx chỉ cho 1MB → sẽ lỗi 413 khi upload ảnh.

---

### Forward tất cả request về Node.js

```nginx
location / {
    proxy_pass http://127.0.0.1:1234;
    ...
}
```

Mọi request đến `/` đều được chuyển tiếp vào Node.js đang chạy tại `localhost:1234`.

---

### HTTP version

```nginx
proxy_http_version 1.1;
```

Dùng HTTP/1.1 thay vì 1.0. Bắt buộc để **Socket.IO hoạt động** vì Socket.IO dùng WebSocket, chỉ có trong HTTP/1.1.

---

### Hỗ trợ WebSocket / Socket.IO

```nginx
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";
```

Hai dòng này cho phép **nâng cấp kết nối từ HTTP lên WebSocket**.  
Không có 2 dòng này → Socket.IO sẽ không kết nối được → tính năng real-time bị hỏng.

---

### Truyền thông tin request gốc

```nginx
proxy_set_header Host $host;
proxy_set_header X-Real-IP $remote_addr;
```

- `Host`: giữ nguyên tên host gốc của request
- `X-Real-IP`: truyền IP thật của người dùng vào Node.js

Quan trọng vì trong `server.js` có dòng `app.set('trust proxy', true)` để đọc IP thật từ header này (dùng cho rate limiting, logging...).

---

## Các lệnh quản lý Nginx

```bash
# Kiểm tra config có lỗi không
sudo nginx -t

# Khởi động lại Nginx
sudo systemctl restart nginx

# Xem trạng thái
sudo systemctl status nginx

# Xem log lỗi
sudo tail -f /var/log/nginx/error.log

# Xem log access
sudo tail -f /var/log/nginx/access.log

# Gia hạn SSL thủ công (tự động gia hạn nhưng phòng hờ)
sudo certbot renew
```

---

## Sơ đồ tổng thể hệ thống

```
                    INTERNET
                       │
          https://kytucxatlu.site
                       │
              ┌────────▼────────┐
              │   Cloudflare    │
              │  CDN + DDoS     │
              └────────┬────────┘
                       │ Port 443 (HTTPS)
              ┌────────▼────────┐
              │      NGINX      │
              │  Reverse Proxy  │
              │  + SSL/TLS      │
              └────────┬────────┘
                       │ proxy_pass
                  Port 1234
                       │
              ┌────────▼────────┐
              │    Node.js      │
              │    (PM2)        │
              │  Express +      │
              │  Socket.IO      │
              └────────┬────────┘
                       │
              ┌────────▼────────┐
              │   PostgreSQL    │
              │   Port 5432     │
              └─────────────────┘
```

---

## Lưu ý

- File config được **enable** bằng symlink:
  - `/etc/nginx/sites-enabled/dormitory → /etc/nginx/sites-available/dormitory`
  - `/etc/nginx/sites-enabled/dormitory-ip → /etc/nginx/sites-available/dormitory-ip`
- Sau mỗi lần sửa config phải chạy `sudo nginx -t` rồi mới `sudo systemctl restart nginx`
- SSL tự động gia hạn, hết hạn **2026-09-05**
- Cloudflare SSL mode: **Full** (không dùng Flexible sẽ bị redirect loop)
- IP tĩnh: **34.21.241.215** (không đổi dù restart VM)
