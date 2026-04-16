/**
 * DriveService.js
 * Tải ảnh từ Google Drive về dạng Buffer, dùng service accounts hiện có.
 */

const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');

const ACCOUNTS_DIR = path.join(__dirname, '../config/accounts');
const ACCOUNT_FILES = ['acc1.json', 'acc2.json', 'acc3.json', 'acc4.json', 'acc5.json'];

const MAX_IMAGE_SIZE = 20 * 1024 * 1024; // 20MB

// Load service accounts (tái sử dụng từ GoogleSheetsService)
const serviceAccounts = ACCOUNT_FILES.map((file) => {
  try {
    return JSON.parse(fs.readFileSync(path.join(ACCOUNTS_DIR, file), 'utf8'));
  } catch {
    return null;
  }
}).filter(Boolean);

let driveAccountIndex = 0;

function getDriveClient() {
  if (serviceAccounts.length === 0) {
    throw new Error('Không có service account nào. Kiểm tra src/config/accounts/');
  }
  const account = serviceAccounts[driveAccountIndex % serviceAccounts.length];
  driveAccountIndex++;

  const auth = new google.auth.GoogleAuth({
    credentials: account,
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  });
  return google.drive({ version: 'v3', auth });
}

/**
 * Trích xuất FILE_ID từ các dạng URL Google Drive
 * Hỗ trợ:
 *   https://drive.google.com/open?id=FILE_ID
 *   https://drive.google.com/file/d/FILE_ID/view
 *   https://drive.google.com/uc?id=FILE_ID
 *   https://docs.google.com/...?id=FILE_ID
 */
function extractFileId(url) {
  if (!url) return null;
  const str = url.toString().trim();

  // /file/d/FILE_ID/
  let m = str.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (m) return m[1];

  // ?id=FILE_ID hoặc &id=FILE_ID
  m = str.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (m) return m[1];

  // open?id=FILE_ID
  m = str.match(/open\?id=([a-zA-Z0-9_-]+)/);
  if (m) return m[1];

  return null;
}

/**
 * Tải ảnh từ Google Drive về Buffer
 * @param {string} driveUrl - URL Google Drive
 * @returns {Promise<{ buffer: Buffer, mimeType: string, fileId: string }>}
 */
async function downloadImage(driveUrl) {
  const fileId = extractFileId(driveUrl);
  if (!fileId) {
    throw new Error(`DRIVE_ACCESS_ERROR: Không trích xuất được FILE_ID từ URL: ${driveUrl}`);
  }

  const drive = getDriveClient();

  // Kiểm tra metadata trước (size, mimeType)
  let metadata;
  try {
    const meta = await drive.files.get({
      fileId,
      fields: 'size,mimeType,name',
    });
    metadata = meta.data;
  } catch (err) {
    throw new Error(`DRIVE_ACCESS_ERROR: Không truy cập được file ${fileId}: ${err.message}`);
  }

  const fileSize = parseInt(metadata.size || 0);
  if (fileSize > MAX_IMAGE_SIZE) {
    throw new Error(`IMAGE_TOO_LARGE: File ${metadata.name} vượt quá 20MB (${(fileSize / 1024 / 1024).toFixed(1)}MB)`);
  }

  // Tải file về
  const response = await drive.files.get(
    { fileId, alt: 'media' },
    { responseType: 'arraybuffer' }
  );

  const buffer = Buffer.from(response.data);
  return {
    buffer,
    mimeType: metadata.mimeType || 'image/jpeg',
    fileId,
  };
}

module.exports = { downloadImage, extractFileId };
