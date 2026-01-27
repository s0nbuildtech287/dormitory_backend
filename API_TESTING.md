# API Testing Guide

## Test Authentication

### 1. Login as Admin
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@ktx.edu.vn",
    "password": "admin123"
  }'
```

Response will include JWT token:
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": { ... },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### 2. Get Current User
```bash
curl http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Test Registrations

### Get all registrations
```bash
curl http://localhost:5000/api/registrations \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Create registration
```bash
curl -X POST http://localhost:5000/api/registrations \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "student_name": "Nguyễn Văn Test",
    "email": "test@student.edu.vn",
    "phone": "0912345678",
    "gender": "Nam",
    "dob": "2005-01-15",
    "address": "Hà Nội",
    "faculty": "CNTT",
    "class": "CNTT K68",
    "year": 1
  }'
```

### Approve registration
```bash
curl -X POST http://localhost:5000/api/registrations/REG_ID/approve \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "note": "Hồ sơ hợp lệ"
  }'
```

## Test Rooms

### Get all rooms
```bash
curl http://localhost:5000/api/rooms \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Create room
```bash
curl -X POST http://localhost:5000/api/rooms \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "room_number": "P.301",
    "building": "A1",
    "floor": 3,
    "capacity": 4,
    "gender_type": "Nam",
    "rent_price": 500000
  }'
```

## Test Contracts

### Create contract from registration
```bash
curl -X POST http://localhost:5000/api/contracts/from-registration \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "registrationId": "REG_ID",
    "roomId": "ROOM_ID",
    "start_date": "2024-09-01",
    "end_date": "2025-06-30",
    "rent_price": 500000,
    "deposit_amount": 1000000
  }'
```

## Test Invoices

### Create invoice from room
```bash
curl -X POST http://localhost:5000/api/invoices/from-room \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "roomId": "ROOM_ID",
    "billingMonth": "2024-11-01",
    "meterReadings": {
      "electric_start": 1000,
      "electric_end": 1250,
      "electric_rate": 3500,
      "water_start": 50,
      "water_end": 65,
      "water_rate": 15000,
      "due_date": "2024-11-15"
    }
  }'
```

### Mark invoice as paid
```bash
curl -X POST http://localhost:5000/api/invoices/INVOICE_ID/mark-paid \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "paymentMethod": "Tiền mặt"
  }'
```

## Test Notifications

### Send notification to all students
```bash
curl -X POST http://localhost:5000/api/notifications/send-all \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Thông báo nộp tiền tháng 11",
    "content": "Các sinh viên vui lòng nộp tiền phòng trước ngày 15/11",
    "type": "Thanh toán"
  }'
```

## Test Feedbacks

### Create feedback
```bash
curl -X POST http://localhost:5000/api/feedbacks \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "category": "Sửa chữa",
    "content": "Quạt phòng 301 bị hỏng, cần sửa gấp",
    "room_id": "ROOM_ID"
  }'
```

### Update feedback status
```bash
curl -X POST http://localhost:5000/api/feedbacks/FEEDBACK_ID/status \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "Resolved",
    "adminResponse": "Đã sửa xong quạt"
  }'
```

## Common Query Parameters

### Filtering
- `?status=Chờ duyệt` - Filter by status
- `?search=keyword` - Search
- `?limit=10` - Limit results

### Date ranges
- `?startDate=2024-01-01&endDate=2024-12-31`

## Response Format

Success:
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}
```

Error:
```json
{
  "success": false,
  "message": "Error description"
}
```
