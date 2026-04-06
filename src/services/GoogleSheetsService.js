/**
 * GoogleSheetsService.js
 * Đọc dữ liệu từ Google Sheets bằng 5 service accounts (round-robin)
 */

const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');

// Load 5 service accounts
const ACCOUNTS_DIR = path.join(__dirname, '../config/accounts');
const ACCOUNT_FILES = ['acc1.json', 'acc2.json', 'acc3.json', 'acc4.json', 'acc5.json'];

const serviceAccounts = ACCOUNT_FILES.map((file) => {
  const filePath = path.join(ACCOUNTS_DIR, file);
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (err) {
    console.warn(`⚠️ Không load được service account ${file}: ${err.message}`);
    return null;
  }
}).filter(Boolean);

// Danh sách email service accounts để hiển thị cho admin
const SERVICE_ACCOUNT_EMAILS = serviceAccounts.map((acc) => acc.client_email);

// Index dùng round-robin
let currentAccountIndex = 0;

/**
 * Lấy Sheets client của account tiếp theo (round-robin)
 */
function getNextSheetsClient() {
  if (serviceAccounts.length === 0) {
    throw new Error('Không có service account nào được load. Kiểm tra thư mục src/config/accounts/');
  }

  const account = serviceAccounts[currentAccountIndex % serviceAccounts.length];
  currentAccountIndex++;

  const auth = new google.auth.GoogleAuth({
    credentials: account,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  return google.sheets({ version: 'v4', auth });
}

/**
 * Parse spreadsheetId từ nhiều dạng URL Google Sheets
 * Hỗ trợ:
 *   https://docs.google.com/spreadsheets/d/SHEET_ID/edit#gid=0
 *   https://docs.google.com/spreadsheets/d/SHEET_ID/edit
 *   https://docs.google.com/spreadsheets/d/SHEET_ID
 *   SHEET_ID (paste thẳng ID)
 */
function parseSpreadsheetId(url) {
  if (!url || typeof url !== 'string') {
    throw new Error('URL không hợp lệ');
  }

  const trimmed = url.trim();

  // Nếu là URL đầy đủ
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (match) return match[1];

  // Nếu dán thẳng spreadsheetId (không có dấu /)
  if (/^[a-zA-Z0-9_-]+$/.test(trimmed)) return trimmed;

  throw new Error('Không tìm được Spreadsheet ID từ URL. Vui lòng dán đúng link Google Sheets.');
}

/**
 * Đọc toàn bộ dữ liệu từ Google Sheet
 * @param {string} sheetUrl - URL hoặc ID của Google Sheets
 * @param {string} [range='Sheet1'] - Tên sheet hoặc range (mặc định lấy tất cả)
 * @returns {Promise<Array<Object>>} Mảng object, mỗi object là 1 hàng với key là tên cột header
 */
async function readSheet(sheetUrl, range) {
  const spreadsheetId = parseSpreadsheetId(sheetUrl);
  console.log(`📊 Đọc Google Sheets ID: ${spreadsheetId}`);

  const sheetsClient = getNextSheetsClient();
  console.log(`🔑 Dùng service account: ${serviceAccounts[(currentAccountIndex - 1) % serviceAccounts.length].client_email}`);

  // Bước 1: Lấy thông tin sheet để biết tên sheet đầu tiên nếu không truyền range
  let sheetRange = range;
  if (!sheetRange) {
    try {
      const metaRes = await sheetsClient.spreadsheets.get({ spreadsheetId });
      const firstSheet = metaRes.data.sheets?.[0]?.properties?.title || 'Sheet1';
      sheetRange = firstSheet;
      console.log(`📋 Sheet đầu tiên: "${firstSheet}"`);
    } catch (err) {
      sheetRange = 'Sheet1';
      console.warn('⚠️ Không lấy được tên sheet, thử dùng "Sheet1"');
    }
  }

  // Bước 2: Lấy dữ liệu
  const response = await sheetsClient.spreadsheets.values.get({
    spreadsheetId,
    range: sheetRange,
    valueRenderOption: 'FORMATTED_VALUE', // Lấy giá trị hiển thị (đã format)
    dateTimeRenderOption: 'FORMATTED_STRING',
  });

  const rows = response.data.values;
  if (!rows || rows.length === 0) {
    throw new Error('Google Sheet trống hoặc không có dữ liệu');
  }

  // Bước 3: Hàng đầu tiên là header
  const headers = rows[0].map((h) => (h || '').toString().trim());
  console.log(`📋 Headers: ${headers.join(', ')}`);
  console.log(`📊 Số dòng dữ liệu: ${rows.length - 1}`);

  // Chuyển các hàng còn lại thành array of objects
  const data = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const obj = {};
    headers.forEach((header, idx) => {
      obj[header] = (row[idx] !== undefined && row[idx] !== null) ? row[idx].toString() : '';
    });
    // Bỏ qua các hàng hoàn toàn rỗng
    const hasData = Object.values(obj).some((v) => v.trim() !== '');
    if (hasData) {
      data.push(obj);
    }
  }

  console.log(`✅ Đọc được ${data.length} hàng dữ liệu hợp lệ`);
  if (data.length > 0) {
    console.log('📋 Preview hàng đầu:', JSON.stringify(data[0]).substring(0, 200));
  }

  return data;
}

module.exports = {
  readSheet,
  parseSpreadsheetId,
  SERVICE_ACCOUNT_EMAILS,
};
