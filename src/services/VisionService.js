/**
 * VisionService.js
 * Tích hợp Google Cloud Vision API để xác thực ảnh minh chứng sinh viên.
 *
 * Output 3 mức:
 *   VALID   - Ảnh rõ ràng là giấy tờ hợp lệ
 *   SUSPECT - Có dấu hiệu giấy tờ nhưng không chắc, cần admin duyệt tay
 *   INVALID - Ảnh không liên quan (meme, đồ ăn, selfie, thú cưng...)
 */

const vision = require('@google-cloud/vision');
const path = require('path');
const fs = require('fs');

// ============================================================
// CẤU HÌNH
// ============================================================

const VISION_ENABLED = process.env.VISION_VALIDATION_ENABLED !== 'false';

// Từ khóa mong đợi trong text OCR (không phân biệt hoa thường)
// Bao gồm các loại giấy tờ minh chứng thực tế trong nghiệp vụ KTX TLU:
// - CCCD mặt trước/sau
// - Thẻ sinh viên
// - Giấy xác nhận hộ nghèo/cận nghèo
// - Giấy xác nhận vùng sâu vùng xa / hộ khẩu
// - Giấy xác nhận gia đình chính sách (thương binh, liệt sỹ)
// - Giấy xác nhận khuyết tật
// - Thẻ lưu học sinh / hộ chiếu
const EXPECTED_KEYWORDS = [
  // Giấy tờ tùy thân
  'căn cước', 'cccd', 'chứng minh', 'citizen', 'identity',
  'họ và tên', 'họ tên', 'ngày sinh', 'quê quán', 'nơi thường trú',
  'số định danh', 'quốc tịch', 'dân tộc',

  // Thẻ sinh viên / trường học
  'sinh viên', 'student', 'thẻ sinh viên', 'mã sinh viên', 'mssv',
  'trường đại học', 'đại học thủy lợi', 'thuyloi', 'tlu',
  'khoa', 'ngành', 'lớp', 'niên khóa',

  // Giấy xác nhận hộ nghèo / cận nghèo
  'hộ nghèo', 'cận nghèo', 'xác nhận', 'ủy ban nhân dân', 'ubnd',
  'xã', 'phường', 'thị trấn', 'huyện', 'tỉnh',

  // Giấy xác nhận vùng sâu vùng xa / hộ khẩu
  'hộ khẩu', 'thường trú', 'tạm trú', 'vùng đặc biệt khó khăn',
  'khu vực', 'xã đặc biệt',

  // Giấy xác nhận chính sách (thương binh, liệt sỹ)
  'thương binh', 'liệt sỹ', 'gia đình chính sách', 'người có công',
  'bộ lao động', 'sở lao động',

  // Giấy xác nhận khuyết tật
  'khuyết tật', 'người khuyết tật', 'giấy xác nhận khuyết tật',
  'bệnh viện', 'y tế', 'sức khỏe',

  // Lưu học sinh / hộ chiếu
  'hộ chiếu', 'passport', 'lưu học sinh', 'visa', 'quốc tịch lào',
  'quốc tịch campuchia', 'nước cộng hòa',

  // Chung
  'cộng hòa xã hội chủ nghĩa việt nam', 'độc lập tự do hạnh phúc',
  'số:', 'ngày', 'tháng', 'năm', 'ký tên', 'đóng dấu',
];

// Nhãn Vision API cho thấy ảnh là giấy tờ hợp lệ
const VALID_LABELS = [
  // Giấy tờ cơ bản
  'document', 'paper document', 'official document', 'paper', 'text',
  // Thẻ / chứng minh
  'identity document', 'id card', 'card', 'passport', 'driving license',
  // Chứng nhận / giấy tờ hành chính
  'certificate', 'license', 'form', 'receipt', 'invoice', 'letter',
  // Chữ viết / in
  'font', 'handwriting', 'writing', 'number', 'brand',
  // Chính phủ / hành chính
  'government', 'government document', 'legal document',
  // Scan / chụp tài liệu
  'scan', 'photocopy', 'printed',
  // Phong bì / thư từ hành chính
  'envelope', 'mail',
];

// Nhãn Vision API cho thấy ảnh KHÔNG phải giấy tờ
const INVALID_LABELS = [
  'food', 'animal', 'pet', 'dog', 'cat', 'selfie', 'face',
  'landscape', 'nature', 'plant', 'flower', 'sky', 'meme',
  'cartoon', 'illustration', 'art', 'painting',
];

// Ngưỡng tối thiểu ký tự OCR để coi là có text
// Giấy tờ VN thường có nhiều text, nhưng ảnh chụp nghiêng/mờ có thể ít hơn
const MIN_TEXT_LENGTH = 10;

// Retry config cho quota exceeded
const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 2000, 4000];

// ============================================================
// KHỞI TẠO CLIENT
// ============================================================

let visionClient = null;

function getVisionClient() {
  if (visionClient) return visionClient;

  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!credPath) {
    throw new Error('GOOGLE_APPLICATION_CREDENTIALS chưa được cấu hình trong .env');
  }

  const absPath = path.isAbsolute(credPath)
    ? credPath
    : path.join(process.cwd(), credPath);

  if (!fs.existsSync(absPath)) {
    throw new Error(`File service account không tồn tại: ${absPath}`);
  }

  visionClient = new vision.ImageAnnotatorClient({ keyFilename: absPath });
  return visionClient;
}

// ============================================================
// HELPER: SLEEP
// ============================================================
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ============================================================
// CORE: GỌI VISION API VỚI RETRY
// ============================================================

async function callVisionAPI(imageSource) {
  const client = getVisionClient();

  // imageSource có thể là Buffer hoặc URL string
  const image = typeof imageSource === 'string'
    ? { source: { imageUri: imageSource } }
    : { content: imageSource.toString('base64') };

  const request = {
    image,
    features: [
      { type: 'TEXT_DETECTION' },
      { type: 'LABEL_DETECTION', maxResults: 20 },
      { type: 'SAFE_SEARCH_DETECTION' },
    ],
  };

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const [result] = await client.annotateImage(request);
      return result;
    } catch (err) {
      const isQuota = err.code === 429 || (err.message && err.message.includes('quota'));
      if (isQuota && attempt < MAX_RETRIES) {
        console.warn(`⚠️ Vision API quota exceeded, retry ${attempt + 1}/${MAX_RETRIES} sau ${RETRY_DELAYS[attempt]}ms`);
        await sleep(RETRY_DELAYS[attempt]);
        continue;
      }
      throw err;
    }
  }
}

// ============================================================
// CORE: ÁP DỤNG 5 MVP RULES
// ============================================================

/**
 * Phân tích kết quả Vision API và trả về Validation_Result
 * @param {object} visionResult - Kết quả thô từ Vision API
 * @returns {{ status, vision_score, vision_reasons }}
 */
function applyMVPRules(visionResult) {
  const reasons = [];
  let score = 0;

  // ── Rule 5: Safe Search (kiểm tra trước, INVALID ngay) ──────────────
  const safeSearch = visionResult.safeSearchAnnotation || {};
  const dangerousLevels = ['LIKELY', 'VERY_LIKELY'];
  if (
    dangerousLevels.includes(safeSearch.adult) ||
    dangerousLevels.includes(safeSearch.violence)
  ) {
    reasons.push(`Nội dung không phù hợp: adult=${safeSearch.adult}, violence=${safeSearch.violence}`);
    return { status: 'INVALID', vision_score: 0.0, vision_reasons: reasons };
  }

  // ── Rule 4: Negative Labels (INVALID ngay) ───────────────────────────
  const labels = (visionResult.labelAnnotations || []).map((l) => ({
    desc: l.description.toLowerCase(),
    score: l.score,
  }));

  const negativeHit = labels.find(
    (l) => INVALID_LABELS.some((bad) => l.desc.includes(bad)) && l.score >= 0.7
  );
  if (negativeHit) {
    reasons.push(`Phát hiện nhãn không hợp lệ: "${negativeHit.desc}" (${(negativeHit.score * 100).toFixed(0)}%)`);
    return { status: 'INVALID', vision_score: 0.05, vision_reasons: reasons };
  }

  // ── Rule 1: OCR Text ─────────────────────────────────────────────────
  const fullText = visionResult.fullTextAnnotation?.text || '';
  const textLength = fullText.replace(/\s/g, '').length;
  const rule1Pass = textLength >= MIN_TEXT_LENGTH;

  if (rule1Pass) {
    reasons.push(`Phát hiện text: ${textLength} ký tự`);
    score += 0.4;
  } else {
    reasons.push(`Ít text: chỉ ${textLength} ký tự (cần >= ${MIN_TEXT_LENGTH})`);
  }

  // ── Rule 2: Keyword Matching ─────────────────────────────────────────
  const textLower = fullText.toLowerCase();
  const matchedKeywords = EXPECTED_KEYWORDS.filter((kw) => textLower.includes(kw));
  const rule2Pass = matchedKeywords.length >= 1;

  if (rule2Pass) {
    reasons.push(`Keyword match: ${matchedKeywords.slice(0, 5).join(', ')}`);
    score += 0.35;
  }

  // ── Rule 3: Valid Labels ─────────────────────────────────────────────
  const validLabelHits = labels.filter(
    (l) => VALID_LABELS.some((good) => l.desc.includes(good)) && l.score >= 0.6
  );
  const rule3Pass = validLabelHits.length >= 1;

  if (rule3Pass) {
    const topLabels = validLabelHits.slice(0, 3).map((l) => `${l.desc} (${(l.score * 100).toFixed(0)}%)`);
    reasons.push(`Label hợp lệ: ${topLabels.join(', ')}`);
    score += 0.25;
  } else {
    const topLabels = labels.slice(0, 3).map((l) => `${l.desc} (${(l.score * 100).toFixed(0)}%)`);
    if (topLabels.length > 0) reasons.push(`Label phát hiện: ${topLabels.join(', ')}`);
  }

  // ── Phân loại cuối ───────────────────────────────────────────────────
  let status;
  if (rule1Pass && (rule2Pass || rule3Pass)) {
    status = 'VALID';
  } else if (rule1Pass) {
    // Có text nhưng không đủ keyword/label → cần xem xét
    status = 'SUSPECT';
    reasons.push('Có text nhưng không nhận diện được loại giấy tờ');
    score = Math.max(score, 0.3);
  } else {
    // Quá ít text và không có label hợp lệ
    status = 'INVALID';
    score = Math.min(score, 0.2);
  }

  return {
    status,
    vision_score: Math.min(parseFloat(score.toFixed(3)), 1.0),
    vision_reasons: reasons,
  };
}

// ============================================================
// PUBLIC: XÁC THỰC MỘT ẢNH (từ buffer)
// ============================================================

/**
 * Xác thực một ảnh từ buffer
 * @param {Buffer} imageBuffer
 * @returns {Promise<{ status, vision_score, vision_reasons }>}
 */
async function validateImageBuffer(imageBuffer) {
  if (!VISION_ENABLED) {
    return { status: 'PENDING', vision_score: null, vision_reasons: ['Vision validation disabled'] };
  }

  const startTime = Date.now();
  try {
    const visionResult = await callVisionAPI(imageBuffer);
    const result = applyMVPRules(visionResult);
    console.log(`✅ Vision: ${result.status} (score=${result.vision_score}, ${Date.now() - startTime}ms)`);
    return result;
  } catch (err) {
    console.error(`❌ Vision API error: ${err.message}`);
    return {
      status: 'ERROR',
      vision_score: null,
      vision_reasons: [`Lỗi Vision API: ${err.message}`],
    };
  }
}

// ============================================================
// PUBLIC: TỔNG HỢP STATUS CHO TOÀN HỒ SƠ (nhiều ảnh)
// ============================================================

/**
 * Tổng hợp vision_status từ mảng kết quả nhiều ảnh
 * Logic: INVALID > SUSPECT > ERROR > VALID > PENDING
 */
function aggregateStatus(results) {
  if (!results || results.length === 0) return 'PENDING';
  if (results.some((r) => r.status === 'INVALID')) return 'INVALID';
  if (results.some((r) => r.status === 'SUSPECT')) return 'SUSPECT';
  if (results.every((r) => r.status === 'ERROR')) return 'ERROR';
  if (results.every((r) => r.status === 'VALID')) return 'VALID';
  // Mix của VALID + ERROR → SUSPECT (cần admin xem)
  return 'SUSPECT';
}

module.exports = {
  validateImageBuffer,
  aggregateStatus,
  VISION_ENABLED,
};
