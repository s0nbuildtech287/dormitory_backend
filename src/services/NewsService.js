const axios = require("axios");
const cheerio = require("cheerio");

// ──────────────────────────────────────────────────────────────
// In-memory cache — không cần database
// ──────────────────────────────────────────────────────────────
const cache = {
  data: null,
  lastFetched: null,
};
const CACHE_TTL = 60 * 60 * 1000; // 1 giờ

// Danh sách nguồn tin muốn cào
const NEWS_SOURCES = [
  {
    category: "Hoạt động chung",
    url: "https://tlu.edu.vn/tin-tuc-thong-bao/tin-tuc/",
    tag: "general",
  },
  {
    category: "Công tác sinh viên",
    url: "https://tlu.edu.vn/tin-tuc-thong-bao/tin-tuc/tin-cong-tac-sinh-vien/",
    tag: "student",
  },
  {
    category: "Thông báo",
    url: "https://tlu.edu.vn/tin-tuc-thong-bao/thong-bao/",
    tag: "announcement",
  },
  {
    category: "Sự kiện",
    url: "https://tlu.edu.vn/tin-tuc-thong-bao/su-kien/",
    tag: "event",
  },
];

/**
 * Cào danh sách tin tức từ 1 URL nguồn TLU
 * @param {string} url - URL trang danh sách bài viết
 * @param {string} category - Tên danh mục
 * @param {string} tag - Tag phân loại
 * @returns {Array} Mảng các bài tin
 */
async function scrapeOnePage(url, category, tag) {
  try {
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "vi-VN,vi;q=0.9,en;q=0.8",
      },
    });

    const $ = cheerio.load(response.data);
    const articles = [];

    // TLU dùng WordPress — mỗi bài trong <article> hoặc tiêu đề trong <h2>/<h3>/<h5> có <a>
    // Phân tích: tiêu đề nằm trong h2, h3, h4, h5 > a; mô tả là paragraph kế tiếp
    $("h2 a, h3 a, h4 a, h5 a").each((i, el) => {
      const $el = $(el);
      const title = $el.text().trim();
      const link = $el.attr("href");

      // Bỏ qua link menu/navbar (không phải bài tin)
      if (!title || !link) return;
      if (title.length < 10) return; // Bỏ tiêu đề quá ngắn (menu items)
      if (!link.startsWith("https://tlu.edu.vn/")) return; // Chỉ lấy link nội bộ TLU

      // Lấy mô tả từ phần tử kế tiếp
      const $parent = $el.closest("h2, h3, h4, h5");
      let description = "";
      const $next = $parent.next("p, div");
      if ($next.length) {
        description = $next.text().trim().substring(0, 200);
      }

      // Lấy ảnh thumbnail nếu có (trong cùng article wrapper)
      const $article = $parent.closest("article, .post, .item, li, div[class*='post'], div[class*='item']");
      let thumbnail = "";
      if ($article.length) {
        const $img = $article.find("img").first();
        thumbnail = $img.attr("src") || $img.attr("data-src") || "";
      }

      articles.push({
        title,
        url: link,
        description: description || "Xem chi tiết bài viết tại trang TLU.",
        thumbnail,
        category,
        tag,
        publishedAt: null, // TLU không luôn có date trong listing
      });
    });

    return articles;
  } catch (err) {
    console.error(`[NewsService] Lỗi cào ${url}:`, err.message);
    return [];
  }
}

/**
 * Lấy tin tức — trả từ cache nếu còn hạn, cào mới nếu hết hạn
 * @returns {Object} { news: Array, categories: Array, lastUpdated: Date }
 */
async function getNews() {
  const now = Date.now();

  // Cache còn hạn → trả luôn
  if (cache.data && cache.lastFetched && now - cache.lastFetched < CACHE_TTL) {
    console.log("[NewsService] Trả từ cache");
    return cache.data;
  }

  console.log("[NewsService] Bắt đầu cào tin tức từ TLU...");

  // Cào song song tất cả nguồn
  const results = await Promise.allSettled(
    NEWS_SOURCES.map((src) => scrapeOnePage(src.url, src.category, src.tag))
  );

  const allArticles = [];
  results.forEach((result, idx) => {
    if (result.status === "fulfilled") {
      allArticles.push(...result.value);
    }
  });

  // Dedup theo URL
  const seen = new Set();
  const uniqueArticles = allArticles.filter((a) => {
    if (seen.has(a.url)) return false;
    seen.add(a.url);
    return true;
  });

  const categories = [...new Set(NEWS_SOURCES.map((s) => s.category))];

  const data = {
    news: uniqueArticles,
    categories,
    total: uniqueArticles.length,
    lastUpdated: new Date().toISOString(),
  };

  // Lưu vào cache
  cache.data = data;
  cache.lastFetched = now;

  console.log(`[NewsService] Đã cào ${uniqueArticles.length} bài tin`);
  return data;
}

/**
 * Xóa cache thủ công (dùng khi admin muốn refresh)
 */
function clearCache() {
  cache.data = null;
  cache.lastFetched = null;
  console.log("[NewsService] Cache đã được xóa");
}

module.exports = { getNews, clearCache };
