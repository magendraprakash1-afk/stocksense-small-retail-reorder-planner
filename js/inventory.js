/* ========================================
   StockSense — Inventory Management Module
   Hybrid Product Upload System (Small Shops & Large Retailers)
   - Method 1: Excel / CSV Bulk Upload
   - Method 2: Manual Product Entry
   - Method 3: Barcode Scanning (Camera + USB/Manual)
   - Method 4: Small Shops (Tamil Voice & Picture-Based Entry)
   - Automatic Reorder Calculation Trigger on Verified Baseline
   ======================================== */

const InventoryModule = (() => {
  let currentPage = 1;
  const perPage = 15;
  let searchQuery = '';
  let categoryFilter = '';
  let statusFilter = '';
  let sortField = 'name';
  let sortDir = 'asc';
  let cameraStream = null;
  let barcodeScanInterval = null;
  let html5QrCodeScanner = null;
  let usbScannerListener = null;
  let activeBarcodeMode = 'camera';

  // ── Web Audio Synthesizer Beep for Barcode Detection ──
  function playScannerBeep(freq = 900, duration = 120) {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration / 1000);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration / 1000);
    } catch (e) {
      // AudioContext unavailable or restricted
    }
  }

  // ── Text-to-Speech in Tamil or English ──
  function speakFeedback(text, lang = 'ta-IN') {
    if (!('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = 0.95;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Speech synthesis error:', e);
    }
  }

  // ── Main Page Render ──
  function render(container) {
    container.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h1>Inventory Management</h1>
          <p>Hybrid product intake, opening stock verification & automated replenishment tracking</p>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-secondary" id="exportInventoryBtn" title="Export current catalog to CSV">
            <i data-lucide="download"></i> Export CSV
          </button>
          <button class="btn btn-outline" id="barcodeScanQuickBtn" style="color:var(--color-primary);border-color:var(--color-primary-100)">
            <i data-lucide="scan-barcode"></i> Barcode Scan
          </button>
          <button class="btn btn-secondary" id="bulkUploadQuickBtn">
            <i data-lucide="file-spreadsheet"></i> Bulk Excel/CSV
          </button>
          <button class="btn btn-primary" id="hybridUploadBtn">
            <i data-lucide="plus-circle"></i> Add Products (Hybrid)
          </button>
        </div>
      </div>

      <div class="card">
        <div class="card-header" style="flex-wrap:wrap;gap:12px">
          <div class="toolbar" style="margin:0;flex:1;flex-wrap:wrap">
            <div class="toolbar-search">
              <i data-lucide="search"></i>
              <input type="text" id="inventorySearch" placeholder="Search products, SKUs, categories... (Ctrl+K)" value="${searchQuery}">
            </div>
            <select class="form-select" style="width:auto;min-width:140px" id="categorySelect">
              <option value="">All Categories</option>
              ${DataStore.categories.map(c => `<option value="${c}" ${categoryFilter === c ? 'selected' : ''}>${c}</option>`).join('')}
            </select>
            <div class="filter-pills" id="statusFilters">
              <button class="filter-pill ${statusFilter === '' ? 'active' : ''}" data-status="">All</button>
              <button class="filter-pill ${statusFilter === 'healthy' ? 'active' : ''}" data-status="healthy">Healthy</button>
              <button class="filter-pill ${statusFilter === 'low_stock' ? 'active' : ''}" data-status="low_stock">Low Stock</button>
              <button class="filter-pill ${statusFilter === 'critical' ? 'active' : ''}" data-status="critical">Critical</button>
              <button class="filter-pill ${statusFilter === 'out_of_stock' ? 'active' : ''}" data-status="out_of_stock">Out of Stock</button>
              <button class="filter-pill ${statusFilter === 'near_expiry' ? 'active' : ''}" data-status="near_expiry">Near Expiry</button>
            </div>
          </div>
        </div>
        <div class="table-container" id="inventoryTableContainer"></div>
        <div class="card-footer" id="inventoryPagination"></div>
      </div>
    `;

    lucide.createIcons();
    bindEvents();
    renderTable();
  }

  function bindEvents() {
    document.getElementById('inventorySearch')?.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      currentPage = 1;
      renderTable();
    });

    document.getElementById('categorySelect')?.addEventListener('change', (e) => {
      categoryFilter = e.target.value;
      currentPage = 1;
      renderTable();
    });

    document.getElementById('statusFilters')?.addEventListener('click', (e) => {
      const pill = e.target.closest('.filter-pill');
      if (!pill) return;
      statusFilter = pill.dataset.status;
      document.querySelectorAll('#statusFilters .filter-pill').forEach(p => p.classList.toggle('active', p.dataset.status === statusFilter));
      currentPage = 1;
      renderTable();
    });

    document.getElementById('hybridUploadBtn')?.addEventListener('click', () => showHybridUploadModal('csv'));
    document.getElementById('bulkUploadQuickBtn')?.addEventListener('click', () => showHybridUploadModal('csv'));
    document.getElementById('barcodeScanQuickBtn')?.addEventListener('click', () => showHybridUploadModal('barcode'));

    document.getElementById('exportInventoryBtn')?.addEventListener('click', () => {
      const headers = ['sku', 'name', 'category', 'stock', 'avgDailySales', 'costPrice', 'sellingPrice', 'shelfLifeDays', 'reorderLevel', 'status', 'openingStockVerified'];
      const rows = DataStore.products.map(p => ({
        sku: p.sku,
        name: p.name,
        category: p.category,
        stock: p.stock,
        avgDailySales: p.avgDailySales,
        costPrice: p.costPrice,
        sellingPrice: p.sellingPrice,
        shelfLifeDays: p.shelfLifeDays,
        reorderLevel: p.reorderLevel,
        status: DataStore.getStockStatus(p).label,
        openingStockVerified: p.openingStockVerified !== false ? 'Yes' : 'No'
      }));
      App.exportCSV(headers, rows, 'stocksense_verified_inventory.csv');
      App.showToast('success', 'Export Complete', 'Inventory catalog exported to CSV');
    });
  }

  function getFilteredProducts() {
    let items = [...DataStore.products];

    if (searchQuery) {
      const q = searchQuery.toLowerCase().trim();
      items = items.filter(p => {
        if (p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)) return true;
        if (p.keywords && p.keywords.some(k => k.toLowerCase().includes(q) || q.includes(k.toLowerCase()))) return true;
        return false;
      });
    }

    if (categoryFilter) items = items.filter(p => p.category === categoryFilter);

    if (statusFilter) {
      items = items.filter(p => {
        const s = DataStore.getStockStatus(p).label.toLowerCase().replace(/\s+/g, '_');
        return s === statusFilter;
      });
    }

    // Sort
    items.sort((a, b) => {
      let va, vb;
      switch (sortField) {
        case 'name': va = a.name; vb = b.name; break;
        case 'stock': va = a.stock; vb = b.stock; break;
        case 'avgDailySales': va = a.avgDailySales; vb = b.avgDailySales; break;
        case 'costPrice': va = a.costPrice; vb = b.costPrice; break;
        case 'sellingPrice': va = a.sellingPrice; vb = b.sellingPrice; break;
        case 'category': va = a.category; vb = b.category; break;
        default: va = a.name; vb = b.name;
      }
      if (typeof va === 'string') return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
      return sortDir === 'asc' ? va - vb : vb - va;
    });

    return items;
  }

  function renderTable() {
    const items = getFilteredProducts();
    const paginated = App.paginate(items, currentPage, perPage);

    const tableContainer = document.getElementById('inventoryTableContainer');
    if (!tableContainer) return;

    if (paginated.items.length === 0) {
      if (DataStore.products.length === 0) {
        // Render Hybrid Launchpad when store is completely clean
        tableContainer.innerHTML = `
          <div style="padding:40px 24px;text-align:center">
            <div style="display:inline-flex;align-items:center;gap:8px;padding:6px 14px;border-radius:20px;background:#f0fdf4;color:#166534;font-size:0.8125rem;font-weight:600;margin-bottom:14px">
              <i data-lucide="shield-check" style="width:16px;height:16px"></i> Ready for Opening Inventory Intake
            </div>
            <h2 style="font-size:1.5rem;font-weight:800;margin-bottom:8px">Choose Your Product Intake Method</h2>
            <p style="color:var(--text-secondary);max-width:580px;margin:0 auto 28px;font-size:0.875rem">
              StockSense supports hybrid intake for both small kirana shops and large supermarkets.
              Verify your physical opening stock to immediately activate automated reorder planning.
            </p>

            <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(230px, 1fr));gap:16px;max-width:1050px;margin:0 auto 24px;text-align:left">
              <!-- Card 1: Bulk CSV / Excel -->
              <div class="card" style="padding:20px;border:1.5px solid var(--border-color);cursor:pointer;transition:all var(--transition-fast)" onclick="InventoryModule.showHybridUploadModal('csv')">
                <div style="width:44px;height:44px;border-radius:10px;background:#eff6ff;color:#3b82f6;display:flex;align-items:center;justify-content:center;margin-bottom:12px">
                  <i data-lucide="file-spreadsheet"></i>
                </div>
                <div style="font-weight:700;font-size:1rem;margin-bottom:4px">1. Excel / CSV Bulk Upload</div>
                <div style="font-size:0.75rem;color:var(--text-secondary);margin-bottom:14px">
                  Upload hundreds or thousands of products at once with automatic column mapping.
                </div>
                <button class="btn btn-sm btn-outline" style="width:100%;justify-content:center;color:#3b82f6;border-color:#bfdbfe">
                  Upload Spreadsheet
                </button>
              </div>

              <!-- Card 2: Manual Entry -->
              <div class="card" style="padding:20px;border:1.5px solid var(--border-color);cursor:pointer;transition:all var(--transition-fast)" onclick="InventoryModule.showHybridUploadModal('manual')">
                <div style="width:44px;height:44px;border-radius:10px;background:#f5f3ff;color:#8b5cf6;display:flex;align-items:center;justify-content:center;margin-bottom:12px">
                  <i data-lucide="edit-3"></i>
                </div>
                <div style="font-weight:700;font-size:1rem;margin-bottom:4px">2. Manual Product Entry</div>
                <div style="font-size:0.75rem;color:var(--text-secondary);margin-bottom:14px">
                  Add individual products, prices, shelf-life, and verify exact opening stock quantities.
                </div>
                <button class="btn btn-sm btn-outline" style="width:100%;justify-content:center;color:#8b5cf6;border-color:#ddd6fe">
                  Add Single Item
                </button>
              </div>

              <!-- Card 3: Barcode Scanning -->
              <div class="card" style="padding:20px;border:1.5px solid var(--border-color);cursor:pointer;transition:all var(--transition-fast)" onclick="InventoryModule.showHybridUploadModal('barcode')">
                <div style="width:44px;height:44px;border-radius:10px;background:#fff7ed;color:#ea580c;display:flex;align-items:center;justify-content:center;margin-bottom:12px">
                  <i data-lucide="scan-barcode"></i>
                </div>
                <div style="font-weight:700;font-size:1rem;margin-bottom:4px">3. Barcode Scanner</div>
                <div style="font-size:0.75rem;color:var(--text-secondary);margin-bottom:14px">
                  Scan packaging barcodes with your camera or USB reader, then confirm physical shelf count.
                </div>
                <button class="btn btn-sm btn-outline" style="width:100%;justify-content:center;color:#ea580c;border-color:#fed7aa">
                  Scan Barcode
                </button>
              </div>

              <!-- Card 4: Small Shop Voice & Pictures -->
              <div class="card" style="padding:20px;border:1.5px solid var(--border-color);cursor:pointer;transition:all var(--transition-fast)" onclick="InventoryModule.showHybridUploadModal('voice_visual')">
                <div style="width:44px;height:44px;border-radius:10px;background:#ecfdf5;color:#059669;display:flex;align-items:center;justify-content:center;margin-bottom:12px">
                  <i data-lucide="mic"></i>
                </div>
                <div style="font-weight:700;font-size:1rem;margin-bottom:4px">4. Tamil Voice & Pictures</div>
                <div style="font-size:0.75rem;color:var(--text-secondary);margin-bottom:14px">
                  Speak in Tamil (e.g. "பால் 15") or select picture icons for easy small shopkeeper intake.
                </div>
                <button class="btn btn-sm btn-primary" style="width:100%;justify-content:center">
                  தமிழ்ப் பேச்சு & படங்கள்
                </button>
              </div>
            </div>
          </div>
        `;
      } else {
        tableContainer.innerHTML = `
          <div class="empty-state" style="padding:48px 20px">
            <div class="empty-state-icon"><i data-lucide="package-open"></i></div>
            <h3>No matching products found</h3>
            <p style="color:var(--text-secondary);max-width:480px;margin:8px auto 20px">
              Try adjusting your search query or filter tags.
            </p>
            <button class="btn btn-secondary" onclick="InventoryModule.clearFilters()">Clear Filters</button>
          </div>
        `;
      }
      document.getElementById('inventoryPagination').innerHTML = '';
      lucide.createIcons();
      return;
    }

    const sortIcon = (field) => sortField === field ? (sortDir === 'asc' ? '↑' : '↓') : '';

    tableContainer.innerHTML = `
      <table>
        <thead>
          <tr>
            <th class="sortable" data-sort="name">Product ${sortIcon('name')}</th>
            <th class="sortable" data-sort="category">Category ${sortIcon('category')}</th>
            <th class="sortable text-right" data-sort="stock">Shelf Stock ${sortIcon('stock')}</th>
            <th class="text-center">Opening Count</th>
            <th class="sortable text-right" data-sort="avgDailySales">Avg Daily ${sortIcon('avgDailySales')}</th>
            <th>Supplier</th>
            <th class="text-right">Lead Time</th>
            <th>Expiry</th>
            <th class="sortable text-right" data-sort="costPrice">Cost ${sortIcon('costPrice')}</th>
            <th class="sortable text-right" data-sort="sellingPrice">Price ${sortIcon('sellingPrice')}</th>
            <th class="text-right">Profit</th>
            <th>Health</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${paginated.items.map(p => {
            const status = DataStore.getStockStatus(p);
            const supplier = DataStore.getSupplier(p.supplierId);
            const profit = p.sellingPrice - p.costPrice;
            const expiryDays = DataStore.daysUntil(p.expiryDate);
            const stockPercent = p.reorderLevel > 0 ? Math.min(100, (p.stock / (p.reorderLevel * 3)) * 100) : 100;
            const stockBarColor = status.label === 'Healthy' ? '#10b981' : status.label === 'Low Stock' ? '#f59e0b' : '#ef4444';
            const isVerified = p.openingStockVerified !== false;

            return `<tr>
              <td>
                <div class="product-cell">
                  <span class="product-icon">${p.icon || '📦'}</span>
                  <div class="product-info">
                    <div class="product-name">${p.name}</div>
                    <div class="product-sku">${p.sku}</div>
                  </div>
                </div>
              </td>
              <td><span class="text-sm text-secondary">${p.category}</span></td>
              <td class="text-right">
                <strong>${p.stock}</strong>
                <div class="stock-bar"><div class="stock-bar-fill" style="width:${stockPercent}%;background:${stockBarColor}"></div></div>
              </td>
              <td class="text-center">
                ${isVerified
                  ? '<span class="badge badge-success badge-dot" title="Opening stock count verified against store shelf"><i data-lucide="check" style="width:10px;height:10px"></i> Verified</span>'
                  : `<button class="btn btn-xs btn-outline" style="color:var(--color-warning);border-color:#fde047" onclick="InventoryModule.verifyStockPrompt('${p.id}')"><i data-lucide="check-circle" style="width:12px;height:12px"></i> Verify</button>`}
              </td>
              <td class="text-right">${p.avgDailySales}/day</td>
              <td><span class="text-sm">${supplier ? supplier.name.split(' ')[0] : '—'}</span></td>
              <td class="text-right">${supplier ? supplier.leadTime + 'd' : '—'}</td>
              <td>
                ${p.expiryDate ? `<span class="text-sm ${expiryDays <= 7 ? 'text-danger font-semibold' : expiryDays <= 14 ? 'text-warning' : 'text-secondary'}">${expiryDays}d</span>` : '<span class="text-tertiary">—</span>'}
              </td>
              <td class="text-right">${DataStore.formatCurrency(p.costPrice)}</td>
              <td class="text-right">${DataStore.formatCurrency(p.sellingPrice)}</td>
              <td class="text-right text-success font-medium">${DataStore.formatCurrency(profit)}</td>
              <td><span class="badge ${status.class} badge-dot">${status.label}</span></td>
              <td>
                <div class="flex gap-xs">
                  <button class="btn btn-ghost btn-icon btn-sm" title="View" onclick="InventoryModule.viewProduct('${p.id}')"><i data-lucide="eye"></i></button>
                  <button class="btn btn-ghost btn-icon btn-sm" title="Edit" onclick="InventoryModule.editProduct('${p.id}')"><i data-lucide="pencil"></i></button>
                  <button class="btn btn-ghost btn-icon btn-sm" title="Adjust Stock" onclick="InventoryModule.adjustStock('${p.id}')"><i data-lucide="package-plus"></i></button>
                  <button class="btn btn-ghost btn-icon btn-sm text-danger" title="Delete Product" onclick="InventoryModule.deleteProductConfirm('${p.id}')"><i data-lucide="trash-2"></i></button>
                </div>
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    `;

    // Sorting
    tableContainer.querySelectorAll('th.sortable').forEach(th => {
      th.addEventListener('click', () => {
        const field = th.dataset.sort;
        if (sortField === field) {
          sortDir = sortDir === 'asc' ? 'desc' : 'asc';
        } else {
          sortField = field;
          sortDir = 'asc';
        }
        renderTable();
      });
    });

    // Pagination
    const pagEl = document.getElementById('inventoryPagination');
    if (pagEl) {
      pagEl.innerHTML = App.renderPagination(paginated, (p) => { currentPage = p; renderTable(); });
      pagEl.querySelectorAll('.pagination-btn:not(:disabled)').forEach(btn => {
        btn.addEventListener('click', () => { currentPage = parseInt(btn.dataset.page); renderTable(); });
      });
    }

    lucide.createIcons();
  }

  function clearFilters() {
    searchQuery = '';
    categoryFilter = '';
    statusFilter = '';
    currentPage = 1;
    renderTable();
  }

  // ── HYBRID PRODUCT UPLOAD MODAL STUDIO ──
  function showHybridUploadModal(activeTab = 'csv') {
    stopCamera();

    const modal = App.showModal({
      title: 'Hybrid Product Upload System',
      size: 'modal-lg',
      content: `
        <div class="hybrid-upload-container">
          <!-- 4 Method Tabs -->
          <div class="upload-method-tabs" id="uploadMethodTabs">
            <button class="upload-tab-btn ${activeTab === 'csv' ? 'active' : ''}" data-tab="csv">
              <i data-lucide="file-spreadsheet"></i>
              <span>1. Excel / CSV</span>
              <span class="tab-badge">Bulk Upload</span>
            </button>
            <button class="upload-tab-btn ${activeTab === 'manual' ? 'active' : ''}" data-tab="manual">
              <i data-lucide="edit-3"></i>
              <span>2. Manual Entry</span>
              <span class="tab-badge">Single Product</span>
            </button>
            <button class="upload-tab-btn ${activeTab === 'barcode' ? 'active' : ''}" data-tab="barcode">
              <i data-lucide="scan-barcode"></i>
              <span>3. Barcode Scanner</span>
              <span class="tab-badge">Camera / Gun</span>
            </button>
            <button class="upload-tab-btn ${activeTab === 'voice_visual' ? 'active' : ''}" data-tab="voice_visual">
              <i data-lucide="mic"></i>
              <span>4. Voice & Pictures</span>
              <span class="tab-badge">தமிழில் சேர்க்க</span>
            </button>
          </div>

          <!-- Tab Content Panes -->
          <div id="tabContentPane" style="min-height:360px"></div>
        </div>
      `,
      footer: `
        <button class="btn btn-secondary" id="closeHybridModalBtn">Close</button>
        <span id="hybridActionSlot"></span>
      `
    });

    lucide.createIcons();

    function switchTab(tab) {
      activeTab = tab;
      modal.overlay.querySelectorAll('.upload-tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tab);
      });
      stopCamera();

      const pane = modal.overlay.querySelector('#tabContentPane');
      const actionSlot = modal.overlay.querySelector('#hybridActionSlot');

      if (tab === 'csv') renderCsvTab(pane, actionSlot, modal);
      else if (tab === 'manual') renderManualTab(pane, actionSlot, modal);
      else if (tab === 'barcode') renderBarcodeTab(pane, actionSlot, modal);
      else if (tab === 'voice_visual') renderVoiceVisualTab(pane, actionSlot, modal);

      lucide.createIcons();
    }

    modal.overlay.querySelector('#uploadMethodTabs')?.addEventListener('click', (e) => {
      const btn = e.target.closest('.upload-tab-btn');
      if (btn) switchTab(btn.dataset.tab);
    });

    modal.overlay.querySelector('#closeHybridModalBtn')?.addEventListener('click', () => {
      stopCamera();
      modal.close();
    });

    // Initialize with selected tab
    switchTab(activeTab);
  }

  // ── METHOD 1: EXCEL / CSV BULK UPLOAD WITH INTERACTIVE COLUMN MAPPER ──
  const COLUMN_SYNONYMS = {
    name: [
      'name', 'product_name', 'item_name', 'item_description', 'particulars',
      'product', 'item', 'title', 'description', 'product title', 'item description',
      'product name', 'item name', 'items', 'products', 'material', 'goods',
      'பொருள் பெயர்', 'பொருள்', 'பொருளின் பெயர்', 'விபரம்', 'சரக்கு'
    ],
    sku: [
      'sku', 'code', 'barcode', 'id', 'item_code', 'item code', 'bar code',
      'part no', 'part_no', 'hsn', 'hsn_sac', 'ean', 'upc', 'product code',
      'item_id', 'product_id', 'bar_code', 'பொருளெண்', 'குறியீடு', 'பார் கோட்'
    ],
    stock: [
      'stock', 'qty', 'quantity', 'opening_stock', 'current_stock', 'count', 'units',
      'closing stock', 'closing balance', 'bal qty', 'balance', 'closing', 'on_hand',
      'shelf_stock', 'physical_stock', 'opening stock', 'current stock', 'closing qty',
      'இருப்பு', 'அளவு', 'மீதி', 'இருப்பு எண்ணிக்கை'
    ],
    costPrice: [
      'cost', 'cost_price', 'buying_price', 'purchase_price', 'cp', 'purchase rate',
      'basic rate', 'rate', 'pur_rate', 'buy_price', 'cost price', 'purchase price',
      'வாங்கிய விலை', 'அடக்க விலை', 'கொள்முதல் விலை'
    ],
    sellingPrice: [
      'price', 'selling_price', 'sale_price', 'mrp', 'retail_price', 'sp',
      'unit price', 'sales rate', 'sale_rate', 'selling price', 'sale price',
      'விற்பனை விலை', 'விலை', 'விற்பனை'
    ],
    category: [
      'category', 'dept', 'department', 'type', 'group', 'sub group', 'class',
      'item group', 'family', 'section', 'பிரிவு', 'வகை', 'இனம்'
    ],
    avgDailySales: [
      'daily_sales', 'avg_daily', 'avg_daily_sales', 'sales_rate', 'daily demand',
      'velocity', 'run_rate', 'daily_run', 'விற்பனை அளவு', 'தினசரி விற்பனை'
    ],
    shelfLifeDays: [
      'shelf_life', 'shelf_life_days', 'expiry_days', 'expiry', 'best before',
      'life_days', 'validity', 'நாட்கள்', 'காலாவதி'
    ],
    reorderLevel: [
      'reorder_level', 'reorder_point', 'rop', 'min_stock', 'safety_stock',
      'min level', 'minimum', 'மறுஆர்டர் அளவு'
    ]
  };

  function findBestColumnMatch(headers, targetField) {
    const synonyms = COLUMN_SYNONYMS[targetField] || [];
    const normalizedHeaders = headers.map(h => String(h || '').trim().toLowerCase().replace(/[\s\-_.]+/g, ' '));

    // 1. Exact match
    for (const syn of synonyms) {
      const synNorm = syn.toLowerCase().replace(/[\s\-_.]+/g, ' ');
      const idx = normalizedHeaders.findIndex(h => h === synNorm);
      if (idx !== -1) return idx;
    }

    // 2. Includes match
    for (const syn of synonyms) {
      const synNorm = syn.toLowerCase().replace(/[\s\-_.]+/g, ' ');
      const idx = normalizedHeaders.findIndex(h => h.includes(synNorm) || synNorm.includes(h));
      if (idx !== -1) return idx;
    }

    return -1;
  }

  function readSpreadsheetFile(file, callback) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const buffer = e.target.result;
        const bytes = new Uint8Array(buffer);

        // Check if file is a binary Excel format (ZIP/PK for .xlsx, or OLE CFB for .xls)
        const isZip = bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4B && bytes[2] === 0x03 && bytes[3] === 0x04;
        const isOleXls = bytes.length >= 4 && bytes[0] === 0xD0 && bytes[1] === 0xCF && bytes[2] === 0x11 && bytes[3] === 0xE0;
        const isBinarySpreadsheet = isZip || isOleXls || file.name.endsWith('.xlsx') || file.name.endsWith('.xls');

        if (isBinarySpreadsheet) {
          if (typeof XLSX === 'undefined') {
            callback(new Error('Excel binary format (.xlsx/.xls) detected. Please ensure XLSX parser is available or export as a standard CSV file.'));
            return;
          }

          const workbook = XLSX.read(bytes, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const rawRows = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '' });

          if (!rawRows || rawRows.length < 2) {
            callback(new Error('Spreadsheet has no valid product rows.'));
            return;
          }

          // Locate first non-empty header row
          let headerRowIdx = 0;
          for (let r = 0; r < Math.min(rawRows.length, 10); r++) {
            const nonEmpty = rawRows[r].filter(c => String(c).trim().length > 0);
            if (nonEmpty.length >= 2) {
              headerRowIdx = r;
              break;
            }
          }

          const rawHeaders = rawRows[headerRowIdx].map(c => String(c).trim());
          const dataRows = rawRows.slice(headerRowIdx + 1).filter(r => r.some(c => String(c).trim().length > 0));

          callback(null, { headers: rawHeaders, dataRows, filename: file.name });
          return;
        }

        // Plain text CSV / TSV / TXT parsing with multi-encoding fallback (UTF-8, Windows-1252, UTF-16)
        let text = '';
        try {
          const utf8Decoder = new TextDecoder('utf-8', { fatal: true });
          text = utf8Decoder.decode(buffer);
        } catch (err) {
          try {
            // Excel on Windows commonly exports CSV in Windows-1252
            text = new TextDecoder('windows-1252').decode(buffer);
          } catch (e2) {
            text = new TextDecoder('utf-16le').decode(buffer);
          }
        }

        // If text contains high ratio of binary control characters, reject as corrupted
        if (/[\x00-\x08\x0E-\x1F]/.test(text.slice(0, 500))) {
          callback(new Error('Binary or unreadable file format detected. Please upload an Excel (.xlsx) or UTF-8 CSV file.'));
          return;
        }

        const lines = text.trim().split(/\r?\n/).filter(line => line.trim().length > 0);
        if (lines.length < 2) {
          callback(new Error('CSV file has no data rows.'));
          return;
        }

        const delimiter = lines[0].includes('\t') ? '\t' : lines[0].includes(';') ? ';' : ',';
        const rawHeaders = lines[0].split(delimiter).map(h => h.trim().replace(/^["']|["']$/g, ''));
        const dataRows = lines.slice(1).map(l => l.split(delimiter).map(c => c.trim().replace(/^["']|["']$/g, '')));

        callback(null, { headers: rawHeaders, dataRows, filename: file.name });
      } catch (err) {
        callback(err);
      }
    };
    reader.onerror = () => callback(new Error('Failed to read spreadsheet file.'));
    reader.readAsArrayBuffer(file);
  }

  function renderCsvTab(pane, actionSlot, modal) {
    let uploadedFileMeta = null;
    let currentColumnMapping = {};
    let parsedRows = [];

    pane.innerHTML = `
      <div>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;flex-wrap:wrap;gap:8px">
          <div>
            <h3 style="margin:0;font-size:1.05rem">Excel / CSV Bulk Product Intake</h3>
            <p style="margin:2px 0 0;font-size:0.75rem;color:var(--text-secondary)">
              Upload your catalog in any format (.xlsx, .xls, .csv). StockSense automatically maps arbitrary column names (Tally, Marg ERP, Vyapar, PosBytz, etc.).
            </p>
          </div>
          <button class="btn btn-xs btn-outline" id="downloadCsvTemplateBtn">
            <i data-lucide="download"></i> Download CSV Template
          </button>
        </div>

        <!-- Drag and Drop Dropzone -->
        <div class="csv-dropzone" id="csvDropzone">
          <input type="file" id="csvFileInput" accept=".csv, .xlsx, .xls, .tsv, .txt" style="display:none">
          <div class="csv-dropzone-icon">
            <i data-lucide="upload-cloud"></i>
          </div>
          <div style="font-weight:700;font-size:0.9375rem;margin-bottom:4px">
            Click to upload or drag & drop Excel / CSV spreadsheet
          </div>
          <div style="font-size:0.75rem;color:var(--text-secondary)">
            Supported: .xlsx, .xls, .csv, .tsv — Works with custom ERP & accounting column names
          </div>
        </div>

        <!-- Interactive Column Mapping Wizard & Live Preview -->
        <div id="csvPreviewArea" style="display:none;margin-top:16px">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;flex-wrap:wrap;gap:8px">
            <div style="display:flex;align-items:center;gap:8px">
              <span class="badge badge-primary" id="csvFileNameBadge">file.xlsx</span>
              <strong id="csvSummaryText" style="font-size:0.875rem"></strong>
            </div>
            <button class="btn btn-xs btn-ghost text-danger" id="clearCsvBtn">
              <i data-lucide="trash-2"></i> Clear & Re-upload
            </button>
          </div>

          <!-- Column Mapping Card -->
          <div class="column-mapper-card" id="columnMapperCard">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
              <div style="font-size:0.8125rem;font-weight:700;display:flex;align-items:center;gap:6px">
                <i data-lucide="sliders-horizontal" style="width:16px;height:16px;color:var(--color-primary)"></i>
                Column Name Mapping (Spreadsheet &rarr; StockSense)
              </div>
              <span style="font-size:0.7rem;color:var(--text-tertiary)">Matched automatically from file headers</span>
            </div>
            <p style="font-size:0.75rem;color:var(--text-secondary);margin:0 0 10px">
              Verify or change the mapped columns below. The live table preview updates instantly as you adjust any column.
            </p>

            <div class="column-mapper-grid" id="mapperGrid"></div>
          </div>

          <!-- Live Data Preview Table -->
          <div class="csv-preview-table-wrapper" style="margin-top:14px">
            <table class="table-sm" id="csvPreviewTable">
              <thead>
                <tr>
                  <th>#</th>
                  <th>SKU / Barcode</th>
                  <th>Product Name</th>
                  <th>Category</th>
                  <th class="text-right">Opening Stock</th>
                  <th class="text-right">Cost Price (₹)</th>
                  <th class="text-right">Selling Price (₹)</th>
                  <th class="text-right">Daily Demand</th>
                </tr>
              </thead>
              <tbody></tbody>
            </table>
          </div>

          <!-- Opening Stock Verification Gate -->
          <div class="opening-stock-verify-box verified" id="csvVerifyBox" style="margin-top:14px">
            <input type="checkbox" id="csvVerifyCheckbox" class="verify-checkbox" checked>
            <div>
              <label for="csvVerifyCheckbox" style="font-weight:700;font-size:0.875rem;cursor:pointer;display:block">
                Verify Physical Opening Stock Count
              </label>
              <div style="font-size:0.75rem;color:var(--text-secondary);margin-top:2px">
                I verify that the opening stock numbers in this spreadsheet represent actual physical inventory on the store shelves. Automated reorder calculation will activate immediately upon save.
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    actionSlot.innerHTML = `
      <button class="btn btn-primary" id="commitCsvBtn" disabled>
        <i data-lucide="check"></i> Import & Calculate Reorders
      </button>
    `;

    const dropzone = pane.querySelector('#csvDropzone');
    const fileInput = pane.querySelector('#csvFileInput');
    const previewArea = pane.querySelector('#csvPreviewArea');
    const commitBtn = actionSlot.querySelector('#commitCsvBtn');

    pane.querySelector('#downloadCsvTemplateBtn')?.addEventListener('click', downloadCsvTemplate);

    dropzone.addEventListener('click', () => fileInput.click());
    dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('dragover'); });
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      if (e.dataTransfer.files.length > 0) processSpreadsheet(e.dataTransfer.files[0]);
    });

    fileInput.addEventListener('change', () => {
      if (fileInput.files.length > 0) processSpreadsheet(fileInput.files[0]);
    });

    pane.querySelector('#clearCsvBtn')?.addEventListener('click', () => {
      fileInput.value = '';
      uploadedFileMeta = null;
      parsedRows = [];
      previewArea.style.display = 'none';
      dropzone.style.display = 'block';
      commitBtn.disabled = true;
    });

    function processSpreadsheet(file) {
      readSpreadsheetFile(file, (err, result) => {
        if (err) {
          App.showToast('error', 'Spreadsheet Read Error', err.message);
          return;
        }

        uploadedFileMeta = result;
        dropzone.style.display = 'none';
        previewArea.style.display = 'block';
        pane.querySelector('#csvFileNameBadge').textContent = result.filename;

        // Auto-match initial column mapping
        currentColumnMapping = {
          name: findBestColumnMatch(result.headers, 'name'),
          sku: findBestColumnMatch(result.headers, 'sku'),
          stock: findBestColumnMatch(result.headers, 'stock'),
          costPrice: findBestColumnMatch(result.headers, 'costPrice'),
          sellingPrice: findBestColumnMatch(result.headers, 'sellingPrice'),
          category: findBestColumnMatch(result.headers, 'category'),
          avgDailySales: findBestColumnMatch(result.headers, 'avgDailySales'),
          shelfLifeDays: findBestColumnMatch(result.headers, 'shelfLifeDays')
        };

        // Fallback for name if not matched: first column
        if (currentColumnMapping.name === -1 && result.headers.length > 0) {
          currentColumnMapping.name = 0;
        }

        renderMapperUI();
        updateRowsAndPreview();
      });
    }

    function renderMapperUI() {
      const grid = pane.querySelector('#mapperGrid');
      const headers = uploadedFileMeta.headers;

      const fieldsConfig = [
        { key: 'name', label: 'Product Name', required: true, hint: 'e.g. Item Name, Particulars' },
        { key: 'stock', label: 'Opening Shelf Stock', required: true, hint: 'e.g. Closing Qty, Balance' },
        { key: 'sku', label: 'SKU / Barcode', required: false, autoGen: true, hint: 'e.g. Barcode, Item Code' },
        { key: 'sellingPrice', label: 'Selling Price (MRP)', required: false, hint: 'e.g. MRP, Sale Rate' },
        { key: 'costPrice', label: 'Cost Price (₹)', required: false, hint: 'e.g. Pur Rate, Basic Rate' },
        { key: 'category', label: 'Category / Group', required: false, hint: 'e.g. Group, Dept' },
        { key: 'avgDailySales', label: 'Daily Demand Rate', required: false, hint: 'e.g. Daily Sales (Default 3)' },
        { key: 'shelfLifeDays', label: 'Shelf Life (Days)', required: false, hint: 'e.g. Expiry Days (Default 180)' }
      ];

      grid.innerHTML = fieldsConfig.map(f => {
        const selectedIdx = currentColumnMapping[f.key];
        const optionsHtml = [
          f.autoGen ? `<option value="-1" ${selectedIdx === -1 ? 'selected' : ''}>-- Auto-Generate Unique SKU --</option>` : `<option value="-1" ${selectedIdx === -1 ? 'selected' : ''}>-- Auto / Default Value --</option>`,
          ...headers.map((h, i) => `<option value="${i}" ${selectedIdx === i ? 'selected' : ''}>${h || `Column ${i + 1}`}</option>`)
        ].join('');

        return `
          <div class="mapper-item">
            <label>
              ${f.label} ${f.required ? '<span class="required">*</span>' : ''}
            </label>
            <select class="form-select" data-field="${f.key}">
              ${optionsHtml}
            </select>
          </div>
        `;
      }).join('');

      grid.querySelectorAll('select').forEach(sel => {
        sel.addEventListener('change', (e) => {
          const field = e.target.dataset.field;
          currentColumnMapping[field] = parseInt(e.target.value);
          updateRowsAndPreview();
        });
      });
    }

    function updateRowsAndPreview() {
      if (!uploadedFileMeta) return;

      const { headers, dataRows } = uploadedFileMeta;
      const map = currentColumnMapping;

      parsedRows = [];
      const seenNames = new Set();

      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];

        const rawName = map.name !== -1 && row[map.name] !== undefined ? String(row[map.name]).trim() : '';
        if (!rawName) continue; // Skip completely empty product name rows

        // Reject corrupted or binary mojibake strings (such as diamond  or control chars or zip headers)
        if (rawName.includes('\uFFFD') || rawName.includes('PK\x03\x04') || /[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(rawName)) {
          continue;
        }

        let rawSku = map.sku !== -1 && row[map.sku] !== undefined ? String(row[map.sku]).trim() : '';
        if (!rawSku) {
          rawSku = `SKU-${Date.now().toString().slice(-5)}-${i + 1}`;
        }

        const rawStock = map.stock !== -1 && row[map.stock] !== undefined ? parseInt(String(row[map.stock]).replace(/[^0-9.-]/g, '')) || 0 : 10;
        const rawCost = map.costPrice !== -1 && row[map.costPrice] !== undefined ? parseFloat(String(row[map.costPrice]).replace(/[^0-9.-]/g, '')) || 40 : 40;
        const rawPrice = map.sellingPrice !== -1 && row[map.sellingPrice] !== undefined ? parseFloat(String(row[map.sellingPrice]).replace(/[^0-9.-]/g, '')) || Math.round(rawCost * 1.3) : Math.round(rawCost * 1.3);
        const rawCategory = map.category !== -1 && row[map.category] !== undefined && String(row[map.category]).trim() ? String(row[map.category]).trim() : 'General';
        const rawDaily = map.avgDailySales !== -1 && row[map.avgDailySales] !== undefined ? parseInt(String(row[map.avgDailySales]).replace(/[^0-9.-]/g, '')) || 3 : 3;
        const rawShelf = map.shelfLifeDays !== -1 && row[map.shelfLifeDays] !== undefined ? parseInt(String(row[map.shelfLifeDays]).replace(/[^0-9.-]/g, '')) || 180 : 180;

        parsedRows.push({
          name: rawName,
          sku: rawSku,
          category: rawCategory,
          stock: Math.max(0, rawStock),
          costPrice: Math.max(0, rawCost),
          sellingPrice: Math.max(rawCost, rawPrice),
          avgDailySales: Math.max(1, rawDaily),
          shelfLifeDays: Math.max(1, rawShelf),
          reorderLevel: Math.max(5, Math.round(rawDaily * 3)),
          icon: getCategoryEmoji(rawCategory),
          supplierId: 'SUP001'
        });
      }

      pane.querySelector('#csvSummaryText').textContent = `Mapped ${parsedRows.length} valid product items`;

      // Render table preview (first 25 rows)
      const tbody = pane.querySelector('#csvPreviewTable tbody');
      if (parsedRows.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:20px;color:var(--color-danger)">No products found with current mapping. Please ensure 'Product Name' column is selected.</td></tr>`;
        commitBtn.disabled = true;
      } else {
        tbody.innerHTML = parsedRows.slice(0, 25).map((r, i) => `
          <tr>
            <td>${i + 1}</td>
            <td><code class="text-xs">${r.sku}</code></td>
            <td><strong>${r.name}</strong></td>
            <td>${r.category}</td>
            <td class="text-right"><strong>${r.stock}</strong></td>
            <td class="text-right">₹${r.costPrice}</td>
            <td class="text-right">₹${r.sellingPrice}</td>
            <td class="text-right">${r.avgDailySales}/d</td>
          </tr>
        `).join('');
        commitBtn.disabled = false;
      }

      lucide.createIcons();
    }

    commitBtn.onclick = async () => {
      if (parsedRows.length === 0) return;
      const isVerified = pane.querySelector('#csvVerifyCheckbox')?.checked ?? true;

      commitBtn.disabled = true;
      commitBtn.innerHTML = '<div class="spinner" style="width:16px;height:16px;border-width:2px"></div> Importing Products...';

      try {
        const itemsToSave = parsedRows.map(r => ({
          ...r,
          openingStockVerified: isVerified
        }));

        await API.Products.importCSV(itemsToSave);
        modal.close();
        renderTable();
        App.showToast('success', 'Bulk Intake Successful', `${itemsToSave.length} products mapped & imported with verified opening stock.`);

        // Step 5: Automatically trigger reorder calculation baseline!
        triggerAutoReorderCheck(itemsToSave.length, true);
      } catch (err) {
        App.showToast('error', 'Import Failed', err.message);
        commitBtn.disabled = false;
        commitBtn.innerHTML = '<i data-lucide="check"></i> Import & Calculate Reorders';
      }
    };
  }

  // ── METHOD 2: MANUAL PRODUCT ENTRY ──
  function renderManualTab(pane, actionSlot, modal) {
    pane.innerHTML = `
      <form id="manualProductForm">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Product Name <span class="required">*</span></label>
            <input class="form-input" name="name" required placeholder="e.g., Basmati Rice 5kg">
          </div>
          <div class="form-group">
            <label class="form-label">SKU / Barcode <span class="required">*</span></label>
            <div style="display:flex;gap:6px">
              <input class="form-input" name="sku" id="manualSkuInput" required placeholder="e.g., GRC-RICE-5K">
              <button type="button" class="btn btn-sm btn-outline" id="autoGenerateSkuBtn" title="Generate Random SKU">Auto</button>
            </div>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Category</label>
            <select class="form-select" name="category" id="manualCategorySelect">
              ${DataStore.categories.map(c => `<option value="${c}">${c}</option>`).join('')}
              <option value="Other">Other...</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Icon / Emoji</label>
            <input class="form-input" name="icon" value="📦" maxlength="4" style="font-size:1.2rem;width:80px;text-align:center">
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Opening Shelf Stock <span class="required">*</span></label>
            <input class="form-input font-mono font-bold" name="stock" type="number" min="0" value="10" required style="font-size:1.1rem">
          </div>
          <div class="form-group">
            <label class="form-label">Reorder Level (ROP)</label>
            <input class="form-input" name="reorderLevel" type="number" min="0" value="10">
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Cost Price (₹)</label>
            <input class="form-input" name="costPrice" type="number" min="0" step="0.5" value="50">
          </div>
          <div class="form-group">
            <label class="form-label">Selling Price (₹)</label>
            <input class="form-input" name="sellingPrice" type="number" min="0" step="0.5" value="65">
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Avg Daily Demand (Units/Day)</label>
            <input class="form-input" name="avgDailySales" type="number" min="0" value="4">
          </div>
          <div class="form-group">
            <label class="form-label">Shelf Life (Days)</label>
            <input class="form-input" name="shelfLifeDays" type="number" min="1" value="180">
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Supplier Partner</label>
          <select class="form-select" name="supplierId">
            ${DataStore.suppliers.map(s => `<option value="${s.id}">${s.name} (${s.leadTime}d lead time)</option>`).join('')}
          </select>
        </div>

        <!-- Opening Stock Verification Checkbox -->
        <div class="opening-stock-verify-box verified">
          <input type="checkbox" id="manualVerifyCheckbox" class="verify-checkbox" checked>
          <div>
            <label for="manualVerifyCheckbox" style="font-weight:700;font-size:0.875rem;cursor:pointer;display:block">
              Opening Stock Verified
            </label>
            <div style="font-size:0.75rem;color:var(--text-secondary);margin-top:2px">
              Confirmed accurate against physical count on store shelves. Triggers automated replenishment math on save.
            </div>
          </div>
        </div>
      </form>
    `;

    actionSlot.innerHTML = `
      <button class="btn btn-primary" id="saveManualProductBtn">
        <i data-lucide="check"></i> Save Product & Calculate Reorder
      </button>
    `;

    pane.querySelector('#autoGenerateSkuBtn')?.addEventListener('click', () => {
      pane.querySelector('#manualSkuInput').value = `SKU-${Date.now().toString().slice(-6)}`;
    });

    actionSlot.querySelector('#saveManualProductBtn')?.addEventListener('click', async () => {
      const form = pane.querySelector('#manualProductForm');
      const formData = new FormData(form);

      const name = formData.get('name')?.trim();
      const sku = formData.get('sku')?.trim();

      if (!name || !sku) {
        App.showToast('error', 'Validation Error', 'Product Name and SKU are mandatory.');
        return;
      }

      const isVerified = pane.querySelector('#manualVerifyCheckbox')?.checked ?? true;

      const productData = {
        name,
        sku,
        category: formData.get('category') || 'General',
        icon: formData.get('icon') || '📦',
        stock: parseInt(formData.get('stock')) || 0,
        reorderLevel: parseInt(formData.get('reorderLevel')) || 10,
        costPrice: parseFloat(formData.get('costPrice')) || 0,
        sellingPrice: parseFloat(formData.get('sellingPrice')) || 0,
        avgDailySales: parseInt(formData.get('avgDailySales')) || 2,
        shelfLifeDays: parseInt(formData.get('shelfLifeDays')) || 180,
        supplierId: formData.get('supplierId') || 'SUP001',
        openingStockVerified: isVerified
      };

      try {
        await API.Products.create(productData);
        modal.close();
        renderTable();
        App.showToast('success', 'Product Added', `${productData.name} added to catalog.`);

        // Step 5: Immediately trigger automatic reorder calculation!
        triggerAutoReorderCheck(1, false);
      } catch (err) {
        App.showToast('error', 'Failed to Save', err.message);
      }
    });
  }

  // ── METHOD 3: UNIVERSAL BARCODE SCANNER ENTRY (ALL ACCESS) ──
  function renderBarcodeTab(pane, actionSlot, modal) {
    let currentMatchedProduct = null;
    let currentFacingMode = 'environment'; // 'environment' (rear) or 'user' (front)

    pane.innerHTML = `
      <div>
        <div style="margin-bottom:12px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
          <div>
            <h3 style="margin:0;font-size:1.05rem">Universal Barcode Intake Studio</h3>
            <p style="margin:2px 0 0;font-size:0.75rem;color:var(--text-secondary)">
              Works across all devices: Live Camera, Photo/Image upload, or USB/Bluetooth Handheld Barcode Guns.
            </p>
          </div>
          <div class="usb-scanner-badge">
            <i data-lucide="zap" style="width:14px;height:14px;color:#16a34a"></i>
            <span>USB Gun Ready</span>
          </div>
        </div>

        <!-- Barcode Scanner Sub-mode Toolbar -->
        <div class="barcode-options-toolbar">
          <div class="barcode-submode-tabs">
            <button type="button" class="barcode-mode-btn active" id="btnModeCamera" data-mode="camera">
              <i data-lucide="camera"></i> 📹 Live Camera
            </button>
            <button type="button" class="barcode-mode-btn" id="btnModePhoto" data-mode="photo">
              <i data-lucide="image"></i> 🖼️ Scan from Photo
            </button>
            <button type="button" class="barcode-mode-btn" id="btnModeUsb" data-mode="usb">
              <i data-lucide="barcode"></i> ⌨️ USB / Gun
            </button>
          </div>

          <div id="cameraControls" style="display:flex;gap:6px">
            <button type="button" class="btn btn-xs btn-outline" id="switchCameraFacingBtn" title="Switch between Front and Back Camera">
              <i data-lucide="refresh-cw"></i> Flip Camera
            </button>
          </div>
        </div>

        <!-- Submode 1: Live Universal Camera Viewfinder -->
        <div id="barcodeCameraContainer" style="display:block">
          <div class="barcode-scanner-viewfinder" style="position:relative;background:#000;border-radius:12px;overflow:hidden;min-height:260px;display:flex;align-items:center;justify-content:center">
            <div id="universalBarcodeReader" style="width:100%;height:100%;min-height:260px"></div>
            <div id="cameraStatusText" style="position:absolute;color:white;font-size:0.75rem;background:rgba(0,0,0,0.65);padding:4px 12px;border-radius:12px;bottom:10px;z-index:10;pointer-events:none">
              Initializing high-speed camera scanner...
            </div>
          </div>
        </div>

        <!-- Submode 2: Photo / Image File Barcode Scanner -->
        <div id="barcodePhotoContainer" style="display:none">
          <div class="barcode-photo-dropzone" id="barcodePhotoDropzone">
            <input type="file" id="barcodePhotoFileInput" accept="image/*" style="display:none">
            <div style="font-size:2.5rem;margin-bottom:8px">🖼️</div>
            <div style="font-weight:700;font-size:0.9375rem;margin-bottom:4px">
              Click to browse or drop a barcode photo here
            </div>
            <div style="font-size:0.75rem;color:var(--text-secondary)">
              Supports photos taken from phone camera, screenshots, or barcode label pictures (.png, .jpg, .webp)
            </div>
          </div>
        </div>

        <!-- Submode 3: USB / Bluetooth Handheld Gun Mode Info -->
        <div id="barcodeUsbContainer" style="display:none">
          <div style="border:1.5px dashed var(--border-color);border-radius:12px;padding:28px 16px;text-align:center;background:var(--bg-hover)">
            <div style="font-size:2.5rem;margin-bottom:8px">🔫</div>
            <div style="font-weight:700;font-size:1rem;margin-bottom:4px">
              USB & Wireless Barcode Gun Listening
            </div>
            <div style="font-size:0.8125rem;color:var(--text-secondary);max-width:440px;margin:0 auto 12px">
              Simply point your physical handheld scanner gun at any product barcode and pull the trigger. StockSense captures hardware scans automatically!
            </div>
            <div class="usb-scanner-badge" style="padding:6px 14px">
              <span class="status-pulse-dot" style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#16a34a;margin-right:6px"></span>
              Hardware keystroke scanner buffer active
            </div>
          </div>
        </div>

        <!-- Direct Barcode / SKU Manual Search Input -->
        <div style="margin-top:14px;display:flex;gap:8px">
          <div style="flex:1;position:relative">
            <i data-lucide="scan" style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--text-tertiary);width:18px;height:18px"></i>
            <input type="text" id="manualBarcodeInput" class="form-input" placeholder="Or type barcode SKU (e.g., 8901030383724)" style="padding-left:38px">
          </div>
          <button class="btn btn-secondary" id="lookupBarcodeBtn">
            <i data-lucide="search"></i> Lookup
          </button>
        </div>

        <!-- Identified Product Opening Stock Confirmation Box -->
        <div id="barcodeMatchArea" style="display:none;margin-top:16px;border:1.5px solid var(--border-color);border-radius:var(--border-radius-lg);padding:16px;background:var(--bg-hover)">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
            <div style="display:flex;align-items:center;gap:10px">
              <span id="barcodeMatchIcon" style="font-size:2.2rem">📦</span>
              <div>
                <h4 id="barcodeMatchName" style="margin:0;font-size:1.05rem"></h4>
                <div id="barcodeMatchSku" class="text-xs text-mono text-secondary"></div>
              </div>
            </div>
            <span class="badge badge-primary">
              <i data-lucide="check-circle" style="width:13px;height:13px"></i> Scanned Successfully
            </span>
          </div>

          <div style="background:var(--bg-card);padding:14px;border-radius:var(--border-radius-md);border:1px solid var(--border-color);text-align:center">
            <label style="font-size:0.8125rem;font-weight:700;display:block;margin-bottom:8px">
              Confirm Actual Physical Stock Count on Store Shelves:
            </label>
            <div class="tactile-stepper-container">
              <button type="button" class="stepper-btn" id="bcStepMinus10">-10</button>
              <button type="button" class="stepper-btn" id="bcStepMinus1">-1</button>
              <input type="number" id="bcStockCountInput" class="stepper-input" value="10" min="0">
              <button type="button" class="stepper-btn" id="bcStepPlus1">+1</button>
              <button type="button" class="stepper-btn" id="bcStepPlus10">+10</button>
            </div>
          </div>

          <div class="opening-stock-verify-box verified" style="margin-top:12px">
            <input type="checkbox" id="bcVerifyCheck" class="verify-checkbox" checked>
            <div>
              <label for="bcVerifyCheck" style="font-weight:700;font-size:0.875rem;cursor:pointer">
                Opening Stock Count Verified
              </label>
              <div style="font-size:0.75rem;color:var(--text-secondary)">
                Confirmed accurate by shopkeeper. Automated reorder calculation activates immediately upon saving.
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    actionSlot.innerHTML = `
      <button class="btn btn-primary" id="saveBarcodeItemBtn" disabled>
        <i data-lucide="check"></i> Confirm Opening Stock & Save
      </button>
    `;

    const statusText = pane.querySelector('#cameraStatusText');
    const barcodeInput = pane.querySelector('#manualBarcodeInput');
    const matchArea = pane.querySelector('#barcodeMatchArea');
    const saveBtn = actionSlot.querySelector('#saveBarcodeItemBtn');
    const cameraBox = pane.querySelector('#barcodeCameraContainer');
    const photoBox = pane.querySelector('#barcodePhotoContainer');
    const usbBox = pane.querySelector('#barcodeUsbContainer');
    const cameraControls = pane.querySelector('#cameraControls');

    // 1. Setup Universal Camera Scanner
    initCameraScanner();

    // 2. Setup USB / Bluetooth Hardware Scanner Gun Listener
    setupUsbScannerListener(onBarcodeDetected);

    // Mode Switchers
    pane.querySelectorAll('.barcode-mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        pane.querySelectorAll('.barcode-mode-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const mode = btn.dataset.mode;

        cameraBox.style.display = mode === 'camera' ? 'block' : 'none';
        photoBox.style.display = mode === 'photo' ? 'block' : 'none';
        usbBox.style.display = mode === 'usb' ? 'block' : 'none';
        cameraControls.style.display = mode === 'camera' ? 'flex' : 'none';

        if (mode === 'camera') {
          initCameraScanner();
        } else {
          stopCamera();
        }
      });
    });

    // Flip Camera (Front / Rear)
    pane.querySelector('#switchCameraFacingBtn')?.addEventListener('click', () => {
      currentFacingMode = currentFacingMode === 'environment' ? 'user' : 'environment';
      initCameraScanner();
    });

    // Photo Upload Scanner
    const photoDropzone = pane.querySelector('#barcodePhotoDropzone');
    const photoInput = pane.querySelector('#barcodePhotoFileInput');

    photoDropzone?.addEventListener('click', () => photoInput.click());
    photoDropzone?.addEventListener('dragover', (e) => { e.preventDefault(); photoDropzone.style.borderColor = 'var(--color-primary)'; });
    photoDropzone?.addEventListener('dragleave', () => { photoDropzone.style.borderColor = 'var(--border-color)'; });
    photoDropzone?.addEventListener('drop', (e) => {
      e.preventDefault();
      photoDropzone.style.borderColor = 'var(--border-color)';
      if (e.dataTransfer.files.length > 0) scanBarcodeImageFile(e.dataTransfer.files[0]);
    });

    photoInput?.addEventListener('change', () => {
      if (photoInput.files.length > 0) scanBarcodeImageFile(photoInput.files[0]);
    });

    function scanBarcodeImageFile(file) {
      if (!file || !file.type.startsWith('image/')) {
        App.showToast('error', 'Invalid File', 'Please select a valid image file (.png, .jpg, .webp).');
        return;
      }

      if (typeof Html5Qrcode === 'undefined') {
        App.showToast('error', 'Scanner Error', 'Barcode decoder library not available.');
        return;
      }

      const tempScanner = new Html5Qrcode('universalBarcodeReader');
      tempScanner.scanFile(file, true)
        .then(decodedText => {
          onBarcodeDetected(decodedText);
          App.showToast('success', 'Barcode Decoded from Photo', `Found barcode: ${decodedText}`);
        })
        .catch(err => {
          App.showToast('warning', 'Barcode Not Found in Image', 'Could not detect a clear barcode in this photo. Please try another angle or enter code manually.');
        });
    }

    // Manual Barcode Input Support
    barcodeInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const code = barcodeInput.value.trim();
        if (code) onBarcodeDetected(code);
      }
    });

    pane.querySelector('#lookupBarcodeBtn')?.addEventListener('click', () => {
      const code = barcodeInput.value.trim();
      if (code) onBarcodeDetected(code);
    });

    function initCameraScanner() {
      stopCamera();
      startCamera('universalBarcodeReader', statusText, onBarcodeDetected, currentFacingMode);
    }

    function onBarcodeDetected(code) {
      playScannerBeep(920, 140);
      barcodeInput.value = code;

      // Check if product exists in DataStore
      let prod = DataStore.products.find(p => p.sku === code || p.sku.toLowerCase() === code.toLowerCase());

      if (!prod) {
        // Create new smart product draft
        prod = {
          name: `Item (${code.slice(-6)})`,
          sku: code,
          category: 'General',
          icon: '📦',
          stock: 12,
          costPrice: 40,
          sellingPrice: 55,
          avgDailySales: 3,
          shelfLifeDays: 180,
          supplierId: 'SUP001'
        };
      }

      currentMatchedProduct = prod;
      matchArea.style.display = 'block';
      pane.querySelector('#barcodeMatchIcon').textContent = prod.icon || '📦';
      pane.querySelector('#barcodeMatchName').textContent = prod.name;
      pane.querySelector('#barcodeMatchSku').textContent = `Barcode SKU: ${code}`;
      pane.querySelector('#bcStockCountInput').value = prod.stock || 10;
      saveBtn.disabled = false;
      lucide.createIcons();

      // Gentle voice announcement
      speakFeedback(`${prod.name}. Barcode detected.`);
    }

    // Stepper Handlers
    const stockInput = pane.querySelector('#bcStockCountInput');
    pane.querySelector('#bcStepMinus10')?.addEventListener('click', () => { stockInput.value = Math.max(0, parseInt(stockInput.value || 0) - 10); });
    pane.querySelector('#bcStepMinus1')?.addEventListener('click', () => { stockInput.value = Math.max(0, parseInt(stockInput.value || 0) - 1); });
    pane.querySelector('#bcStepPlus1')?.addEventListener('click', () => { stockInput.value = parseInt(stockInput.value || 0) + 1; });
    pane.querySelector('#bcStepPlus10')?.addEventListener('click', () => { stockInput.value = parseInt(stockInput.value || 0) + 10; });

    saveBtn.onclick = async () => {
      if (!currentMatchedProduct) return;
      const verifiedStock = parseInt(stockInput.value) || 0;
      const isVerified = pane.querySelector('#bcVerifyCheck')?.checked ?? true;

      const toSave = {
        ...currentMatchedProduct,
        stock: verifiedStock,
        openingStockVerified: isVerified
      };

      await API.Products.create(toSave);
      stopCamera();
      modal.close();
      renderTable();
      App.showToast('success', 'Barcode Intake Complete', `${toSave.name} opening stock verified: ${verifiedStock} units.`);

      // Step 5: Automatically trigger reorder calculation baseline!
      triggerAutoReorderCheck(1, false);
    };
  }

  // ── METHOD 4: SMALL SHOPS (TAMIL VOICE & PICTURE-BASED ENTRY) ──
  function renderVoiceVisualTab(pane, actionSlot, modal) {
    let selectedCategory = 'Dairy';
    let selectedIcon = '🥛';
    let recognition = null;
    let isListening = false;

    pane.innerHTML = `
      <div>
        <div style="margin-bottom:14px">
          <h3 style="margin:0;font-size:1.1rem">சிறிய கடைகளுக்கான குரல் & படப் பதிவு (Voice & Picture Entry)</h3>
          <p style="margin:2px 0 0;font-size:0.78rem;color:var(--text-secondary)">
            எளிய கடைக்காரர்களுக்காக: படத்தை தொடவும் அல்லது தமிழில் பேசி இருப்பு எண்ணிக்கையை உறுதிப்படுத்தவும்.
          </p>
        </div>

        <!-- Tamil Voice Input Action Button -->
        <button type="button" class="tamil-voice-entry-btn" id="tamilVoiceBtn">
          <i data-lucide="mic" style="width:24px;height:24px"></i>
          <span id="tamilVoiceBtnText">தமிழில் பேசுங்கள் (Speak in Tamil: எ.கா: "பால் 15 பாக்கெட்")</span>
        </button>

        <div id="tamilVoiceTranscript" style="margin:8px 0 14px;padding:8px 12px;border-radius:var(--border-radius-md);background:var(--bg-hover);font-size:0.8125rem;color:var(--text-secondary);min-height:36px;display:flex;align-items:center">
          <span style="color:var(--text-tertiary)">கேட்கப்பட்ட வார்த்தை இங்கே தெரியும் (Transcript will appear here)...</span>
        </div>

        <!-- Picture & Category Touch Grid -->
        <label style="font-size:0.8125rem;font-weight:700;margin-bottom:8px;display:block">
          பொருளின் வகையை தேர்வு செய்க (Select Picture):
        </label>
        <div class="visual-category-grid" id="visualCategoryGrid">
          <div class="visual-category-card selected" data-cat="Dairy" data-icon="🥛" data-tamil="பால் / தயிர்">
            <span class="visual-category-icon">🥛</span>
            <span class="visual-category-tamil">பால் & தயிர்</span>
            <span class="visual-category-english">Dairy</span>
          </div>
          <div class="visual-category-card" data-cat="Vegetables" data-icon="🍅" data-tamil="காய்கறிகள்">
            <span class="visual-category-icon">🍅</span>
            <span class="visual-category-tamil">காய்கறிகள்</span>
            <span class="visual-category-english">Vegetables</span>
          </div>
          <div class="visual-category-card" data-cat="Grains & Staples" data-icon="🍚" data-tamil="அரிசி / தானியம்">
            <span class="visual-category-icon">🍚</span>
            <span class="visual-category-tamil">அரிசி & தானியம்</span>
            <span class="visual-category-english">Rice & Grains</span>
          </div>
          <div class="visual-category-card" data-cat="Bakery" data-icon="🍞" data-tamil="ரொட்டி">
            <span class="visual-category-icon">🍞</span>
            <span class="visual-category-tamil">ரொட்டி / பிரெட்</span>
            <span class="visual-category-english">Bakery</span>
          </div>
          <div class="visual-category-card" data-cat="Cooking Essentials" data-icon="🫒" data-tamil="எண்ணெய்">
            <span class="visual-category-icon">🫒</span>
            <span class="visual-category-tamil">சமையல் எண்ணெய்</span>
            <span class="visual-category-english">Cooking Oil</span>
          </div>
          <div class="visual-category-card" data-cat="Snacks" data-icon="🍪" data-tamil="பிஸ்கட் / நொறுக்குத்தீனி">
            <span class="visual-category-icon">🍪</span>
            <span class="visual-category-tamil">பிஸ்கட்</span>
            <span class="visual-category-english">Biscuits</span>
          </div>
          <div class="visual-category-card" data-cat="Beverages" data-icon="🍵" data-tamil="தேநீர் / காபி">
            <span class="visual-category-icon">🍵</span>
            <span class="visual-category-tamil">தேநீர் & காபி</span>
            <span class="visual-category-english">Tea & Coffee</span>
          </div>
          <div class="visual-category-card" data-cat="Personal Care" data-icon="🧼" data-tamil="சோப்பு">
            <span class="visual-category-icon">🧼</span>
            <span class="visual-category-tamil">சோப்பு</span>
            <span class="visual-category-english">Soap</span>
          </div>
          <div class="visual-category-card" data-cat="Grains & Staples" data-icon="🫘" data-tamil="பருப்பு வகைகள்">
            <span class="visual-category-icon">🫘</span>
            <span class="visual-category-tamil">பருப்பு வகைகள்</span>
            <span class="visual-category-english">Dals & Pulses</span>
          </div>
          <div class="visual-category-card" data-cat="Dairy" data-icon="🥚" data-tamil="முட்டை">
            <span class="visual-category-icon">🥚</span>
            <span class="visual-category-tamil">முட்டை</span>
            <span class="visual-category-english">Farm Eggs</span>
          </div>
        </div>

        <!-- Entry Form with Tactile Stepper -->
        <div style="background:var(--bg-hover);padding:16px;border-radius:var(--border-radius-lg);border:1px solid var(--border-color)">
          <div class="form-row">
            <div class="form-group" style="flex:2">
              <label class="form-label font-bold">பொருள் பெயர் (Item Name)</label>
              <input class="form-input" id="voiceProdNameInput" value="பால் 1 லிட்டர் (Full Cream Milk 1L)">
            </div>
            <div class="form-group" style="flex:1">
              <label class="form-label font-bold">விற்பனை விலை (Price ₹)</label>
              <input class="form-input" id="voiceProdPriceInput" type="number" value="68">
            </div>
          </div>

          <div style="text-align:center;margin-top:10px">
            <label class="form-label font-bold" style="font-size:0.9375rem">
              தற்போதைய ஆரம்ப இருப்பு (Opening Shelf Count):
            </label>
            <div class="tactile-stepper-container">
              <button type="button" class="stepper-btn" id="voiceStepMinus10">-10</button>
              <button type="button" class="stepper-btn" id="voiceStepMinus1">-1</button>
              <input type="number" id="voiceStockCountInput" class="stepper-input" value="15" min="0">
              <button type="button" class="stepper-btn" id="voiceStepPlus1">+1</button>
              <button type="button" class="stepper-btn" id="voiceStepPlus10">+10</button>
            </div>
          </div>
        </div>

        <div class="opening-stock-verify-box verified" style="margin-top:12px">
          <input type="checkbox" id="voiceVerifyCheck" class="verify-checkbox" checked>
          <div>
            <label for="voiceVerifyCheck" style="font-weight:700;font-size:0.875rem;cursor:pointer">
              இருப்பு சரிபார்க்கப்பட்டது (Opening Stock Count Verified)
            </label>
            <div style="font-size:0.75rem;color:var(--text-secondary)">
              கடையின் அலமாரியில் உள்ள நேரடி எண்ணிக்கையுடன் ஒத்துப்போகிறது.
            </div>
          </div>
        </div>
      </div>
    `;

    actionSlot.innerHTML = `
      <button class="btn btn-primary" id="saveVoiceProductBtn">
        <i data-lucide="check"></i> பொருளை சேமித்து ரீஆர்டர் கணக்கிடு (Save & Calculate Reorder)
      </button>
    `;

    // Picture Grid Click Handling
    const cards = pane.querySelectorAll('.visual-category-card');
    cards.forEach(card => {
      card.addEventListener('click', () => {
        cards.forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        selectedCategory = card.dataset.cat;
        selectedIcon = card.dataset.icon;
        pane.querySelector('#voiceProdNameInput').value = `${card.dataset.tamil}`;
        playScannerBeep(750, 80);
      });
    });

    // Tactile Stepper
    const stockIn = pane.querySelector('#voiceStockCountInput');
    pane.querySelector('#voiceStepMinus10')?.addEventListener('click', () => { stockIn.value = Math.max(0, parseInt(stockIn.value || 0) - 10); });
    pane.querySelector('#voiceStepMinus1')?.addEventListener('click', () => { stockIn.value = Math.max(0, parseInt(stockIn.value || 0) - 1); });
    pane.querySelector('#voiceStepPlus1')?.addEventListener('click', () => { stockIn.value = parseInt(stockIn.value || 0) + 1; });
    pane.querySelector('#voiceStepPlus10')?.addEventListener('click', () => { stockIn.value = parseInt(stockIn.value || 0) + 10; });

    // Tamil Speech Recognition Setup
    const voiceBtn = pane.querySelector('#tamilVoiceBtn');
    const voiceBtnText = pane.querySelector('#tamilVoiceBtnText');
    const transcriptEl = pane.querySelector('#tamilVoiceTranscript');

    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (SpeechRec) {
      recognition = new SpeechRec();
      recognition.lang = 'ta-IN'; // Tamil (India)
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        isListening = true;
        voiceBtn.classList.add('listening');
        voiceBtnText.textContent = 'பேசுங்கள்... கேட்கிறது (Listening in Tamil...)';
      };

      recognition.onresult = (event) => {
        const text = event.results[0][0].transcript.trim();
        transcriptEl.innerHTML = `<span style="color:var(--color-primary);font-weight:600">கேட்கப்பட்டது: "${text}"</span>`;

        // Parse Tamil Speech
        parseTamilProductSpeech(text, (parsed) => {
          if (parsed.name) pane.querySelector('#voiceProdNameInput').value = parsed.name;
          if (parsed.stock) pane.querySelector('#voiceStockCountInput').value = parsed.stock;
          if (parsed.category) {
            selectedCategory = parsed.category;
            selectedIcon = parsed.icon || '📦';
            cards.forEach(c => c.classList.toggle('selected', c.dataset.cat === parsed.category));
          }
          speakFeedback(`${parsed.name || 'பொருள்'} இருப்பு ${parsed.stock || 10} தயார்.`);
        });
      };

      recognition.onerror = () => {
        isListening = false;
        voiceBtn.classList.remove('listening');
        voiceBtnText.textContent = 'தமிழில் பேசுங்கள் (Speak in Tamil)';
      };

      recognition.onend = () => {
        isListening = false;
        voiceBtn.classList.remove('listening');
        voiceBtnText.textContent = 'தமிழில் பேசுங்கள் (Speak in Tamil)';
      };

      voiceBtn.addEventListener('click', () => {
        if (isListening) {
          recognition.stop();
        } else {
          try {
            recognition.start();
          } catch (e) {
            // Already active
          }
        }
      });
    } else {
      voiceBtn.addEventListener('click', () => {
        App.showToast('info', 'Voice Not Supported', 'Web speech API is not supported in this browser. Please use picture touch or manual entry.');
      });
    }

    actionSlot.querySelector('#saveVoiceProductBtn')?.addEventListener('click', async () => {
      const name = pane.querySelector('#voiceProdNameInput').value.trim() || 'புதிய பொருள்';
      const stock = parseInt(stockIn.value) || 0;
      const price = parseFloat(pane.querySelector('#voiceProdPriceInput').value) || 50;
      const isVerified = pane.querySelector('#voiceVerifyCheck')?.checked ?? true;

      const newProd = {
        name,
        sku: `ITEM-${Date.now().toString().slice(-6)}`,
        category: selectedCategory,
        icon: selectedIcon,
        stock,
        costPrice: Math.round(price * 0.75),
        sellingPrice: price,
        avgDailySales: 4,
        shelfLifeDays: selectedCategory === 'Dairy' ? 7 : selectedCategory === 'Vegetables' ? 7 : 180,
        supplierId: 'SUP001',
        openingStockVerified: isVerified
      };

      await API.Products.create(newProd);
      modal.close();
      renderTable();

      speakFeedback(`${name} சேர்க்கப்பட்டது. ரீஆர்டர் கணக்கீடு முடிந்தது.`);
      App.showToast('success', 'பொருள் சேர்க்கப்பட்டது', `${name} - இருப்பு ${stock} சரிபார்க்கப்பட்டு பதிவு செய்யப்பட்டது.`);

      // Step 5: Automatically trigger reorder calculation
      triggerAutoReorderCheck(1, false);
    });
  }

  // ── Helper: Parse Tamil Spoken Command ──
  function parseTamilProductSpeech(transcript, callback) {
    const text = transcript.toLowerCase();
    let name = '';
    let stock = 10;
    let category = 'General';
    let icon = '📦';

    // Tamil number words parser
    const tamilNumMap = {
      'ஒன்று': 1, 'இரண்டு': 2, 'மூன்று': 3, 'நான்கு': 4, 'ஐந்து': 5,
      'ஆறு': 6, 'ஏழு': 7, 'எட்டு': 8, 'ஒன்பது': 9, 'பத்து': 10,
      'இருபது': 20, 'முப்பது': 30, 'நாற்பது': 40, 'ஐம்பது': 50
    };

    // Extract digits
    const digitMatch = text.match(/\d+/);
    if (digitMatch) {
      stock = parseInt(digitMatch[0]);
    } else {
      for (const [tWord, num] of Object.entries(tamilNumMap)) {
        if (text.includes(tWord)) {
          stock = num;
          break;
        }
      }
    }

    // Keyword detection
    if (text.includes('பால்') || text.includes('milk')) {
      name = 'பால் 1 லிட்டர் (Milk 1L)';
      category = 'Dairy';
      icon = '🥛';
    } else if (text.includes('தக்காளி') || text.includes('tomato')) {
      name = 'தக்காளி (Fresh Tomatoes)';
      category = 'Vegetables';
      icon = '🍅';
    } else if (text.includes('அரிசி') || text.includes('rice') || text.includes('சாப்பாடு')) {
      name = 'பாசுமதி அரிசி 5கிலோ (Rice 5kg)';
      category = 'Grains & Staples';
      icon = '🍚';
    } else if (text.includes('பிரெட்') || text.includes('ரொட்டி') || text.includes('bread')) {
      name = 'வெள்ளை ரொட்டி (White Bread)';
      category = 'Bakery';
      icon = '🍞';
    } else if (text.includes('முட்டை') || text.includes('egg')) {
      name = 'பண்ணை முட்டை (Farm Eggs 12 pack)';
      category = 'Dairy';
      icon = '🥚';
    } else if (text.includes('எண்ணெய்') || text.includes('oil')) {
      name = 'சமையல் எண்ணெய் 1L (Cooking Oil 1L)';
      category = 'Cooking Essentials';
      icon = '🫒';
    } else if (text.includes('பருப்பு') || text.includes('dal')) {
      name = 'துவரம் பருப்பு 1கிலோ (Toor Dal 1kg)';
      category = 'Grains & Staples';
      icon = '🫘';
    } else if (text.includes('பிஸ்கட்') || text.includes('biscuit')) {
      name = 'பிஸ்கட் பாக்கெட் (Biscuits)';
      category = 'Snacks';
      icon = '🍪';
    } else {
      name = transcript;
    }

    callback({ name, stock, category, icon });
  }

  // ── UNIVERSAL CAMERA & USB HARDWARE BARCODE SCANNER CONTROLLER (ALL ACCESS) ──
  async function startCamera(elementId, statusText, onDetectedCallback, facingMode = 'environment') {
    if (typeof Html5Qrcode === 'undefined') {
      if (statusText) statusText.textContent = 'Scanner library loading or unavailable. Use manual input or photo upload.';
      return;
    }

    try {
      if (html5QrCodeScanner) {
        try {
          if (html5QrCodeScanner.isScanning) await html5QrCodeScanner.stop();
          await html5QrCodeScanner.clear();
        } catch (e) {}
        html5QrCodeScanner = null;
      }

      html5QrCodeScanner = new Html5Qrcode(elementId);

      const config = {
        fps: 15,
        qrbox: { width: 280, height: 160 },
        aspectRatio: 1.333
      };

      if (statusText) statusText.textContent = 'Accessing camera...';

      await html5QrCodeScanner.start(
        { facingMode: facingMode },
        config,
        (decodedText) => {
          if (decodedText) onDetectedCallback(decodedText);
        },
        () => {
          // Frame not detected (normal in video scan loop)
        }
      );

      if (statusText) statusText.textContent = 'Point camera directly at product barcode';
    } catch (err) {
      console.warn('Camera scan start warning:', err);
      if (statusText) {
        statusText.textContent = 'Camera access restricted or unavailable. Use photo scan or USB scanner gun.';
      }
    }
  }

  function setupUsbScannerListener(onDetectedCallback) {
    if (usbScannerListener) {
      window.removeEventListener('keydown', usbScannerListener);
      usbScannerListener = null;
    }

    let usbBuffer = '';
    let lastKeyTime = Date.now();

    usbScannerListener = (e) => {
      // Don't intercept if user is typing into other inputs like name or price
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA') && activeEl.id !== 'manualBarcodeInput') {
        return;
      }

      const currentTime = Date.now();
      const diff = currentTime - lastKeyTime;
      lastKeyTime = currentTime;

      if (e.key === 'Enter') {
        if (usbBuffer.length >= 3 && diff < 100) {
          e.preventDefault();
          const scannedCode = usbBuffer.trim();
          usbBuffer = '';
          onDetectedCallback(scannedCode);
        } else {
          usbBuffer = '';
        }
        return;
      }

      if (e.key && e.key.length === 1) {
        if (diff > 90) {
          usbBuffer = e.key;
        } else {
          usbBuffer += e.key;
        }
      }
    };

    window.addEventListener('keydown', usbScannerListener);
  }

  function stopCamera() {
    if (html5QrCodeScanner) {
      try {
        if (html5QrCodeScanner.isScanning) {
          html5QrCodeScanner.stop().catch(() => {});
        }
        html5QrCodeScanner.clear().catch(() => {});
      } catch (e) {}
      html5QrCodeScanner = null;
    }
    if (barcodeScanInterval) {
      clearInterval(barcodeScanInterval);
      barcodeScanInterval = null;
    }
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      cameraStream = null;
    }
    if (usbScannerListener) {
      window.removeEventListener('keydown', usbScannerListener);
      usbScannerListener = null;
    }
  }

  // ── STEP 5: AUTOMATIC REORDER CALCULATION TRIGGER ──
  async function triggerAutoReorderCheck(itemCount, isBulk = false) {
    try {
      const planRes = await API.Reorder.generatePlan();
      const plan = planRes.data;
      const needReorderCount = plan.recommendations.filter(r => r.suggestedQty > 0).length;
      const totalEstimatedCost = plan.summary.totalInvestment || plan.summary.totalEstimatedCost || 0;

      // Ensure badges update across the entire application immediately
      if (window.App && App.updateReorderBadges) App.updateReorderBadges();

      const modal = App.showModal({
        title: 'Automatic Reorder Calculation Activated',
        size: 'modal-md',
        content: `
          <div class="reorder-trigger-modal">
            <div class="reorder-trigger-icon">
              <i data-lucide="calculator" style="width:36px;height:36px"></i>
            </div>
            <h3 style="margin-bottom:8px">Automatic Reorder Plan Calculated!</h3>
            <p style="color:var(--text-secondary);font-size:0.875rem;margin-bottom:20px">
              Product data has been checked and saved. StockSense automatically evaluated your shelf inventory baseline against lead times, safety stock buffers, and forecasted demand.
            </p>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px;text-align:left">
              <div style="background:var(--bg-hover);padding:14px;border-radius:var(--border-radius-md);border:1px solid var(--border-color)">
                <div style="font-size:0.75rem;color:var(--text-secondary)">Products Intake</div>
                <div style="font-size:1.4rem;font-weight:800;color:var(--color-primary)">${itemCount}</div>
                <div style="font-size:0.7rem;color:var(--text-tertiary)">Verified opening baseline</div>
              </div>

              <div style="background:${needReorderCount > 0 ? '#fff7ed' : '#f0fdf4'};padding:14px;border-radius:var(--border-radius-md);border:1px solid ${needReorderCount > 0 ? '#ffedd5' : '#dcfce7'}">
                <div style="font-size:0.75rem;color:${needReorderCount > 0 ? '#9a3412' : '#166534'}">Replenishment Needed</div>
                <div style="font-size:1.4rem;font-weight:800;color:${needReorderCount > 0 ? '#ea580c' : '#16a34a'}">${needReorderCount} Items</div>
                <div style="font-size:0.7rem;color:${needReorderCount > 0 ? '#c2410c' : '#15803d'}">Below safe buffer level</div>
              </div>
            </div>

            ${needReorderCount > 0 ? `
              <div style="padding:12px;border-radius:var(--border-radius-md);background:#eff6ff;color:#1e40af;font-size:0.8125rem;margin-bottom:16px;text-align:left;display:flex;align-items:center;gap:10px">
                <i data-lucide="info" style="width:20px;height:20px;flex-shrink:0"></i>
                <span>Est. replenishment order value: <strong>${DataStore.formatCurrency(totalEstimatedCost)}</strong>. Orders can be generated directly via 1-tap WhatsApp.</span>
              </div>
            ` : `
              <div style="padding:12px;border-radius:var(--border-radius-md);background:#f0fdf4;color:#166534;font-size:0.8125rem;margin-bottom:16px;text-align:left;display:flex;align-items:center;gap:10px">
                <i data-lucide="shield-check" style="width:20px;height:20px;flex-shrink:0"></i>
                <span>All intake items are currently at safe stock levels. Reorders will be suggested automatically as daily sales occur.</span>
              </div>
            `}
          </div>
        `,
        footer: `
          <button class="btn btn-secondary" id="stayInInventoryBtn">Stay in Inventory</button>
          <button class="btn btn-primary" id="goToReorderPlanBtn">
            <i data-lucide="shopping-cart"></i> View Reorder Plan →
          </button>
        `
      });

      lucide.createIcons();

      modal.overlay.querySelector('#stayInInventoryBtn')?.addEventListener('click', modal.close);
      modal.overlay.querySelector('#goToReorderPlanBtn')?.addEventListener('click', () => {
        modal.close();
        App.navigateTo('reorder');
      });
    } catch (e) {
      console.warn('Reorder trigger error:', e);
    }
  }

  // ── Prompt to Verify Shelf Stock on Individual Unverified Items ──
  function verifyStockPrompt(productId) {
    const prod = DataStore.getProduct(productId);
    if (!prod) return;

    const modal = App.showModal({
      title: 'Verify Physical Opening Stock',
      size: 'modal-sm',
      content: `
        <div style="text-align:center;padding:10px 0">
          <div style="font-size:2.5rem;margin-bottom:6px">${prod.icon || '📦'}</div>
          <h3 style="margin:0">${prod.name}</h3>
          <div class="text-xs text-mono text-secondary" style="margin-top:2px">${prod.sku}</div>

          <div style="margin:20px 0">
            <label style="font-size:0.8125rem;font-weight:700;display:block;margin-bottom:8px">
              Actual Physical Shelf Count (Units):
            </label>
            <div class="tactile-stepper-container">
              <button type="button" class="stepper-btn" id="vStepMinus10">-10</button>
              <button type="button" class="stepper-btn" id="vStepMinus1">-1</button>
              <input type="number" id="vStockInput" class="stepper-input" value="${prod.stock}" min="0">
              <button type="button" class="stepper-btn" id="vStepPlus1">+1</button>
              <button type="button" class="stepper-btn" id="vStepPlus10">+10</button>
            </div>
          </div>
          <p style="font-size:0.75rem;color:var(--text-secondary);margin:0">
            Confirming this baseline ensures automated reorder calculation generates accurate purchase orders.
          </p>
        </div>
      `,
      footer: `
        <button class="btn btn-secondary" id="cancelVerifyBtn">Cancel</button>
        <button class="btn btn-primary" id="confirmVerifyBtn"><i data-lucide="check"></i> Confirm Count & Recalculate</button>
      `
    });

    lucide.createIcons();

    const inp = modal.overlay.querySelector('#vStockInput');
    modal.overlay.querySelector('#vStepMinus10')?.addEventListener('click', () => { inp.value = Math.max(0, parseInt(inp.value || 0) - 10); });
    modal.overlay.querySelector('#vStepMinus1')?.addEventListener('click', () => { inp.value = Math.max(0, parseInt(inp.value || 0) - 1); });
    modal.overlay.querySelector('#vStepPlus1')?.addEventListener('click', () => { inp.value = parseInt(inp.value || 0) + 1; });
    modal.overlay.querySelector('#vStepPlus10')?.addEventListener('click', () => { inp.value = parseInt(inp.value || 0) + 10; });

    modal.overlay.querySelector('#cancelVerifyBtn')?.addEventListener('click', modal.close);
    modal.overlay.querySelector('#confirmVerifyBtn')?.addEventListener('click', async () => {
      const confirmedStock = parseInt(inp.value) || 0;
      await API.Products.update(productId, { stock: confirmedStock, openingStockVerified: true });
      modal.close();
      renderTable();
      App.showToast('success', 'Stock Verified', `${prod.name} baseline verified at ${confirmedStock} units.`);
      triggerAutoReorderCheck(1, false);
    });
  }

  // ── CSV / Text Parsing Helper ──
  function parseCsvText(csvText) {
    const lines = csvText.trim().split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length < 2) return [];

    const delimiter = lines[0].includes('\t') ? '\t' : lines[0].includes(';') ? ';' : ',';
    const rawHeaders = lines[0].split(delimiter).map(h => h.trim().replace(/^["']|["']$/g, '').toLowerCase());

    function findCol(keywords) {
      for (const kw of keywords) {
        const idx = rawHeaders.findIndex(h => h === kw || h.includes(kw));
        if (idx !== -1) return idx;
      }
      return -1;
    }

    const skuIdx = findCol(['sku', 'code', 'barcode', 'id', 'item_code']);
    const nameIdx = findCol(['name', 'product_name', 'product', 'item', 'title', 'description']);
    const catIdx = findCol(['category', 'dept', 'department', 'type', 'group']);
    const stockIdx = findCol(['stock', 'qty', 'quantity', 'opening_stock', 'current_stock', 'count', 'units']);
    const costIdx = findCol(['cost', 'cost_price', 'buying_price', 'purchase_price', 'cp']);
    const priceIdx = findCol(['price', 'selling_price', 'sale_price', 'mrp', 'retail_price', 'sp']);
    const salesIdx = findCol(['daily_sales', 'avg_daily', 'avg_daily_sales', 'sales_rate']);
    const shelfIdx = findCol(['shelf_life', 'shelf_life_days', 'expiry_days']);
    const ropIdx = findCol(['reorder_level', 'reorder_point', 'rop', 'min_stock']);

    const results = [];

    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(delimiter).map(p => p.trim().replace(/^["']|["']$/g, ''));
      if (parts.length < 2) continue;

      const name = nameIdx !== -1 ? parts[nameIdx] : parts[0];
      const sku = skuIdx !== -1 && parts[skuIdx] ? parts[skuIdx] : `SKU-${Date.now().toString().slice(-5)}-${i}`;
      if (!name) continue;

      const stock = stockIdx !== -1 ? parseInt(parts[stockIdx]) || 0 : 10;
      const costPrice = costIdx !== -1 ? parseFloat(parts[costIdx]) || 40 : 40;
      const sellingPrice = priceIdx !== -1 ? parseFloat(parts[priceIdx]) || Math.round(costPrice * 1.3) : Math.round(costPrice * 1.3);
      const avgDailySales = salesIdx !== -1 ? parseInt(parts[salesIdx]) || 3 : 3;
      const shelfLifeDays = shelfIdx !== -1 ? parseInt(parts[shelfIdx]) || 180 : 180;
      const reorderLevel = ropIdx !== -1 ? parseInt(parts[ropIdx]) || 10 : 10;
      const category = catIdx !== -1 && parts[catIdx] ? parts[catIdx] : 'General';

      results.push({
        name,
        sku,
        category,
        stock,
        costPrice,
        sellingPrice,
        avgDailySales,
        shelfLifeDays,
        reorderLevel,
        icon: getCategoryEmoji(category),
        supplierId: 'SUP001'
      });
    }

    return results;
  }

  function getCategoryEmoji(cat = '') {
    const c = cat.toLowerCase();
    if (c.includes('dairy') || c.includes('milk')) return '🥛';
    if (c.includes('veg') || c.includes('fruit')) return '🍅';
    if (c.includes('grain') || c.includes('rice') || c.includes('staple')) return '🍚';
    if (c.includes('bake') || c.includes('bread')) return '🍞';
    if (c.includes('oil')) return '🫒';
    if (c.includes('snack') || c.includes('biscuit')) return '🍪';
    if (c.includes('bev') || c.includes('tea') || c.includes('coffee')) return '🍵';
    if (c.includes('soap') || c.includes('clean') || c.includes('personal')) return '🧼';
    return '📦';
  }

  function downloadCsvTemplate() {
    const headers = ['sku', 'name', 'category', 'stock', 'costPrice', 'sellingPrice', 'avgDailySales', 'shelfLifeDays', 'reorderLevel', 'supplierName'];
    const sampleRows = [
      { sku: 'RICE-BAS-5KG', name: 'Basmati Rice 5kg', category: 'Grains & Staples', stock: 40, costPrice: 320, sellingPrice: 399, avgDailySales: 6, shelfLifeDays: 365, reorderLevel: 15, supplierName: 'Annapurna Foods & Staples' },
      { sku: 'DAI-MILK-1L', name: 'Full Cream Milk 1L', category: 'Dairy', stock: 25, costPrice: 54, sellingPrice: 68, avgDailySales: 16, shelfLifeDays: 7, reorderLevel: 20, supplierName: 'FreshFarm Dairy & Agro' },
      { sku: 'OIL-SUN-1L', name: 'Sunflower Oil 1L', category: 'Cooking Essentials', stock: 30, costPrice: 135, sellingPrice: 175, avgDailySales: 5, shelfLifeDays: 180, reorderLevel: 12, supplierName: 'Metro Wholesale Super-Mart' }
    ];
    App.exportCSV(headers, sampleRows, 'stocksense_inventory_template.csv');
    App.showToast('success', 'Template Downloaded', 'Template saved with standard retail headers');
  }

  // ── Existing Product Detail & Adjustment Helpers ──
  function viewProduct(id) {
    const p = DataStore.getProduct(id);
    if (!p) return;
    const status = DataStore.getStockStatus(p);
    const supplier = DataStore.getSupplier(p.supplierId);
    const expiryDays = DataStore.daysUntil(p.expiryDate);
    const profit = p.sellingPrice - p.costPrice;
    const margin = p.sellingPrice > 0 ? ((profit / p.sellingPrice) * 100).toFixed(1) : 0;

    App.showDrawer({
      title: 'Product Details',
      content: `
        <div style="text-align:center;padding:16px 0">
          <div style="font-size:3rem;margin-bottom:8px">${p.icon || '📦'}</div>
          <h3>${p.name}</h3>
          <div class="text-mono text-secondary" style="margin-top:4px">${p.sku}</div>
          <div style="margin-top:8px;display:flex;justify-content:center;gap:6px">
            <span class="badge ${status.class} badge-dot">${status.label}</span>
            <span class="badge ${p.openingStockVerified !== false ? 'badge-success' : 'badge-warning'} badge-dot">
              ${p.openingStockVerified !== false ? 'Opening Count Verified' : 'Unverified Count'}
            </span>
          </div>
        </div>
        <div class="section-divider"></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;font-size:0.8125rem">
          <div><div class="text-tertiary text-xs">Category</div><div class="font-medium">${p.category}</div></div>
          <div><div class="text-tertiary text-xs">Current Stock</div><div class="font-medium"><strong>${p.stock} units</strong></div></div>
          <div><div class="text-tertiary text-xs">Avg Daily Sales</div><div class="font-medium">${p.avgDailySales} units/day</div></div>
          <div><div class="text-tertiary text-xs">Days of Stock</div><div class="font-medium">${p.avgDailySales > 0 ? Math.round(p.stock / p.avgDailySales) : '∞'} days</div></div>
          <div><div class="text-tertiary text-xs">Reorder Level (ROP)</div><div class="font-medium">${p.reorderLevel} units</div></div>
          <div><div class="text-tertiary text-xs">Incoming Stock</div><div class="font-medium">${p.incomingStock || 0} units</div></div>
          <div><div class="text-tertiary text-xs">Cost Price</div><div class="font-medium">${DataStore.formatCurrency(p.costPrice)}</div></div>
          <div><div class="text-tertiary text-xs">Selling Price</div><div class="font-medium">${DataStore.formatCurrency(p.sellingPrice)}</div></div>
          <div><div class="text-tertiary text-xs">Gross Margin</div><div class="font-medium text-success">${DataStore.formatCurrency(profit)} (${margin}%)</div></div>
          <div><div class="text-tertiary text-xs">Supplier</div><div class="font-medium">${supplier ? supplier.name : '—'}</div></div>
          <div><div class="text-tertiary text-xs">Lead Time</div><div class="font-medium">${supplier ? supplier.leadTime + ' days' : '—'}</div></div>
          <div><div class="text-tertiary text-xs">Shelf Life</div><div class="font-medium">${p.shelfLifeDays} days</div></div>
          <div><div class="text-tertiary text-xs">Expiry Date</div><div class="font-medium ${expiryDays <= 7 ? 'text-danger' : ''}">${p.expiryDate ? DataStore.formatDate(p.expiryDate) + ` (${expiryDays}d)` : '—'}</div></div>
          <div><div class="text-tertiary text-xs">Inventory Value</div><div class="font-medium">${DataStore.formatCurrency(p.stock * p.costPrice)}</div></div>
        </div>
        <div class="flex gap-sm">
          <button class="btn btn-secondary w-full" onclick="InventoryModule.adjustStock('${p.id}')"><i data-lucide="package-plus"></i> Adjust Stock</button>
          <button class="btn btn-primary w-full" onclick="InventoryModule.editProduct('${p.id}')"><i data-lucide="pencil"></i> Edit Product</button>
        </div>
        <div style="margin-top:10px">
          <button class="btn btn-outline text-danger w-full" onclick="InventoryModule.deleteProductConfirm('${p.id}')"><i data-lucide="trash-2"></i> Delete Product</button>
        </div>
      `,
    });
    lucide.createIcons();
  }

  function editProduct(id) {
    const product = DataStore.getProduct(id);
    if (!product) return;

    const modal = App.showModal({
      title: 'Edit Product Details',
      size: 'modal-lg',
      content: `
        <form id="editProductForm">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Product Name <span class="required">*</span></label>
              <input class="form-input" name="name" value="${product.name || ''}" required>
            </div>
            <div class="form-group">
              <label class="form-label">SKU <span class="required">*</span></label>
              <input class="form-input" name="sku" value="${product.sku || ''}" required>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Category</label>
              <select class="form-select" name="category">
                ${DataStore.categories.map(c => `<option value="${c}" ${product.category === c ? 'selected' : ''}>${c}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Icon</label>
              <input class="form-input" name="icon" value="${product.icon || '📦'}" maxlength="4" style="text-align:center">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Current Stock</label>
              <input class="form-input font-bold" name="stock" type="number" min="0" value="${product.stock}">
            </div>
            <div class="form-group">
              <label class="form-label">Reorder Level (ROP)</label>
              <input class="form-input" name="reorderLevel" type="number" min="0" value="${product.reorderLevel}">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Cost Price (₹)</label>
              <input class="form-input" name="costPrice" type="number" step="0.5" value="${product.costPrice}">
            </div>
            <div class="form-group">
              <label class="form-label">Selling Price (₹)</label>
              <input class="form-input" name="sellingPrice" type="number" step="0.5" value="${product.sellingPrice}">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Avg Daily Sales</label>
              <input class="form-input" name="avgDailySales" type="number" min="0" value="${product.avgDailySales}">
            </div>
            <div class="form-group">
              <label class="form-label">Shelf Life (days)</label>
              <input class="form-input" name="shelfLifeDays" type="number" min="1" value="${product.shelfLifeDays}">
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Supplier</label>
            <select class="form-select" name="supplierId">
              ${DataStore.suppliers.map(s => `<option value="${s.id}" ${product.supplierId === s.id ? 'selected' : ''}>${s.name}</option>`).join('')}
            </select>
          </div>
        </form>
      `,
      footer: `
        <button class="btn btn-secondary" id="cancelEditBtn">Cancel</button>
        <button class="btn btn-primary" id="saveEditBtn"><i data-lucide="check"></i> Save Changes</button>
      `
    });

    lucide.createIcons();

    modal.overlay.querySelector('#cancelEditBtn')?.addEventListener('click', modal.close);
    modal.overlay.querySelector('#saveEditBtn')?.addEventListener('click', async () => {
      const form = modal.overlay.querySelector('#editProductForm');
      const formData = new FormData(form);

      const updates = {
        name: formData.get('name'),
        sku: formData.get('sku'),
        category: formData.get('category'),
        icon: formData.get('icon') || '📦',
        stock: parseInt(formData.get('stock')) || 0,
        reorderLevel: parseInt(formData.get('reorderLevel')) || 10,
        costPrice: parseFloat(formData.get('costPrice')) || 0,
        sellingPrice: parseFloat(formData.get('sellingPrice')) || 0,
        avgDailySales: parseInt(formData.get('avgDailySales')) || 0,
        shelfLifeDays: parseInt(formData.get('shelfLifeDays')) || 180,
        supplierId: formData.get('supplierId'),
        openingStockVerified: true
      };

      await API.Products.update(id, updates);
      modal.close();
      renderTable();
      App.showToast('success', 'Product Updated', `${updates.name} has been updated`);
      triggerAutoReorderCheck(1, false);
    });
  }

  function adjustStock(id) {
    const p = DataStore.getProduct(id);
    if (!p) return;

    const modal = App.showModal({
      title: 'Adjust Stock Count',
      content: `
        <div style="text-align:center;margin-bottom:20px">
          <span style="font-size:2rem">${p.icon || '📦'}</span>
          <h3 style="margin-top:4px">${p.name}</h3>
          <div class="text-secondary text-sm">Current shelf stock: <strong>${p.stock} units</strong></div>
        </div>
        <div class="form-group">
          <label class="form-label">Adjustment Type</label>
          <select class="form-select" id="adjustType">
            <option value="set">Set Exact Physical Count</option>
            <option value="add">Add Stock (Received / Found)</option>
            <option value="remove">Remove Stock (Damaged / Spoilage)</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Quantity</label>
          <input class="form-input font-bold" type="number" id="adjustQty" min="0" value="${p.stock}" style="font-size:1.35rem;text-align:center">
        </div>
        <div class="form-group">
          <label class="form-label">Reason / Notes</label>
          <input class="form-input" id="adjustReason" placeholder="e.g., Physical shelf count verified">
        </div>
        <div id="adjustPreview" class="text-sm text-secondary text-center" style="margin-top:8px"></div>
      `,
      footer: `
        <button class="btn btn-secondary" id="cancelAdjust">Cancel</button>
        <button class="btn btn-primary" id="confirmAdjust"><i data-lucide="check"></i> Confirm & Update</button>
      `,
    });

    lucide.createIcons();

    const typeEl = modal.overlay.querySelector('#adjustType');
    const qtyEl = modal.overlay.querySelector('#adjustQty');
    const previewEl = modal.overlay.querySelector('#adjustPreview');

    function updatePreview() {
      const type = typeEl.value;
      const qty = parseInt(qtyEl.value) || 0;
      let newStock;
      if (type === 'add') newStock = p.stock + qty;
      else if (type === 'remove') newStock = Math.max(0, p.stock - qty);
      else newStock = qty;
      previewEl.textContent = `New stock level: ${newStock} units`;
    }

    typeEl.addEventListener('change', updatePreview);
    qtyEl.addEventListener('input', updatePreview);
    updatePreview();

    modal.overlay.querySelector('#cancelAdjust').addEventListener('click', modal.close);
    modal.overlay.querySelector('#confirmAdjust').addEventListener('click', async () => {
      const type = typeEl.value;
      const qty = parseInt(qtyEl.value) || 0;
      let adjustment;
      if (type === 'add') adjustment = qty;
      else if (type === 'remove') adjustment = -qty;
      else adjustment = qty - p.stock;

      try {
        await API.Products.adjustStock(id, adjustment);
        modal.close();
        renderTable();
        App.showToast('success', 'Stock Adjusted', `${p.name} stock verified at ${p.stock} units`);
        triggerAutoReorderCheck(1, false);
      } catch (error) {
        App.showToast('error', 'Error', error.message);
      }
    });
  }

  function setSearch(query) {
    searchQuery = query;
    currentPage = 1;
    const input = document.getElementById('inventorySearch');
    if (input) input.value = query;
    renderTable();
  }

  async function deleteProductConfirm(id) {
    const p = DataStore.getProduct(id);
    if (!p) return;

    const confirmed = await App.showConfirm({
      title: 'Delete Product',
      message: `Are you sure you want to delete "${p.name}" (SKU: ${p.sku})? This product will be permanently removed from your inventory catalog.`,
      confirmText: 'Delete Product',
      cancelText: 'Cancel',
      type: 'danger'
    });

    if (confirmed) {
      try {
        await API.Products.delete(id);
        // If drawer is currently open for this product, close it
        document.querySelector('.drawer-close')?.click();
        renderTable();
        App.showToast('success', 'Product Deleted', `"${p.name}" has been removed from inventory`);
      } catch (err) {
        App.showToast('error', 'Delete Failed', err.message);
      }
    }
  }

  async function purgeCorruptedConfirm() {
    const confirmed = await App.showConfirm({
      title: 'Purge Corrupted Items',
      message: 'This will inspect your catalog and automatically remove any binary or corrupted products created during previous spreadsheet uploads.',
      confirmText: 'Clean Catalog',
      cancelText: 'Cancel',
      type: 'warning'
    });

    if (confirmed) {
      const removedCount = DataStore.purgeCorruptedProducts();
      renderTable();
      if (removedCount > 0) {
        App.showToast('success', 'Catalog Cleaned', `Removed ${removedCount} corrupted items`);
      } else {
        App.showToast('info', 'Catalog Clean', 'No corrupted items detected');
      }
    }
  }

  return {
    render,
    viewProduct,
    editProduct,
    adjustStock,
    deleteProductConfirm,
    purgeCorruptedConfirm,
    setSearch,
    showHybridUploadModal,
    verifyStockPrompt,
    clearFilters
  };
})();

App.registerPage('inventory', InventoryModule);
