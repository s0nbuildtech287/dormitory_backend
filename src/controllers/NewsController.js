const { getNews, clearCache } = require("../services/NewsService");
const axios = require("axios");
const cheerio = require("cheerio");

/**
 * POST /api/news/analyze
 * Cào nội dung bài viết TLU rồi gọi AI phân tích luôn — không nhét content vào prompt frontend
 * Body: { url, title }
 */
const analyzeArticle = async (req, res) => {
  const { url, title } = req.body;
  if (!url || !url.startsWith("https://tlu.edu.vn/")) {
    return res.status(400).json({ success: false, message: "URL không hợp lệ" });
  }
  try {
    // 1. Cào nội dung bài viết
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept-Language": "vi-VN,vi;q=0.9",
      },
    });
    const $ = cheerio.load(response.data);
    $("script, style, nav, header, footer, .sidebar, .widget, .comments, .related-posts, iframe, noscript").remove();

    let content = "";
    for (const sel of [".entry-content", ".post-content", ".article-content", "article .content", "main article"]) {
      const text = $(sel).text().replace(/\s+/g, " ").trim();
      if (text.length > 200) { content = text; break; }
    }
    if (!content) {
      const paragraphs = [];
      $("main p, article p, .post p").each((_, el) => {
        const t = $(el).text().trim();
        if (t.length > 30) paragraphs.push(t);
      });
      content = paragraphs.join("\n");
    }

    if (!content || content.length < 100) {
      return res.json({ success: false, message: "Không lấy được nội dung bài viết từ trang này." });
    }

    // 2. Gọi AI phân tích — truyền toàn bộ content, không cắt
    const { createChatCompletion } = require("../services/openaiService");
    const messages = [
      {
        role: "system",
        content:
          "Bạn là trợ lý phân tích tin tức cho sinh viên ký túc xá Đại học Thủy Lợi. " +
          "Hãy phân tích bài báo được cung cấp và trả lời bằng tiếng Việt, ngắn gọn, dễ đọc.",
      },
      {
        role: "user",
        content:
          `Tiêu đề: ${title || "Bài báo TLU"}\n\nNội dung:\n${content}\n\n` +
          `Hãy phân tích theo 3 mục:\n` +
          `1. Tóm tắt (3-5 câu)\n` +
          `2. Điểm nổi bật\n` +
          `3. Ý nghĩa với sinh viên KTX (nếu có)`,
      },
    ];

    const result = await createChatCompletion(messages, "gpt-4o-mini", "news-analyze");
    return res.json({ success: true, analysis: result.content });
  } catch (err) {
    console.error("[NewsController] analyzeArticle lỗi:", err.message);
    return res.status(500).json({ success: false, message: "Lỗi phân tích: " + err.message });
  }
};

/**
 * GET /api/news
 * Lấy danh sách tin tức từ TLU (có cache 1 giờ)
 */
const getNewsHandler = async (req, res) => {
  try {
    const { category, tag, page = 1, limit = 12 } = req.query;
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 12;

    const data = await getNews();

    // Đếm số lượng theo từng tag từ TOÀN BỘ data (không phân trang)
    const categoryCounts = {
      all: data.news.length,
      general: data.news.filter((n) => n.tag === "general").length,
      student: data.news.filter((n) => n.tag === "student").length,
      announcement: data.news.filter((n) => n.tag === "announcement").length,
      event: data.news.filter((n) => n.tag === "event").length,
    };

    // Filter theo category hoặc tag nếu có
    let filtered = data.news;
    if (category && category !== "all") {
      filtered = filtered.filter((n) => n.category === category);
    }
    if (tag && tag !== "all") {
      filtered = filtered.filter((n) => n.tag === tag);
    }

    // Phân trang
    const total = filtered.length;
    const totalPages = Math.ceil(total / limitNum);
    const start = (pageNum - 1) * limitNum;
    const paginated = filtered.slice(start, start + limitNum);

    return res.json({
      success: true,
      data: {
        news: paginated,
        categories: data.categories,
        categoryCounts,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages,
        },
        lastUpdated: data.lastUpdated,
      },
    });
  } catch (err) {
    console.error("[NewsController] Lỗi:", err.message);
    return res.status(500).json({
      success: false,
      message: "Không thể tải tin tức. Vui lòng thử lại sau.",
    });
  }
};


/**
 * POST /api/news/refresh
 * Xóa cache và cào lại tin tức (admin có thể dùng)
 */
const refreshNewsHandler = async (req, res) => {
  try {
    clearCache();
    const data = await getNews();
    return res.json({
      success: true,
      message: `Đã làm mới ${data.total} bài tin`,
      lastUpdated: data.lastUpdated,
    });
  } catch (err) {
    console.error("[NewsController] Lỗi refresh:", err.message);
    return res.status(500).json({
      success: false,
      message: "Lỗi khi làm mới tin tức.",
    });
  }
};

module.exports = { getNewsHandler, refreshNewsHandler, analyzeArticle };
