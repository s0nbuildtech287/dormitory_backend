# Cấu hình Nginx — Dormitory System

## Nginx là gì?

Nginx đóng vai trò **reverse proxy** — đứng giữa internet và Node.js app, nhận request từ người dùng rồi chuyển vào backend.

```
Người dùng → https://kytucxatlu.site (port 443)
                    ↓
              Cloudflare (CDN + bảo vệ + SSL Flexible)
                    ↓
                  NGINX (port 80)
                    ↓
          Node.js (port 1234)
```

Không có Nginx, người dùng phải gõ `http://34.143.140.150:1234` — xấu và không chuyên nghiệp.

---

## File config: `/etc/nginx/sites-available/dormitory`

> Domain chính + fallback IP, chỉ dùng HTTP (SSL do Cloudflare xử lý)

```nginx
server {
    listen 80;
    server_name kytucxatlu.site www.kytucxatlu.site 34.143.140.150;
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

> ✅ Một file config duy nhất phục vụ cả domain lẫn IP trực tiếp.

---

## Giải thích từng dòng

### Khai báo server block

```nginx
server { ... }
```

Một "server block" = một virtual host. Mỗi block xử lý một nhóm domain/IP.

---

### Lắng nghe port

```nginx
listen 80;
```

Nginx lắng nghe port **80** (HTTP). HTTPS được Cloudflare xử lý ở tầng trên — traffic từ Cloudflare vào VM vẫn là HTTP port 80.

> ⚠️ **Tại sao không dùng port 443 + SSL trên VM?**  
> Cloudflare SSL mode **Flexible** = Cloudflare ↔ người dùng là HTTPS, còn Cloudflare ↔ VM là HTTP.  
> Nếu muốn Full thì cần cài Certbot trên VM thêm certificate.

---

### Tên server

```nginx
server_name kytucxatlu.site www.kytucxatlu.site 34.143.140.150;
```

Nginx nhận request từ cả 3 nguồn:
- `kytucxatlu.site` — domain chính
- `www.kytucxatlu.site` — domain có www
- `34.143.140.150` — IP trực tiếp (fallback khi Cloudflare sập)

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

Quan trọng vì trong `server.js` có `app.set('trust proxy', true)` để đọc IP thật từ header này (dùng cho rate limiting, logging...).

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
              │  SSL Flexible   │
              └────────┬────────┘
                       │ HTTP Port 80
              ┌────────▼────────┐
              │      NGINX      │
              │  Reverse Proxy  │
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

## Các lệnh quản lý Nginx

```bash
# Kiểm tra config có lỗi không
nginx -t

# Khởi động lại Nginx
systemctl restart nginx

# Xem trạng thái
systemctl status nginx

# Xem log lỗi
tail -f /var/log/nginx/error.log

# Xem log access
tail -f /var/log/nginx/access.log
```

---

## Lưu ý

- File config được **enable** bằng symlink:
  - `/etc/nginx/sites-enabled/dormitory → /etc/nginx/sites-available/dormitory`
- Sau mỗi lần sửa config phải chạy `nginx -t` rồi mới `systemctl restart nginx`
- SSL do **Cloudflare** xử lý hoàn toàn — Cloudflare SSL mode: **Flexible**
- VM IP hiện tại: **34.143.140.150** (Ephemeral — nên đặt Static để tránh đổi IP khi restart VM)