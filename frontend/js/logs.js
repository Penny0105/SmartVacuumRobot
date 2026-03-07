// ===== LOGS PAGE - Nhật ký hoạt động =====

let logsCurrentPage = 1;
let logsTotalPages = 1;

function initLogsPage() {
  console.log('Logs page initialized');
  loadSessions(1);
  loadSessionStats();
}

// Lấy danh sách sessions từ server
function loadSessions(page = 1) {
  logsCurrentPage = page;
  const mode = document.getElementById('filter-mode')?.value || '';
  const params = new URLSearchParams({ page, limit: 15, mode });

  fetch(`/api/sessions?${params}`)
    .then(res => res.json())
    .then(data => {
      renderSessions(data.sessions);
      logsTotalPages = data.totalPages || 1;
      updatePagination(data);
      const statusEl = document.getElementById('logs-status');
      if (statusEl) statusEl.textContent = `${data.total} phiên hoạt động`;
    })
    .catch(err => {
      console.error('Error loading sessions:', err);
      const tbody = document.getElementById('logs-tbody');
      if (tbody) tbody.innerHTML = '<tr><td colspan="7" class="logs-empty">❌ Lỗi tải nhật ký</td></tr>';
    });
}

// Render bảng sessions
function renderSessions(sessions) {
  const tbody = document.getElementById('logs-tbody');
  if (!tbody) return;

  if (!sessions || sessions.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="logs-empty">📭 Chưa có nhật ký nào</td></tr>';
    return;
  }

  tbody.innerHTML = sessions.map(s => `
    <tr class="log-row">
      <td class="log-id">${s.id}</td>
      <td><span class="log-badge badge-${s.mode}">${s.mode === 'auto' ? '⚡ Tự động' : '🎮 Từ xa'}</span></td>
      <td class="log-time">${formatDateTime(s.start_time)}</td>
      <td class="log-time">${s.end_time ? formatDateTime(s.end_time) : '—'}</td>
      <td class="log-action">${formatDuration(s.duration)}</td>
      <td class="log-action">${formatDistance(s.distance)}</td>
      <td><button class="log-delete-btn" onclick="deleteOneSession(${s.id})" title="Xóa">✕</button></td>
    </tr>
  `).join('');
}

// Lấy thống kê
function loadSessionStats() {
  fetch('/api/sessions/stats')
    .then(res => res.json())
    .then(stats => {
      const totalEl = document.getElementById('stat-total');
      const todayEl = document.getElementById('stat-today');
      const distEl = document.getElementById('stat-distance');
      const durEl = document.getElementById('stat-duration');

      if (totalEl) totalEl.textContent = stats.totalSessions;
      if (todayEl) todayEl.textContent = stats.todaySessions;
      if (distEl) distEl.textContent = formatDistance(stats.totalDistance);
      if (durEl) durEl.textContent = formatDuration(stats.totalDuration);
    })
    .catch(err => console.error('Error loading stats:', err));
}

// Format thời gian: DD/MM HH:MM:SS
function formatDateTime(timestamp) {
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return timestamp;
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  const s = String(date.getSeconds()).padStart(2, '0');
  return `${day}/${month} ${h}:${m}:${s}`;
}

// Format thời lượng: HH:MM:SS
function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return '00:00:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// Format quãng đường
function formatDistance(meters) {
  if (!meters || meters <= 0) return '0';
  if (meters >= 1000) return (meters / 1000).toFixed(2) + ' km';
  return meters.toFixed(2) + ' m';
}

// Cập nhật phân trang
function updatePagination(data) {
  const pageInfo = document.getElementById('page-info');
  const btnPrev = document.getElementById('btn-prev');
  const btnNext = document.getElementById('btn-next');

  if (pageInfo) pageInfo.textContent = `Trang ${data.page}/${data.totalPages || 1}`;
  if (btnPrev) btnPrev.disabled = data.page <= 1;
  if (btnNext) btnNext.disabled = data.page >= data.totalPages;
}

// Chuyển trang
function changePage(direction) {
  const newPage = logsCurrentPage + direction;
  if (newPage >= 1 && newPage <= logsTotalPages) {
    loadSessions(newPage);
  }
}

// Lọc theo chế độ
function filterSessions() {
  loadSessions(1);
}

// Xóa 1 session
function deleteOneSession(id) {
  fetch(`/api/sessions/${id}`, { method: 'DELETE' })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        loadSessions(logsCurrentPage);
        loadSessionStats();
      }
    })
    .catch(err => console.error('Error deleting session:', err));
}

// Xóa tất cả (có xác nhận)
function confirmClearSessions() {
  if (confirm('⚠️ Bạn có chắc muốn xóa TẤT CẢ nhật ký?\nHành động này không thể hoàn tác!')) {
    fetch('/api/sessions', { method: 'DELETE' })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          loadSessions(1);
          loadSessionStats();
        }
      })
      .catch(err => console.error('Error clearing sessions:', err));
  }
}
