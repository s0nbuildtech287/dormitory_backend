const multer = require('multer');
const path = require('path');

// Cấu hình vị trí lưu trữ và quy tắc đặt tên file
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, process.env.UPLOAD_PATH || './uploads');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// Bộ lọc định dạng file tải lên
const fileFilter = (req, file, cb) => {
    // Chỉ chấp nhận hình ảnh, Excel và file CSV
    const allowedTypes = /jpeg|jpg|png|gif|xlsx|xls|csv/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb(new Error('Chỉ chấp nhận các file hình ảnh, Excel (xls, xlsx) và CSV'));
    }
};

// Khởi tạo middleware multer với cấu hình giới hạn kích thước file (mặc định 5MB)
const upload = multer({
    storage: storage,
    limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5242880
    },
    fileFilter: fileFilter
});

module.exports = upload;
