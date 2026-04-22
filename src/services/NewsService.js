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

    /**
     * Lấy URL ảnh từ thẻ img — ưu tiên data-src (lazy load) trước src
     * TLU dùng Flatsome theme với lazy loading
     */
    const getImgSrc = ($img) => {
      const src =
        $img.attr("data-src") ||
        $img.attr("data-lazy-src") ||
        $img.attr("data-original") ||
        $img.attr("src") ||
        "";
      // Nếu là URL tương đối → chuyển thành tuyệt đối
      if (src && src.startsWith("/")) return "https://tlu.edu.vn" + src;
      // Bỏ qua placeholder base64 hoặc ảnh svg/gif 1x1
      if (src.startsWith("data:") || src.includes("placeholder")) return "";
      return src;
    };

    // TLU dùng Flatsome WordPress theme
    // Cấu trúc: .post-item > .box > .box-image (img) + .box-text (h5 > a, p)
    $(".post-item").each((i, el) => {
      const $item = $(el);

      // Tiêu đề + link
      const $titleLink = $item.find(".post-title a, h5 a, h4 a, h3 a, h2 a").first();
      const title = $titleLink.text().trim();
      const link = $titleLink.attr("href");

      if (!title || !link) return;
      if (title.length < 10) return;
      if (!link.startsWith("https://tlu.edu.vn/")) return;

      // Thumbnail — lấy từ .box-image img với ưu tiên data-src
      const $img = $item.find(".box-image img, .post-image img, .featured-image img, img").first();
      const thumbnail = $img.length ? getImgSrc($img) : "";

      // Mô tả ngắn
      const description = $item.find("p").first().text().trim().substring(0, 200)
        || "Xem chi tiết bài viết tại trang TLU.";

      articles.push({
        title,
        url: link,
        description,
        thumbnail,
        category,
        tag,
        publishedAt: null,
      });
    });

    // Fallback: nếu không tìm được gì qua .post-item → dùng h5 a
    if (articles.length === 0) {
      $("h2 a, h3 a, h4 a, h5 a").each((i, el) => {
        const $el = $(el);
        const title = $el.text().trim();
        const link = $el.attr("href");

        if (!title || !link || title.length < 10) return;
        if (!link.startsWith("https://tlu.edu.vn/")) return;

        const $parent = $el.closest("h2, h3, h4, h5");
        const $wrapper = $parent.closest("li, article, div");
        const $img = $wrapper.find("img").first();
        const thumbnail = $img.length ? getImgSrc($img) : "";
        const description = $parent.next("p, div").text().trim().substring(0, 200)
          || "Xem chi tiết bài viết tại trang TLU.";

        articles.push({ title, url: link, description, thumbnail, category, tag, publishedAt: null });
      });
    }

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
