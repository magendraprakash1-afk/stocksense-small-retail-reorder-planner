/* ========================================
   StockSense Management — App Controller
   Navigation, state management, UI framework
   ======================================== */

const App = (() => {
  let currentPage = 'overview';
  let sidebarCollapsed = false;
  let toastId = 0;

  // ── Page modules registry ──
  const pages = {};

  function registerPage(name, module) {
    pages[name] = module;
  }

  // ── Initialize ──
  function init() {
    initTheme();
    initSidebar();
    initTopbar();
    initNotifications();
    initGlobalSearch();
    initMobileMenu();

    // Ensure all static sidebar & topbar icons are initialized
    if (window.lucide) lucide.createIcons();

    // Navigate to overview by default
    const hash = window.location.hash.slice(1) || 'overview';
    navigateTo(hash);

    // Listen for hash changes
    window.addEventListener('hashchange', () => {
      const page = window.location.hash.slice(1) || 'overview';
      navigateTo(page);
    });

    // Global click handler for dropdowns
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.dropdown')) {
        document.querySelectorAll('.dropdown-menu.active').forEach(m => m.classList.remove('active'));
      }
      if (!e.target.closest('.notification-dropdown') && !e.target.closest('#notificationBtn')) {
        const nd = document.querySelector('.notification-dropdown');
        if (nd) nd.classList.remove('active');
      }
    });

    console.log('%c🏪 StockSense Management loaded', 'color: #059669; font-weight: bold; font-size: 14px;');
  }

  // ── Theme ──
  function initTheme() {
    const theme = API.Settings.getTheme();
    document.documentElement.setAttribute('data-theme', theme);
    updateThemeIcon(theme);
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    API.Settings.setTheme(next);
    updateThemeIcon(next);
    showToast('info', 'Theme Changed', `Switched to ${next} mode`);
  }

  function updateThemeIcon(theme) {
    const btn = document.getElementById('themeToggle');
    if (!btn) return;
    btn.innerHTML = theme === 'dark'
      ? '<i data-lucide="sun"></i>'
      : '<i data-lucide="moon"></i>';
    lucide.createIcons();
  }

  // ── Sidebar ──
  function initSidebar() {
    const savedCollapsed = API.Settings.get('sidebarCollapsed', false);
    if (savedCollapsed) {
      sidebarCollapsed = true;
      document.querySelector('.app-layout')?.classList.add('sidebar-collapsed');
    }

    // Nav items click
    document.querySelectorAll('.nav-item[data-page]').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const page = item.dataset.page;
        navigateTo(page);
        // Close mobile sidebar
        document.querySelector('.sidebar')?.classList.remove('mobile-open');
        document.querySelector('.sidebar-mobile-overlay')?.classList.remove('active');
      });
    });

    // Toggle button
    const toggleBtn = document.querySelector('.sidebar-toggle');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        sidebarCollapsed = !sidebarCollapsed;
        document.querySelector('.app-layout')?.classList.toggle('sidebar-collapsed', sidebarCollapsed);
        API.Settings.set('sidebarCollapsed', sidebarCollapsed);
        // Update toggle icon
        toggleBtn.innerHTML = sidebarCollapsed
          ? '<i data-lucide="chevron-right"></i>'
          : '<i data-lucide="chevron-left"></i>';
        lucide.createIcons();
      });
    }

    // User info
    const user = API.Auth.getUser() || { name: DemoData.shopConfig.owner, role: 'Owner' };
    const userNameEl = document.querySelector('.sidebar-user-info .name');
    const userInitialsEl = document.querySelector('.sidebar-user-avatar');
    const shopNameEl = document.querySelector('.sidebar-brand span');
    if (userNameEl) userNameEl.textContent = user.name;
    if (userInitialsEl) userInitialsEl.textContent = user.name.split(' ').map(n => n[0]).join('').toUpperCase();
    if (shopNameEl) shopNameEl.textContent = DemoData.shopConfig.name;

    // Render sidebar icons
    if (window.lucide) lucide.createIcons();
  }

  function initMobileMenu() {
    const menuBtn = document.querySelector('.mobile-menu-btn');
    const overlay = document.querySelector('.sidebar-mobile-overlay');

    if (menuBtn) {
      menuBtn.addEventListener('click', () => {
        document.querySelector('.sidebar')?.classList.toggle('mobile-open');
        overlay?.classList.toggle('active');
      });
    }

    if (overlay) {
      overlay.addEventListener('click', () => {
        document.querySelector('.sidebar')?.classList.remove('mobile-open');
        overlay.classList.remove('active');
      });
    }
  }

  // ── Dynamic Reorder Calculation & Badges ──
  function updateReorderBadges() {
    if (!window.DataStore || !DataStore.products) return;

    const plan = DataStore.calculateFullReorderPlan();
    const reorderCount = plan.itemsToOrderCount;
    const criticalCount = plan.criticalCount;

    // Update Sidebar Navigation Badge
    const navBadge = document.getElementById('reorderNavBadge');
    if (navBadge) {
      if (reorderCount > 0) {
        navBadge.style.display = 'inline-block';
        navBadge.textContent = reorderCount;
        navBadge.style.background = criticalCount > 0 ? 'var(--color-danger)' : 'var(--color-warning)';
        navBadge.title = `${reorderCount} products require replenishment (${criticalCount} critical)`;
      } else {
        navBadge.style.display = 'none';
      }
    }

    // Update Topbar Reorder Count Badge
    const topbarCount = document.getElementById('topbarReorderCount');
    if (topbarCount) {
      if (reorderCount > 0) {
        topbarCount.style.display = 'inline-flex';
        topbarCount.textContent = reorderCount;
        topbarCount.className = `badge ${criticalCount > 0 ? 'badge-danger' : 'badge-warning'}`;
      } else {
        topbarCount.style.display = 'none';
      }
    }
  }

  // ── Topbar ──
  function initTopbar() {
    // Theme toggle
    const themeBtn = document.getElementById('themeToggle');
    if (themeBtn) themeBtn.addEventListener('click', toggleTheme);

    // Generate Reorder Plan button
    const reorderBtn = document.getElementById('generateReorderBtn');
    if (reorderBtn) {
      reorderBtn.addEventListener('click', () => navigateTo('reorder'));
    }

    // Shop selector
    const shopSelect = document.querySelector('.topbar-shop-select');
    if (shopSelect) {
      shopSelect.querySelector('span').textContent = DataStore.shopConfig.name;
    }

    // Listen for data changes
    window.addEventListener('stocksense:data-changed', () => {
      if (shopSelect) shopSelect.querySelector('span').textContent = DataStore.shopConfig.name;
      const unreadCount = DataStore.notifications.filter(n => !n.read).length;
      const badge = document.querySelector('#notificationBtn .badge');
      if (badge) badge.style.display = unreadCount > 0 ? 'block' : 'none';
      updateReorderBadges();
    });

    window.addEventListener('stocksense:reorder-plan-calculated', updateReorderBadges);

    // Initial badge calculation
    setTimeout(updateReorderBadges, 100);
  }

  // ── Notifications ──
  function initNotifications() {
    const btn = document.getElementById('notificationBtn');
    const dropdown = document.querySelector('.notification-dropdown');
    if (!btn || !dropdown) return;

    const unreadCount = DemoData.notifications.filter(n => !n.read).length;
    const badge = btn.querySelector('.badge');
    if (badge) badge.style.display = unreadCount > 0 ? 'block' : 'none';

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdown.classList.toggle('active');
      renderNotifications();
    });

    function renderNotifications() {
      const list = dropdown.querySelector('.notification-list');
      if (!list) return;

      list.innerHTML = DemoData.notifications.map(n => `
        <div class="notification-item ${n.read ? '' : 'unread'}" data-id="${n.id}">
          <div class="notif-icon activity-icon ${n.type === 'critical' ? 'alert' : n.type === 'warning' ? 'order' : n.type === 'success' ? 'stock' : 'sale'}">
            <i data-lucide="${n.type === 'critical' ? 'alert-triangle' : n.type === 'warning' ? 'alert-circle' : n.type === 'success' ? 'check-circle' : 'info'}"></i>
          </div>
          <div class="notif-content">
            <div class="notif-title">${n.title}</div>
            <div class="notif-time">${n.message}</div>
            <div class="notif-time" style="margin-top:4px">${DemoData.formatRelativeTime(n.time)}</div>
          </div>
        </div>
      `).join('');
      lucide.createIcons();

      // Mark as read on click
      list.querySelectorAll('.notification-item').forEach(item => {
        item.addEventListener('click', () => {
          const notif = DemoData.notifications.find(n => n.id === item.dataset.id);
          if (notif) notif.read = true;
          item.classList.remove('unread');
        });
      });
    }
  }

  // ── Global Search ──
  function initGlobalSearch() {
    const input = document.querySelector('.topbar-search input');
    if (!input) return;

    let debounceTimer;
    input.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        const query = input.value.trim();
        if (query.length >= 2) {
          // Search products and navigate to inventory with filter
          navigateTo('inventory');
          if (pages.inventory && pages.inventory.setSearch) {
            pages.inventory.setSearch(query);
          }
        }
      }, 300);
    });

    // Enter key immediate search & command routing
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const query = input.value.trim().toLowerCase();
        if (!query) return;

        // Check if query is a direct page command
        const directPages = ['overview', 'inventory', 'forecast', 'reorder', 'sales', 'suppliers', 'reports', 'settings'];
        if (directPages.includes(query)) {
          navigateTo(query);
          return;
        }

        // Otherwise filter inventory
        navigateTo('inventory');
        if (pages.inventory && pages.inventory.setSearch) {
          pages.inventory.setSearch(input.value.trim());
        }
      }
    });

    // Ctrl+K shortcut for search focus & Alt+V / Ctrl+M for Voice Assistant
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        input.focus();
      }
      if (((e.ctrlKey || e.metaKey) && (e.key === 'm' || e.key === 'M')) || (e.altKey && (e.key === 'v' || e.key === 'V'))) {
        e.preventDefault();
        if (window.VoiceAssistant) {
          VoiceAssistant.openAssistantHud();
          VoiceAssistant.startListening();
        }
      }
    });
  }

  // ── Navigation ──
  function navigateTo(page) {
    // Update URL hash without triggering hashchange loop
    if (window.location.hash !== `#${page}`) {
      window.history.pushState(null, '', `#${page}`);
    }

    currentPage = page;

    // Update active nav item
    document.querySelectorAll('.nav-item[data-page]').forEach(item => {
      item.classList.toggle('active', item.dataset.page === page);
    });

    // Show page content
    const content = document.getElementById('pageContent');
    if (!content) return;

    // Show loading
    content.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;padding:80px 0"><div class="spinner" style="width:32px;height:32px"></div></div>';

    // Render page
    setTimeout(() => {
      if (pages[page]) {
        pages[page].render(content);
      } else {
        content.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon"><i data-lucide="construction"></i></div>
            <h3>${page.charAt(0).toUpperCase() + page.slice(1)}</h3>
            <p>This page is coming soon. Check back later!</p>
          </div>
        `;
      }
      lucide.createIcons();

      // Automatically translate page content to current language
      if (window.I18n && I18n.translateFullDOM) {
        I18n.translateFullDOM();
      }

      // Scroll to top
      content.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }

  // ── Toast Notifications ──
  function showToast(type, title, message, duration = 4000) {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const id = ++toastId;
    const iconMap = {
      success: 'check-circle',
      error: 'x-circle',
      warning: 'alert-triangle',
      info: 'info',
    };

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.dataset.id = id;
    toast.innerHTML = `
      <i data-lucide="${iconMap[type] || 'info'}" class="toast-icon"></i>
      <div class="toast-content">
        <div class="toast-title">${title}</div>
        <div class="toast-message">${message}</div>
      </div>
      <button class="toast-close" onclick="App.dismissToast(${id})">
        <i data-lucide="x"></i>
      </button>
      <div class="toast-progress"></div>
    `;

    container.appendChild(toast);
    lucide.createIcons();

    // Auto dismiss
    setTimeout(() => dismissToast(id), duration);
  }

  function dismissToast(id) {
    const toast = document.querySelector(`.toast[data-id="${id}"]`);
    if (!toast) return;
    toast.classList.add('removing');
    setTimeout(() => toast.remove(), 200);
  }

  // ── Modal System ──
  function showModal(options) {
    const { title, content, size = '', footer = '', onClose } = options;

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay active';
    overlay.innerHTML = `
      <div class="modal ${size}">
        <div class="modal-header">
          <h2>${title}</h2>
          <button class="modal-close"><i data-lucide="x"></i></button>
        </div>
        <div class="modal-body">${content}</div>
        ${footer ? `<div class="modal-footer">${footer}</div>` : ''}
      </div>
    `;

    document.body.appendChild(overlay);
    lucide.createIcons();

    const closeModal = () => {
      overlay.remove();
      if (onClose) onClose();
    };

    overlay.querySelector('.modal-close').addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });

    // Escape key
    const escHandler = (e) => {
      if (e.key === 'Escape') { closeModal(); document.removeEventListener('keydown', escHandler); }
    };
    document.addEventListener('keydown', escHandler);

    return { overlay, close: closeModal };
  }

  // ── Confirm Dialog ──
  function showConfirm(options) {
    return new Promise((resolve) => {
      const { title, message, confirmText = 'Confirm', cancelText = 'Cancel', type = 'danger' } = options;

      const iconMap = { danger: 'trash-2', warning: 'alert-triangle' };

      const modal = showModal({
        title: '',
        content: `
          <div class="confirm-icon ${type}">
            <i data-lucide="${iconMap[type] || 'alert-triangle'}"></i>
          </div>
          <h3>${title}</h3>
          <p>${message}</p>
        `,
        footer: `
          <button class="btn btn-secondary cancel-btn">${cancelText}</button>
          <button class="btn btn-${type} confirm-btn">${confirmText}</button>
        `,
        size: 'confirm-dialog',
      });

      modal.overlay.querySelector('.cancel-btn').addEventListener('click', () => {
        modal.close();
        resolve(false);
      });

      modal.overlay.querySelector('.confirm-btn').addEventListener('click', () => {
        modal.close();
        resolve(true);
      });

      lucide.createIcons();
    });
  }

  // ── Drawer ──
  function showDrawer(options) {
    const { title, content, width = 460 } = options;

    // Remove existing drawer
    document.querySelector('.drawer-overlay')?.remove();
    document.querySelector('.drawer')?.remove();

    const overlay = document.createElement('div');
    overlay.className = 'drawer-overlay active';
    document.body.appendChild(overlay);

    const drawer = document.createElement('div');
    drawer.className = 'drawer';
    drawer.style.width = `${width}px`;
    drawer.innerHTML = `
      <div class="modal-header">
        <h2>${title}</h2>
        <button class="modal-close drawer-close"><i data-lucide="x"></i></button>
      </div>
      <div class="modal-body" style="overflow-y:auto;flex:1">${content}</div>
    `;

    document.body.appendChild(drawer);
    lucide.createIcons();

    // Animate in
    requestAnimationFrame(() => drawer.classList.add('active'));

    const close = () => {
      drawer.classList.remove('active');
      overlay.classList.remove('active');
      setTimeout(() => { drawer.remove(); overlay.remove(); }, 300);
    };

    drawer.querySelector('.drawer-close').addEventListener('click', close);
    overlay.addEventListener('click', close);

    return { drawer, close };
  }

  // ── CSV Utilities ──
  function parseCSV(text) {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return { headers: [], rows: [] };

    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase());
    const rows = [];

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      if (values.length === headers.length) {
        const row = {};
        headers.forEach((h, idx) => row[h] = values[idx]);
        rows.push(row);
      }
    }

    return { headers, rows };
  }

  function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  }

  function exportCSV(headers, rows, filename) {
    const csv = [
      headers.join(','),
      ...rows.map(row => headers.map(h => {
        const val = row[h] ?? '';
        return typeof val === 'string' && val.includes(',') ? `"${val}"` : val;
      }).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Pagination Helper ──
  function paginate(items, page, perPage) {
    const total = items.length;
    const totalPages = Math.ceil(total / perPage);
    const start = (page - 1) * perPage;
    const end = start + perPage;
    return {
      items: items.slice(start, end),
      total,
      totalPages,
      page,
      perPage,
      start: start + 1,
      end: Math.min(end, total),
    };
  }

  function renderPagination(paginationData, onPageChange) {
    const { page, totalPages, start, end, total } = paginationData;
    if (totalPages <= 1) return '';

    let buttons = '';
    buttons += `<button class="pagination-btn" ${page <= 1 ? 'disabled' : ''} data-page="${page - 1}"><i data-lucide="chevron-left"></i></button>`;

    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || Math.abs(i - page) <= 1) {
        buttons += `<button class="pagination-btn ${i === page ? 'active' : ''}" data-page="${i}">${i}</button>`;
      } else if (Math.abs(i - page) === 2) {
        buttons += '<span style="padding:0 4px;color:var(--text-tertiary)">…</span>';
      }
    }

    buttons += `<button class="pagination-btn" ${page >= totalPages ? 'disabled' : ''} data-page="${page + 1}"><i data-lucide="chevron-right"></i></button>`;

    return `
      <div class="pagination">
        <span class="pagination-info">Showing ${start}–${end} of ${total}</span>
        <div class="pagination-controls" id="paginationControls">${buttons}</div>
      </div>
    `;
  }

  function bindPagination(containerId, onPageChange) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.querySelectorAll('.pagination-btn:not(:disabled)').forEach(btn => {
      btn.addEventListener('click', () => onPageChange(parseInt(btn.dataset.page)));
    });
  }

  // ── Format helpers ──
  function formatCurrency(value) {
    return DemoData.formatCurrency(value);
  }

  function formatDate(date) {
    return DemoData.formatDate(date);
  }

  function formatNumber(num) {
    return Number(num).toLocaleString('en-IN');
  }

  return {
    init,
    registerPage,
    navigateTo,
    showToast,
    dismissToast,
    showModal,
    showConfirm,
    showDrawer,
    parseCSV,
    exportCSV,
    paginate,
    renderPagination,
    bindPagination,
    formatCurrency,
    formatDate,
    formatNumber,
    get currentPage() { return currentPage; },
  };
})();

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', App.init);
