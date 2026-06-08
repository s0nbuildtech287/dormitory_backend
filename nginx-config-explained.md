# Cấu hình Nginx — Dormitory System

## Nginx là gì?

Nginx đóng vai trò **reverse proxy** — đứng giữa internet và Node.js app, nhận request từ người dùng rồi chuyển vào backend.

```text
Người dùng → https://kytucxatlu.site
                    ↓
              Cloudflare (CDN + bảo vệ)
                    ↓
               NGINX (port 80)
                    ↓
          Node.js (port 1234)
```

Không có Nginx, người dùng phải gõ `http://34.143.140.150:1234` — xấu và không chuyên nghiệp.

---

## File config 1: `/etc/nginx/sites-available/dormitory`

> Domain chính, chạy sau Cloudflare Flexible

```nginx
server {
    listen 80;
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
}
```

> Hiện tại config thực tế chỉ dùng `listen 80`; không có `listen 443 ssl` và không có phần Certbot/Let's Encrypt trên VM.

---

## File config 2: `/etc/nginx/sites-available/dormitory-ip`

> Fallback qua IP — dùng khi domain hoặc Cloudflare gặp sự cố

```nginx
server {
    listen 80;
    server_name 34.143.140.150;

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

> Khi vào bằng IP thì chỉ có HTTP. Dùng để kiểm tra server còn sống hoặc test nhanh khi domain có vấn đề.

---

## Giải thích từng dòng

### Khai báo server block

```nginx
server { ... }
```

Một "server block" = một virtual host. Hiện tại có 2 file config tương ứng cho domain chính và IP fallback.

---

### Lắng nghe port

```nginx
listen 80;
```

- Port **80** là HTTP
- Vì đang dùng **Cloudflare Flexible**, kết nối HTTPS được xử lý ở Cloudflare
- Từ Cloudflare về VM chỉ cần HTTP nên Nginx không cần `443 ssl`

---

### Tên server

```nginx
server_name kytucxatlu.site www.kytucxatlu.site;
```

Nginx xác định request này thuộc về server nào. Khai báo cả 2 để người dùng gõ có hoặc không có `www` đều vào được.

---

### Không dùng SSL Certificate trên VM

Hiện tại không có các dòng như:

```nginx
listen 443 ssl;
ssl_certificate ...
ssl_certificate_key ...
```

Lý do là SSL đang được terminate tại Cloudflare. Server thực tế không cài Certbot và cũng không lưu certificate của Let's Encrypt.

---

### Giới hạn file upload

```nginx
client_max_body_size 20M;
```

Cho phép upload file tối đa **20MB**. Quan trọng vì đồ án có OCR/upload ảnh CCCD. Mặc định Nginx chỉ cho 1MB nên dễ lỗi 413 nếu không tăng giới hạn.

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

Dùng HTTP/1.1 thay vì 1.0. Đây là phần cần thiết để **Socket.IO hoạt động ổn định**.

---

### Hỗ trợ WebSocket / Socket.IO

```nginx
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";
```

Hai dòng này cho phép **nâng cấp kết nối từ HTTP lên WebSocket**. Nếu thiếu, các tính năng realtime dùng Socket.IO có thể không hoạt động đúng.

---

### Truyền thông tin request gốc

```nginx
proxy_set_header Host $host;
proxy_set_header X-Real-IP $remote_addr;
```

- `Host`: giữ nguyên host gốc của request
- `X-Real-IP`: truyền IP client vào Node.js

Phần này quan trọng vì backend có `app.set('trust proxy', true)` để đọc IP thực khi chạy sau proxy.

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
```

---

## Sơ đồ tổng thể hệ thống

```text
                    INTERNET
                       │
          https://kytucxatlu.site
                       │
              ┌────────▼────────┐
              │   Cloudflare    │
              │  CDN + DDoS     │
              │ SSL Flexible    │
              └────────┬────────┘
                       │ HTTPS từ client
                       │ HTTP từ Cloudflare về VM
              ┌────────▼────────┐
              │      NGINX      │
              │  Reverse Proxy  │
              │    Port 80      │
              └────────┬────────┘
                       │ proxy_pass
                  Port 1234
                       │
              ┌────────▼────────┐
              │    Node.js      │
              │      PM2        │
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
- Cloudflare SSL mode hiện tại là **Flexible**
- IP tĩnh hiện tại là **34.143.140.150**
