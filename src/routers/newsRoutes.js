const express = require("express");
const router = express.Router();
const { getNewsHandler, refreshNewsHandler } = require("../controllers/NewsController");

// GET /api/news — lấy danh sách tin tức (có filter & phân trang)
router.get("/", getNewsHandler);

// POST /api/news/refresh — làm mới cache thủ công
router.post("/refresh", refreshNewsHandler);

module.exports = router;
