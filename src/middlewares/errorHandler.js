// Middleware xử lý lỗi tập trung của ứng dụng Express
const errorHandler = (err, req, res, next) => {
    console.error('Error:', err);

    const statusCode = err.statusCode || 500;
    const message = err.message || 'Đã xảy ra lỗi máy chủ nội bộ';

    res.status(statusCode).json({
        success: false,
        message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
};

// Middleware xử lý lỗi 404 Not Found (đường dẫn không tồn tại)
const notFound = (req, res) => {
    res.status(404).json({
        success: false,
        message: 'Đường dẫn API không tồn tại'
    });
};

module.exports = {
    errorHandler,
    notFound
};
