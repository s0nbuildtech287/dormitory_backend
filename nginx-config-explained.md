# Cấu hình Nginx — Dormitory System

## Nginx là gì?

Nginx đóng vai trò **reverse proxy** — đứng giữa internet và Node.js app, nhận request từ người dùng rồi chuyển vào backend.

```
Người dùng → http://kytucxatlu.site (port 80)
                    ↓
                  NGINX
                    ↓
          Node.js (port 1234)
```

Không có Nginx, người dùng phải gõ `http://34.21.241.215:1234` — xấu và không chuyên nghiệp.

---

## File config tại: `/etc/nginx/sites-available/dormitory`

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

---

## Giải thích từng dòng

### Khai báo server block

```nginx
server { ... }
```

Một "server block" = một virtual host. Có thể có nhiều block nếu chạy nhiều domain/app.

---

### Lắng nghe port

```nginx
listen 80;
```

Nginx lắng nghe trên port **80** (HTTP mặc định). Người dùng vào `http://IP` không cần gõ port.

---

### Tên server

```nginx
server_name kytucxatlu.site www.kytucxatlu.site;
```

Nginx xác định request này thuộc về server nào. Khai báo cả 2 để người dùng gõ có hoặc không có `www` đều vào được.

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
```

---

## Sơ đồ tổng thể hệ thống

```
                    INTERNET
                       │
                  Port 80 (HTTP)
                       │
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

## Lưu ý

- File config được **enable** bằng symlink: `/etc/nginx/sites-enabled/dormitory → /etc/nginx/sites-available/dormitory`
- Sau mỗi lần sửa config phải chạy `sudo nginx -t` để kiểm tra rồi mới `sudo systemctl restart nginx`
- Nếu sau này có domain + SSL (HTTPS), thêm Certbot để tự động cấp chứng chỉ Let's Encrypt
