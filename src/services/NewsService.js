const axios = require("axios");
const cheerio = require("cheerio");

const DEFAULT_NEWS_THUMBNAIL =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" role="img" aria-label="Default news thumbnail"><defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#dbeafe"/><stop offset="100%" stop-color="#bfdbfe"/></linearGradient></defs><rect width="400" height="300" fill="url(#bg)"/><rect x="88" y="52" width="224" height="196" rx="16" fill="#ffffff" stroke="#93c5fd" stroke-width="4"/><rect x="116" y="92" width="110" height="12" rx="6" fill="#2563eb"/><rect x="116" y="116" width="168" height="10" rx="5" fill="#cbd5e1"/><rect x="116" y="136" width="168" height="10" rx="5" fill="#cbd5e1"/><rect x="116" y="156" width="120" height="10" rx="5" fill="#cbd5e1"/><rect x="116" y="182" width="54" height="44" rx="8" fill="#dbeafe"/><rect x="178" y="182" width="106" height="10" rx="5" fill="#cbd5e1"/><rect x="178" y="200" width="90" height="10" rx="5" fill="#cbd5e1"/><rect x="178" y="218" width="66" height="10" rx="5" fill="#cbd5e1"/></svg>`
  );

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
      const resolvedSrc = src && src.startsWith("/") ? `https://tlu.edu.vn${src}` : src;
      const normalized = resolvedSrc.toLowerCase();
      // Bỏ qua placeholder base64 hoặc ảnh svg/gif 1x1
      if (
        resolvedSrc.startsWith("data:") ||
        normalized.includes("placeholder") ||
        normalized.includes("no-image") ||
        normalized.includes("noimage") ||
        normalized.includes("image-not-available") ||
        normalized.includes("not-available")
      ) {
        return "";
      }
      return resolvedSrc;
    };

    // TLU dùng Flatsome WordPress theme
    // Cấu trúc: .post-item > .box > .box-image (img) + .box-text (h5 > a, p)

    /**
     * Extract ngày từ text mô tả — TLU nhúng ngày trực tiếp trong description
     * VD: "Chiều ngày 20/4/2026...", "Ngày 19/4/2026...", "Sáng 17/4/2026..."
     */
    const extractDateFromText = (text) => {
      if (!text) return null;
      const currentYear = new Date().getFullYear();

      // Pattern 1: DD/MM/YYYY hoặc D/M/YYYY  (đầy đủ năm)
      const m1 = text.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      if (m1) {
        const [, d, mo, y] = m1;
        return `${d.padStart(2,"0")}/${mo.padStart(2,"0")}/${y}`;
      }
      // Pattern 2: DD-MM-YYYY
      const m2 = text.match(/(\d{1,2})-(\d{1,2})-(\d{4})/);
      if (m2) {
        const [, d, mo, y] = m2;
        return `${d.padStart(2,"0")}/${mo.padStart(2,"0")}/${y}`;
      }
      // Pattern 3: DD/MM không có năm → gán năm hiện tại
      const m3 = text.match(/(\d{1,2})\/(\d{1,2})(?!\/\d)/);
      if (m3) {
        const [, d, mo] = m3;
        return `${d.padStart(2,"0")}/${mo.padStart(2,"0")}/${currentYear}`;
      }
      // Pattern 4: DD-M không có năm  VD: "19-4"
      const m4 = text.match(/\b(\d{1,2})-(\d{1,2})\b/);
      if (m4) {
        const [, d, mo] = m4;
        return `${d.padStart(2,"0")}/${mo.padStart(2,"0")}/${currentYear}`;
      }
      return null;
    };

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
      const thumbnail = ($img.length ? getImgSrc($img) : "") || DEFAULT_NEWS_THUMBNAIL;

      // Mô tả ngắn
      const description = $item.find("p").first().text().trim().substring(0, 200)
        || "Xem chi tiết bài viết tại trang TLU.";

      // Ngày đăng — extract từ text mô tả bằng regex
      const publishedAt = extractDateFromText(description);

      articles.push({
        title,
        url: link,
        description,
        thumbnail,
        category,
        tag,
        publishedAt,
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
        const thumbnail = ($img.length ? getImgSrc($img) : "") || DEFAULT_NEWS_THUMBNAIL;
        const description = $parent.next("p, div").text().trim().substring(0, 200)
          || "Xem chi tiết bài viết tại trang TLU.";

        const publishedAt = extractDateFromText(description);
        articles.push({ title, url: link, description, thumbnail, category, tag, publishedAt });
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
