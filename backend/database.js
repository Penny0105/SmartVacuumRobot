// ===== DATABASE MODULE - SQLite với better-sqlite3 =====
const Database = require('better-sqlite3');
const path = require('path');

// Tạo/mở file database trong folder database/
const dbPath = path.join(__dirname, '..', 'database', 'robot_logs.db');
const db = new Database(dbPath);

// Bật WAL mode để tăng hiệu suất
db.pragma('journal_mode = WAL');

// Tạo bảng sessions - lưu phiên hoạt động (tự động / điều khiển từ xa)
db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mode TEXT NOT NULL CHECK(mode IN ('auto', 'manual')),
    start_time DATETIME DEFAULT (datetime('now', 'localtime')),
    end_time DATETIME,
    duration INTEGER DEFAULT 0,
    distance REAL DEFAULT 0.0,
    status TEXT DEFAULT 'active' CHECK(status IN ('active', 'ended'))
  )
`);

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_sessions_mode ON sessions(mode);
  CREATE INDEX IF NOT EXISTS idx_sessions_start ON sessions(start_time DESC);
`);

// ===== Các hàm thao tác database =====

// Bắt đầu phiên hoạt động mới
const insertSession = db.prepare(`
  INSERT INTO sessions (mode) VALUES (?)
`);

function startSession(mode) {
  try {
    const result = insertSession.run(mode);
    return result.lastInsertRowid;
  } catch (err) {
    console.error('Database error (startSession):', err.message);
    return null;
  }
}

// Kết thúc phiên hoạt động
const updateSession = db.prepare(`
  UPDATE sessions 
  SET end_time = datetime('now', 'localtime'), 
      duration = ?, 
      distance = ?,
      status = 'ended'
  WHERE id = ?
`);

function endSession(id, duration, distance) {
  try {
    return updateSession.run(duration, distance, id);
  } catch (err) {
    console.error('Database error (endSession):', err.message);
  }
}

// Lấy danh sách sessions (có phân trang và lọc theo mode)
function getSessions({ page = 1, limit = 15, mode = '' } = {}) {
  const offset = (page - 1) * limit;
  let where = "WHERE status = 'ended'";
  const params = [];

  if (mode) {
    where += ' AND mode = ?';
    params.push(mode);
  }

  const total = db.prepare(`SELECT COUNT(*) as total FROM sessions ${where}`).get(...params).total;

  const sessions = db.prepare(`
    SELECT * FROM sessions ${where} ORDER BY id DESC LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  return {
    sessions,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit)
  };
}

// Lấy thống kê tổng hợp
function getSessionStats() {
  const totalSessions = db.prepare("SELECT COUNT(*) as count FROM sessions WHERE status = 'ended'").get().count;
  
  const todaySessions = db.prepare(
    "SELECT COUNT(*) as count FROM sessions WHERE status = 'ended' AND date(start_time) = date('now', 'localtime')"
  ).get().count;

  const totalDistance = db.prepare(
    "SELECT COALESCE(SUM(distance), 0) as total FROM sessions WHERE status = 'ended'"
  ).get().total;

  const totalDuration = db.prepare(
    "SELECT COALESCE(SUM(duration), 0) as total FROM sessions WHERE status = 'ended'"
  ).get().total;

  const byMode = db.prepare(`
    SELECT mode, COUNT(*) as count, COALESCE(SUM(distance), 0) as totalDistance, 
           COALESCE(SUM(duration), 0) as totalDuration
    FROM sessions WHERE status = 'ended' GROUP BY mode
  `).all();

  return { totalSessions, todaySessions, totalDistance, totalDuration, byMode };
}

// Xóa 1 session
function deleteSession(id) {
  return db.prepare('DELETE FROM sessions WHERE id = ?').run(id);
}

// Xóa tất cả sessions
function clearAllSessions() {
  return db.prepare('DELETE FROM sessions').run();
}

// Đóng database khi tắt server
function closeDB() {
  db.close();
}

module.exports = { 
  startSession, endSession, getSessions, getSessionStats, 
  deleteSession, clearAllSessions, closeDB 
};
