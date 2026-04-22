const { getNews, clearCache } = require("../services/NewsService");

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

module.exports = { getNewsHandler, refreshNewsHandler };
