// ===== APP.JS - Main Application Controller =====

let currentPage = 'home';

// Page loader - Load HTML from pages folder
async function loadPage(pageName, clickedElement = null) {
  try {
    const response = await fetch(`pages/${pageName}.html`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const html = await response.text();
    
    // Update content
    document.getElementById('content-wrapper').innerHTML = html;
    
    // Update active nav link
    document.querySelectorAll('.nav-link').forEach(link => {
      link.classList.remove('active');
    });
    
    // Find and activate the correct nav link
    if (clickedElement) {
      clickedElement.classList.add('active');
    } else {
      document.querySelectorAll('.nav-link').forEach(link => {
        if (link.getAttribute('onclick').includes(pageName)) {
          link.classList.add('active');
        }
      });
    }
    
    // Store current page
    currentPage = pageName;
    
    // Initialize page-specific functions
    switch (pageName) {
      case 'home':
        initHomePage();
        break;
      case 'airquality':
        setTimeout(() => {
          if (typeof L !== 'undefined') {
            initAirQualityMap();
          }
        }, 100);
        break;
      case 'logs':
        initLogsPage();
        break;
      case 'chat':
        initChatPage();
        break;
    }
    
    console.log(`Loaded page: ${pageName}`);
  } catch (error) {
    console.error('Error loading page:', error);
    document.getElementById('content-wrapper').innerHTML = 
      '<div class="placeholder-content"><h2>❌ Lỗi tải trang</h2><p>Không thể tải nội dung trang.</p></div>';
  }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
  // Load home page initially
  loadPage('home');
  
  // Auto refresh camera every 500ms
  setInterval(refreshCamera, 500);

  // Update dust level every 5 seconds
  setInterval(updateDustLevel, 5000);

  // Update real-time clock every second
  setInterval(updateRealTimeClock, 1000);

  // Initial connection check
  setTimeout(() => {
    sendCommand('stop');
  }, 1000);
});
