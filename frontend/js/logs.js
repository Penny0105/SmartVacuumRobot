// ===== LOGS PAGE - Nhật ký hoạt động =====

let logsCurrentPage = 1;
let logsTotalPages = 1;
let logsDebounceTimer = null;
let logsAutoRefreshInterval = null;

function initLogsPage() {
  console.log('Logs page initialized');
  loadLogs(1);
  loadStats();
  // Auto-refresh mỗi 10 giây
  logsAutoRefreshInterval = setInterval(() => {
    if (currentPage === 'logs') {
      loadLogs(logsCurrentPage);
      loadStats();
    }
  }, 10000);
}

// Lấy danh sách logs từ server
function loadLogs(page = 1) {
  logsCurrentPage = page;
  const type = document.getElementById('filter-type')?.value || '';
  const search = document.getElementById('filter-search')?.value || '';

  const params = new URLSearchParams({ page, limit: 20, type, search });

  fetch(`/api/logs?${params}`)
    .then(res => res.json())
    .then(data => {
      renderLogs(data.logs);
      logsTotalPages = data.totalPages || 1;
      updatePagination(data);
      const statusEl = document.getElementById('logs-status');
      if (statusEl) statusEl.textContent = `${data.total} sự kiện`;
    })
    .catch(err => {
      console.error('Error loading logs:', err);
      const tbody = document.getElementById('logs-tbody');
      if (tbody) tbody.innerHTML = '<tr><td colspan="7" class="logs-empty">❌ Lỗi tải nhật ký</td></tr>';
    });
}

// Render bảng logs
function renderLogs(logs) {
  const tbody = document.getElementById('logs-tbody');
  if (!tbody) return;

  if (!logs || logs.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="logs-empty">📭 Chưa có nhật ký nào</td></tr>';
    return;
  }

  tbody.innerHTML = logs.map(log => `
    <tr class="log-row log-type-${log.type}">
      <td class="log-id">${log.id}</td>
      <td class="log-time">${formatTime(log.timestamp)}</td>
      <td><span class="log-badge badge-${log.type}">${getTypeLabel(log.type)}</span></td>
      <td class="log-action">${log.action}</td>
      <td class="log-detail">${log.detail || '—'}</td>
      <td><span class="log-source source-${log.source}">${getSourceLabel(log.source)}</span></td>
      <td><button class="log-delete-btn" onclick="deleteSingleLog(${log.id})" title="Xóa">✕</button></td>
    </tr>
  `).join('');
}

// Lấy thống kê
function loadStats() {
  fetch('/api/logs/stats')
    .then(res => res.json())
    .then(stats => {
      const totalEl = document.getElementById('stat-total');
      const todayEl = document.getElementById('stat-today');
      const topCmdEl = document.getElementById('stat-top-cmd');

      if (totalEl) totalEl.textContent = stats.totalLogs;
      if (todayEl) todayEl.textContent = stats.todayLogs;
      if (topCmdEl) {
        topCmdEl.textContent = stats.recentCommands.length > 0
          ? stats.recentCommands[0].action
          : '--';
      }
    })
    .catch(err => console.error('Error loading stats:', err));
}

// Format thời gian
function formatTime(timestamp) {
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return timestamp; // Trả về raw nếu parse lỗi
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${day}/${month} ${hours}:${minutes}:${seconds}`;
}

// Label cho loại sự kiện
function getTypeLabel(type) {
  const labels = {
    'command': '🎮 Lệnh',
    'mode': '⚙️ Chế độ',
    'connection': '📡 Kết nối',
    'system': '💻 Hệ thống'
  };
  return labels[type] || type;
}

// Label cho nguồn
function getSourceLabel(source) {
  const labels = {
    'web': '🌐 Web',
    'esp32': '📟 ESP32',
    'system': '💻 Server'
  };
  return labels[source] || source;
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
    loadLogs(newPage);
  }
}

// Lọc theo loại
function filterLogs() {
  loadLogs(1);
}

// Tìm kiếm với debounce 500ms
function debounceSearch() {
  clearTimeout(logsDebounceTimer);
  logsDebounceTimer = setTimeout(() => loadLogs(1), 500);
}

// Xóa 1 log
function deleteSingleLog(id) {
  fetch(`/api/logs/${id}`, { method: 'DELETE' })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        loadLogs(logsCurrentPage);
        loadStats();
      }
    })
    .catch(err => console.error('Error deleting log:', err));
}

// Xóa tất cả (có xác nhận)
function confirmClearLogs() {
  if (confirm('⚠️ Bạn có chắc muốn xóa TẤT CẢ nhật ký?\nHành động này không thể hoàn tác!')) {
    fetch('/api/logs', { method: 'DELETE' })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          loadLogs(1);
          loadStats();
        }
      })
      .catch(err => console.error('Error clearing logs:', err));
  }
}
