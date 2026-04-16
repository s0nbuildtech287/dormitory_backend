/**
 * ImageValidatorService.js
 * Điều phối luồng: lấy URL ảnh → tải từ Drive → gọi Vision → lưu DB
 */

const DriveService = require('./DriveService');
const VisionService = require('./VisionService');
const RegisterFormDAO = require('../dao/RegisterFormDAO');
const LogSystemDAO = require('../dao/LogSystemDAO');

const MAX_CONCURRENT = 5; // Tối đa 5 hồ sơ song song

/**
 * Trích xuất tất cả URL Google Drive từ một row dữ liệu
 * @param {object} evidenceImagesJson - Giá trị JSONB từ DB (string hoặc array)
 * @returns {string[]}
 */
function parseEvidenceUrls(evidenceImagesJson) {
  if (!evidenceImagesJson) return [];
  try {
    const parsed = typeof evidenceImagesJson === 'string'
      ? JSON.parse(evidenceImagesJson)
      : evidenceImagesJson;

    const urls = Array.isArray(parsed) ? parsed : [parsed];
    return urls
      .map((u) => (typeof u === 'object' ? u.url : u))
      .filter((u) => u && typeof u === 'string' && u.includes('drive.google.com'));
  } catch {
    return [];
  }
}

/**
 * Xác thực tất cả ảnh của một hồ sơ và lưu kết quả vào DB
 * @param {string} registrationId
 * @param {string} [adminId]
 * @returns {Promise<{ vision_status, vision_score, vision_reasons }>}
 */
async function validateRegistrationImages(registrationId, adminId = 'system') {
  if (!VisionService.VISION_ENABLED) {
    console.log(`⏭️  Vision disabled, bỏ qua hồ sơ ${registrationId}`);
    return null;
  }

  const startTime = Date.now();
  let registration;

  try {
    registration = await RegisterFormDAO.findById(registrationId);
    if (!registration) throw new Error(`Không tìm thấy hồ sơ ${registrationId}`);

    const urls = parseEvidenceUrls(registration.evidence_images);
    if (urls.length === 0) {
      // Không có ảnh → giữ PENDING
      console.log(`ℹ️  Hồ sơ ${registrationId} không có ảnh minh chứng`);
      return null;
    }

    console.log(`🔍 Xác thực ${urls.length} ảnh cho hồ sơ ${registrationId}...`);

    // Xác thực từng ảnh
    const imageResults = [];
    for (const url of urls) {
      const fileId = DriveService.extractFileId(url);
      let result;

      try {
        const downloaded = await DriveService.downloadImage(url);

        // Định dạng không hỗ trợ → đánh SUSPECT ngay
        if (downloaded.unsupported) {
          result = {
            url,
            fileId,
            status: 'SUSPECT',
            vision_score: 0.1,
            vision_reasons: [downloaded.reason],
          };
        } else {
          result = await VisionService.validateImageBuffer(downloaded.buffer);
          result.url = url;
          result.fileId = fileId;
        }
      } catch (err) {
        console.warn(`⚠️  Lỗi xử lý ảnh ${url}: ${err.message}`);
        result = {
          url,
          fileId,
          status: 'ERROR',
          vision_score: null,
          vision_reasons: [err.message],
        };
      }

      imageResults.push(result);
    }

    // Tổng hợp status toàn hồ sơ
    const overallStatus = VisionService.aggregateStatus(imageResults);
    const validScores = imageResults.filter((r) => r.vision_score !== null).map((r) => r.vision_score);
    const avgScore = validScores.length > 0
      ? parseFloat((validScores.reduce((a, b) => a + b, 0) / validScores.length).toFixed(3))
      : null;

    // Gộp tất cả reasons
    const allReasons = imageResults.flatMap((r, i) =>
      (r.vision_reasons || []).map((reason) => `Ảnh ${i + 1}: ${reason}`)
    );

    // Cập nhật DB
    const updatedEvidenceImages = imageResults.map((r) => ({
      url: r.url,
      fileId: r.fileId,
      status: r.status,
      vision_score: r.vision_score,
      vision_reasons: r.vision_reasons,
      validated_at: new Date().toISOString(),
    }));

    await RegisterFormDAO.update(registrationId, {
      evidence_images: JSON.stringify(updatedEvidenceImages),
      vision_status: overallStatus,
      vision_score: avgScore,
      vision_reasons: JSON.stringify(allReasons),
    });

    const duration = Date.now() - startTime;
    console.log(`✅ Hồ sơ ${registrationId}: ${overallStatus} (score=${avgScore}, ${duration}ms)`);

    // Ghi log
    try {
      await LogSystemDAO.log(
        adminId,
        'VISION_VALIDATE',
        'register_forms',
        registrationId,
        { vision_status: 'PENDING' },
        { vision_status: overallStatus, vision_score: avgScore, duration_ms: duration },
        null
      );
    } catch (logErr) {
      console.warn('⚠️  Ghi log vision thất bại:', logErr.message);
    }

    return { vision_status: overallStatus, vision_score: avgScore, vision_reasons: allReasons };
  } catch (err) {
    console.error(`❌ validateRegistrationImages(${registrationId}): ${err.message}`);

    // Đánh dấu ERROR trong DB để admin biết
    try {
      await RegisterFormDAO.update(registrationId, {
        vision_status: 'ERROR',
        vision_reasons: JSON.stringify([`Lỗi xác thực: ${err.message}`]),
      });
    } catch {}

    return null;
  }
}

/**
 * Xác thực batch nhiều hồ sơ (async, không block)
 * Chạy tối đa MAX_CONCURRENT hồ sơ song song
 * @param {string[]} registrationIds
 * @param {string} [adminId]
 */
async function validateBatch(registrationIds, adminId = 'system') {
  if (!VisionService.VISION_ENABLED || registrationIds.length === 0) return;

  console.log(`🚀 Bắt đầu xác thực batch ${registrationIds.length} hồ sơ (max ${MAX_CONCURRENT} song song)...`);

  // Chia thành chunks
  for (let i = 0; i < registrationIds.length; i += MAX_CONCURRENT) {
    const chunk = registrationIds.slice(i, i + MAX_CONCURRENT);
    await Promise.allSettled(
      chunk.map((id) => validateRegistrationImages(id, adminId))
    );
  }

  console.log(`✅ Hoàn tất batch xác thực ${registrationIds.length} hồ sơ`);
}

module.exports = { validateRegistrationImages, validateBatch, parseEvidenceUrls };
