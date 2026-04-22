const express = require("express");
const router = express.Router();
const axios = require("axios");
const { getNewsHandler, refreshNewsHandler } = require("../controllers/NewsController");

// GET /api/news — lấy danh sách tin tức (có filter & phân trang)
router.get("/", getNewsHandler);

// POST /api/news/refresh — làm mới cache thủ công
router.post("/refresh", refreshNewsHandler);

/**
 * GET /api/news/image-proxy?url=...
 * Proxy ảnh từ TLU để bypass hotlink protection.
 * Frontend gọi: /api/news/image-proxy?url=https://tlu.edu.vn/wp-content/...
 */
router.get("/image-proxy", async (req, res) => {
  const { url } = req.query;
  if (!url || !url.startsWith("https://tlu.edu.vn/")) {
    return res.status(400).json({ error: "URL không hợp lệ" });
  }
  try {
    const response = await axios.get(url, {
      responseType: "arraybuffer",
      timeout: 8000,
      headers: {
        Referer: "https://tlu.edu.vn/",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "image/webp,image/apng,image/*,*/*",
      },
    });
    const contentType = response.headers["content-type"] || "image/jpeg";
    res.set("Content-Type", contentType);
    res.set("Cache-Control", "public, max-age=86400"); // cache 1 ngày
    res.send(response.data);
  } catch {
    res.status(404).send("Không tải được ảnh");
  }
});

module.exports = router;

