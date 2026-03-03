// ===== DATABASE MODULE - SQLite với better-sqlite3 =====
const Database = require('better-sqlite3');
const path = require('path');

// Tạo/mở file database trong folder database/
const dbPath = path.join(__dirname, '..', 'database', 'robot_logs.db');
const db = new Database(dbPath);

// Bật WAL mode để tăng hiệu suất
db.pragma('journal_mode = WAL');

// Tạo bảng logs nếu chưa có
db.exec(`
  CREATE TABLE IF NOT EXISTS logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME DEFAULT (datetime('now', 'localtime')),
    type TEXT NOT NULL,
    action TEXT NOT NULL,
    detail TEXT,
    source TEXT DEFAULT 'system'
  )
`);

// Tạo index để tìm kiếm nhanh theo type và timestamp
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_logs_type ON logs(type);
  CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp DESC);
`);

// ===== Các hàm thao tác database =====

// Thêm log mới
const insertLog = db.prepare(`
  INSERT INTO logs (type, action, detail, source) VALUES (?, ?, ?, ?)
`);

function addLog(type, action, detail = '', source = 'system') {
  try {
    return insertLog.run(type, action, detail, source);
  } catch (err) {
    console.error('Database error (addLog):', err.message);
  }
}

// Lấy danh sách logs (có phân trang và lọc)
function getLogs({ page = 1, limit = 20, type = '', search = '' } = {}) {
  const offset = (page - 1) * limit;
  let where = 'WHERE 1=1';
  const params = [];

  if (type) {
    where += ' AND type = ?';
    params.push(type);
  }
  if (search) {
    where += ' AND (action LIKE ? OR detail LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  const countStmt = db.prepare(`SELECT COUNT(*) as total FROM logs ${where}`);
  const total = countStmt.get(...params).total;

  const dataStmt = db.prepare(`
    SELECT * FROM logs ${where} ORDER BY id DESC LIMIT ? OFFSET ?
  `);
  const logs = dataStmt.all(...params, limit, offset);

  return {
    logs,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit)
  };
}

// Lấy thống kê
function getStats() {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  const totalLogs = db.prepare('SELECT COUNT(*) as count FROM logs').get().count;
  const todayLogs = db.prepare(
    "SELECT COUNT(*) as count FROM logs WHERE date(timestamp) = date('now', 'localtime')"
  ).get().count;

  const byType = db.prepare(`
    SELECT type, COUNT(*) as count FROM logs GROUP BY type ORDER BY count DESC
  `).all();

  const recentCommands = db.prepare(`
    SELECT action, COUNT(*) as count FROM logs 
    WHERE type = 'command' 
    GROUP BY action ORDER BY count DESC LIMIT 5
  `).all();

  return { totalLogs, todayLogs, byType, recentCommands };
}

// Xóa 1 log theo id
function deleteLog(id) {
  return db.prepare('DELETE FROM logs WHERE id = ?').run(id);
}

// Xóa tất cả logs
function clearAllLogs() {
  return db.prepare('DELETE FROM logs').run();
}

// Đóng database khi tắt server
function closeDB() {
  db.close();
}

module.exports = { addLog, getLogs, getStats, deleteLog, clearAllLogs, closeDB };
