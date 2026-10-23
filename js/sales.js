/* ========================================
   StockSense — Sales & Data Ingestion Module
   Sales recording, historical CSV upload & parser, transaction ledger
   ======================================== */

const SalesModule = (() => {
  let currentPage = 1;
  const perPage = 15;
  let searchQuery = '';
  let selectedProductId = 'all';
  let dateRangeFilter = '30'; // '7' | '30' | '90' | 'all'
  let parsedCsvData = null;

  async function render(container) {
    container.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:center;padding:80px 0">
        <div class="spinner" style="width:32px;height:32px"></div>
      </div>
    `;

    try {
      const salesRes = await API.Sales.getAll();
      renderContent(container, salesRes.data);
    } catch (err) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon"><i data-lucide="alert-triangle"></i></div>
          <h3>Failed to load sales</h3>
          <p>${err.message}</p>
        </div>
      `;
      lucide.createIcons();
    }
  }

  function renderContent(container, allSales) {
    const totalTransactions = allSales.length;
    const totalUnits = allSales.reduce((s, item) => s + item.quantitySold, 0);
    const totalRevenue = allSales.reduce((s, item) => s + item.total, 0);
    const avgTicket = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

    container.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h1>Sales & Data Ingestion</h1>
          <p>Record daily counter sales, analyze trends, or upload historical sales CSV files to train forecasting models</p>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-secondary" id="downloadSampleCsvBtn"><i data-lucide="file-spreadsheet"></i> Sample CSV Template</button>
          <button class="btn btn-secondary" id="openUploadCsvModalBtn"><i data-lucide="upload-cloud"></i> Upload Sales CSV</button>
          <button class="btn btn-primary" id="recordSaleBtn"><i data-lucide="plus"></i> Record Sale</button>
        </div>
      </div>

      <!-- Stats Grid -->
      <div class="stats-grid" style="margin-bottom: 24px;">
        <div class="stat-card">
          <div class="stat-icon emerald"><i data-lucide="dollar-sign"></i></div>
          <div class="stat-content">
            <div class="stat-label">Total Sales Revenue</div>
            <div class="stat-value">${App.formatCurrency(totalRevenue)}</div>
            <div class="stat-change" style="color:var(--text-secondary);font-size:0.75rem">
              Over recorded transaction history
            </div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon blue"><i data-lucide="shopping-cart"></i></div>
          <div class="stat-content">
            <div class="stat-label">Total Units Sold</div>
            <div class="stat-value">${App.formatNumber(totalUnits)}</div>
            <div class="stat-change" style="color:var(--text-secondary);font-size:0.75rem">
              Across all retail categories
            </div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon purple"><i data-lucide="receipt"></i></div>
          <div class="stat-content">
            <div class="stat-label">Total Transactions</div>
            <div class="stat-value">${App.formatNumber(totalTransactions)}</div>
            <div class="stat-change" style="color:var(--text-secondary);font-size:0.75rem">
              Average ticket: ${App.formatCurrency(avgTicket)}
            </div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon amber"><i data-lucide="trending-up"></i></div>
          <div class="stat-content">
            <div class="stat-label">Data Health</div>
            <div class="stat-value" style="color:var(--color-primary)">Ready</div>
            <div class="stat-change positive">
              <i data-lucide="check"></i> 90 days continuous data
            </div>
          </div>
        </div>
      </div>

      <!-- Quick Drag & Drop Ingestion Strip -->
      <div class="card" style="margin-bottom: 24px; border: 2px dashed var(--border-color); background: var(--bg-hover); transition: border-color 0.2s;" id="salesDropZone">
        <div class="card-body" style="padding: 24px; text-align: center;">
          <div style="display:flex; flex-direction:column; align-items:center; gap:8px;">
            <div style="width:48px; height:48px; border-radius:50%; background:var(--color-primary-50); color:var(--color-primary); display:flex; align-items:center; justify-content:center">
              <i data-lucide="upload-cloud" style="width:24px;height:24px"></i>
            </div>
            <h3 style="margin:0; font-size:1.05rem; font-weight:600">Drag & Drop Historical Sales CSV here</h3>
            <p style="margin:0; color:var(--text-secondary); font-size:0.875rem; max-width:550px">
              Upload past retail sales records (columns: <code>date, sku, quantity_sold, unit_price</code>) to refine demand forecasts and safety stock levels.
            </p>
            <div style="margin-top:8px; display:flex; gap:12px">
              <input type="file" id="salesFileInput" accept=".csv" style="display:none">
              <button class="btn btn-secondary btn-sm" onclick="document.getElementById('salesFileInput').click()">
                <i data-lucide="folder-open"></i> Browse File
              </button>
              <button class="btn btn-outline btn-sm" id="downloadSampleCsvBtn2">
                <i data-lucide="download"></i> Download Template (.CSV)
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Sales Table Card -->
      <div class="card">
        <div class="card-header" style="display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:space-between">
          <div style="display:flex;flex-wrap:wrap;gap:12px;align-items:center;flex:1">
            <!-- Search -->
            <div class="search-input" style="min-width:240px;position:relative">
              <i data-lucide="search" style="position:absolute;left:10px;top:50%;transform:translateY(-50%);width:16px;height:16px;color:var(--text-tertiary)"></i>
              <input type="text" id="salesSearchInput" class="form-control" style="padding-left:34px;height:38px;font-size:0.875rem" placeholder="Search product, SKU, ID..." value="${searchQuery}">
            </div>

            <!-- Product Filter -->
            <select id="salesProductFilter" class="form-control" style="width:auto;min-width:200px;height:38px;font-size:0.875rem">
              <option value="all" ${selectedProductId === 'all' ? 'selected' : ''}>All Products</option>
              ${DemoData.products.map(p => `<option value="${p.id}" ${selectedProductId === p.id ? 'selected' : ''}>${p.name} (${p.sku})</option>`).join('')}
            </select>

            <!-- Date Range Filter -->
            <select id="salesDateRangeFilter" class="form-control" style="width:auto;min-width:140px;height:38px;font-size:0.875rem">
              <option value="7" ${dateRangeFilter === '7' ? 'selected' : ''}>Last 7 Days</option>
              <option value="30" ${dateRangeFilter === '30' ? 'selected' : ''}>Last 30 Days</option>
              <option value="90" ${dateRangeFilter === '90' ? 'selected' : ''}>Last 90 Days</option>
              <option value="all" ${dateRangeFilter === 'all' ? 'selected' : ''}>All History</option>
            </select>
          </div>

          <button class="btn btn-secondary btn-sm" id="exportSalesCsvBtn"><i data-lucide="download"></i> Export Filtered CSV</button>
        </div>

        <div id="salesTableContainer"></div>
      </div>
    `;

    bindControls(container);
    renderTable();
    lucide.createIcons();
  }

  function getFilteredSales() {
    let items = [...DemoData.salesHistory];

    // Filter by product
    if (selectedProductId !== 'all') {
      items = items.filter(s => s.productId === selectedProductId);
    }

    // Filter by date range
    if (dateRangeFilter !== 'all') {
      const days = parseInt(dateRangeFilter);
      const cutoff = new Date(Date.now() - days * 86400000);
      items = items.filter(s => s.date >= cutoff);
    }

    // Filter by search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      items = items.filter(s =>
        s.id.toLowerCase().includes(q) ||
        s.productName.toLowerCase().includes(q) ||
        s.sku.toLowerCase().includes(q)
      );
    }

    items.sort((a, b) => b.date - a.date);
    return items;
  }

  function renderTable() {
    const container = document.getElementById('salesTableContainer');
    if (!container) return;

    const filtered = getFilteredSales();
    const pagination = App.paginate(filtered, currentPage, perPage);

    if (pagination.items.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="padding:48px 20px">
          <div class="empty-state-icon"><i data-lucide="receipt"></i></div>
          <h3>No sales transactions found</h3>
          <p>No records match your filters or no sales recorded yet</p>
        </div>
      `;
      lucide.createIcons();
      return;
    }

    container.innerHTML = `
      <div class="table-responsive">
        <table class="table" style="font-size:0.875rem">
          <thead>
            <tr>
              <th>Date & Time</th>
              <th>Transaction ID</th>
              <th>Product Name</th>
              <th>SKU</th>
              <th style="text-align:right">Quantity Sold</th>
              <th style="text-align:right">Unit Price</th>
              <th style="text-align:right">Total Amount</th>
            </tr>
          </thead>
          <tbody>
            ${pagination.items.map(item => {
              const product = DemoData.getProduct(item.productId);
              return `
                <tr>
                  <td>
                    <div style="font-weight:500;color:var(--text-primary)">${App.formatDate(item.date)}</div>
                    <div style="font-size:0.75rem;color:var(--text-tertiary)">${item.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                  </td>
                  <td>
                    <span style="font-family:var(--font-mono);font-size:0.8125rem;color:var(--text-secondary)">${item.id}</span>
                  </td>
                  <td>
                    <div style="display:flex;align-items:center;gap:8px">
                      <span>${product ? product.icon : '📦'}</span>
                      <span style="font-weight:600">${item.productName}</span>
                    </div>
                  </td>
                  <td>
                    <span style="font-family:var(--font-mono);font-size:0.75rem;color:var(--text-secondary)">${item.sku}</span>
                  </td>
                  <td style="text-align:right;font-weight:600">
                    ${item.quantitySold} units
                  </td>
                  <td style="text-align:right">
                    ${App.formatCurrency(item.unitPrice)}
                  </td>
                  <td style="text-align:right;font-weight:700;color:var(--color-primary)">
                    ${App.formatCurrency(item.total)}
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>

      <div style="padding:16px 20px;border-top:1px solid var(--border-color)">
        ${App.renderPagination(pagination, (page) => {
          currentPage = page;
          renderTable();
        })}
      </div>
    `;

    App.bindPagination('paginationControls', (page) => {
      currentPage = page;
      renderTable();
    });

    lucide.createIcons();
  }

  function bindControls(container) {
    const searchInput = container.querySelector('#salesSearchInput');
    if (searchInput) {
      let timer;
      searchInput.addEventListener('input', () => {
        clearTimeout(timer);
        timer = setTimeout(() => {
          searchQuery = searchInput.value.trim();
          currentPage = 1;
          renderTable();
        }, 250);
      });
    }

    const prodFilter = container.querySelector('#salesProductFilter');
    if (prodFilter) {
      prodFilter.addEventListener('change', () => {
        selectedProductId = prodFilter.value;
        currentPage = 1;
        renderTable();
      });
    }

    const dateFilter = container.querySelector('#salesDateRangeFilter');
    if (dateFilter) {
      dateFilter.addEventListener('change', () => {
        dateRangeFilter = dateFilter.value;
        currentPage = 1;
        renderTable();
      });
    }

    const exportBtn = container.querySelector('#exportSalesCsvBtn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        const data = getFilteredSales().map(s => ({
          'Date': s.date.toISOString().split('T')[0],
          'Transaction ID': s.id,
          'Product Name': s.productName,
          'SKU': s.sku,
          'Quantity Sold': s.quantitySold,
          'Unit Price': s.unitPrice,
          'Total': s.total,
        }));
        App.exportCSV(data, `StockSense_Sales_${new Date().toISOString().split('T')[0]}.csv`);
        App.showToast('info', 'Export Complete', 'Sales transactions exported to CSV');
      });
    }

    // Sample CSV buttons
    const sampleBtn1 = container.querySelector('#downloadSampleCsvBtn');
    const sampleBtn2 = container.querySelector('#downloadSampleCsvBtn2');
    const downloadSample = () => {
      const sample = [
        { date: '2024-03-01', sku: 'DAL-TOOR-1KG', quantity_sold: 12, unit_price: 155 },
        { date: '2024-03-01', sku: 'RICE-BAS-5KG', quantity_sold: 8, unit_price: 490 },
        { date: '2024-03-01', sku: 'OIL-SUN-1L', quantity_sold: 15, unit_price: 135 },
        { date: '2024-03-02', sku: 'MILK-TON-500ML', quantity_sold: 45, unit_price: 27 },
        { date: '2024-03-02', sku: 'ATT-WHT-10KG', quantity_sold: 7, unit_price: 430 },
      ];
      App.exportCSV(sample, 'StockSense_Sample_Sales_Template.csv');
      App.showToast('info', 'Template Downloaded', 'Use this CSV format to import sales data');
    };
    if (sampleBtn1) sampleBtn1.addEventListener('click', downloadSample);
    if (sampleBtn2) sampleBtn2.addEventListener('click', downloadSample);

    // Record Sale button
    const recordBtn = container.querySelector('#recordSaleBtn');
    if (recordBtn) recordBtn.addEventListener('click', openRecordSaleModal);

    // CSV File Upload & Drag-and-drop
    const fileInput = container.querySelector('#salesFileInput');
    const dropZone = container.querySelector('#salesDropZone');

    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) handleCsvFile(file);
      });
    }

    if (dropZone) {
      ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => {
          e.preventDefault();
          dropZone.style.borderColor = 'var(--color-primary)';
          dropZone.style.backgroundColor = 'var(--color-primary-50)';
        });
      });

      ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => {
          e.preventDefault();
          dropZone.style.borderColor = 'var(--border-color)';
          dropZone.style.backgroundColor = 'var(--bg-hover)';
        });
      });

      dropZone.addEventListener('drop', (e) => {
        const file = e.dataTransfer.files[0];
        if (file && file.name.endsWith('.csv')) {
          handleCsvFile(file);
        } else {
          App.showToast('error', 'Invalid File', 'Please upload a valid .csv file');
        }
      });
    }

    const uploadModalBtn = container.querySelector('#openUploadCsvModalBtn');
    if (uploadModalBtn) uploadModalBtn.addEventListener('click', openUploadModal);
  }

  // ── CSV File Parsing & Preview Modal ──
  function handleCsvFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      try {
        const rows = App.parseCSV(text);
        if (!rows || rows.length === 0) {
          throw new Error('CSV file is empty or formatted incorrectly');
        }
        parsedCsvData = rows;
        openCsvValidationModal(file.name, rows);
      } catch (err) {
        App.showToast('error', 'CSV Parse Error', err.message);
      }
    };
    reader.readAsText(file);
  }

  function openCsvValidationModal(fileName, rows) {
    // Validate rows against known SKUs
    let validCount = 0;
    let missingSkuCount = 0;
    let invalidDateCount = 0;
    const previewRows = rows.slice(0, 5);

    rows.forEach(r => {
      const sku = r.sku || r.SKU;
      const date = r.date || r.Date;
      const qty = r.quantity_sold || r.quantity || r.qty;

      const product = DemoData.getProductBySku(sku);
      if (!product) {
        missingSkuCount++;
      } else if (!date || isNaN(new Date(date).getTime())) {
        invalidDateCount++;
      } else if (qty !== undefined) {
        validCount++;
      }
    });

    const content = `
      <div style="font-size:0.875rem">
        <div style="display:flex;align-items:center;gap:12px;padding:12px;background:var(--bg-hover);border-radius:8px;margin-bottom:16px">
          <i data-lucide="file-check-2" style="width:28px;height:28px;color:var(--color-primary)"></i>
          <div>
            <div style="font-weight:700">${fileName}</div>
            <div style="color:var(--text-secondary);font-size:0.75rem">${rows.length} rows detected in file</div>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px">
          <div style="padding:10px;background:var(--color-primary-50);border-radius:6px;color:var(--color-primary-dark)">
            <div style="font-size:0.75rem">Valid Ready to Import</div>
            <div style="font-size:1.25rem;font-weight:700">${validCount} rows</div>
          </div>
          <div style="padding:10px;background:${missingSkuCount > 0 ? 'var(--color-warning-50)' : 'var(--bg-hover)'};border-radius:6px;color:${missingSkuCount > 0 ? 'var(--color-warning-dark)' : 'var(--text-secondary)'}">
            <div style="font-size:0.75rem">Unknown SKUs</div>
            <div style="font-size:1.25rem;font-weight:700">${missingSkuCount} rows</div>
          </div>
        </div>

        <div style="font-weight:600;margin-bottom:6px">Data Preview (First 5 Rows):</div>
        <div style="max-height:160px;overflow-y:auto;border:1px solid var(--border-color);border-radius:6px;margin-bottom:16px">
          <table class="table" style="font-size:0.75rem;margin:0">
            <thead>
              <tr style="background:var(--bg-body)">
                <th>Date</th>
                <th>SKU</th>
                <th>Qty</th>
                <th>Rate</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${previewRows.map(r => {
                const sku = r.sku || r.SKU;
                const prod = DemoData.getProductBySku(sku);
                return `
                  <tr>
                    <td>${r.date || r.Date || 'N/A'}</td>
                    <td><code>${sku || 'N/A'}</code></td>
                    <td>${r.quantity_sold || r.quantity || r.qty || 1}</td>
                    <td>${r.unit_price || r.price || (prod ? prod.sellingPrice : '-')}</td>
                    <td>
                      ${prod ? '<span class="badge badge-emerald" style="font-size:0.65rem">Matched</span>' : '<span class="badge badge-warning" style="font-size:0.65rem">Unknown SKU</span>'}
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>

        <p style="font-size:0.75rem;color:var(--text-secondary)">
          Importing will append valid sales to transaction history and immediately update rolling sales forecasts and replenishment levels.
        </p>
      </div>
    `;

    const footer = `
      <button class="btn btn-secondary" id="modalCancelImport">Cancel</button>
      <button class="btn btn-primary" id="modalConfirmImport" ${validCount === 0 ? 'disabled' : ''}>
        <i data-lucide="check"></i> Confirm & Import ${validCount} Sales
      </button>
    `;

    App.showModal({
      title: 'Validate Sales CSV Ingestion',
      content,
      footer,
      size: 'modal-md'
    });

    document.getElementById('modalCancelImport')?.addEventListener('click', () => {
      document.querySelector('.modal-overlay')?.remove();
    });

    document.getElementById('modalConfirmImport')?.addEventListener('click', async () => {
      // Map rows for API
      const normalized = rows.map(r => ({
        date: r.date || r.Date,
        sku: r.sku || r.SKU,
        quantity_sold: r.quantity_sold || r.quantity || r.qty,
        unit_price: r.unit_price || r.price,
      }));

      const res = await API.Sales.importCSV(normalized);
      App.showToast('success', 'Import Successful', `Imported ${res.data.imported} sales records (${res.data.duplicates} duplicates skipped)`);
      document.querySelector('.modal-overlay')?.remove();
      render(document.getElementById('pageContent'));
    });
  }

  function openUploadModal() {
    document.getElementById('salesFileInput')?.click();
  }

  // ── Record Single Sale Modal ──
  function openRecordSaleModal() {
    const products = DemoData.products;
    const defaultProduct = products[0];

    const content = `
      <div style="font-size:0.875rem">
        <div class="form-group" style="margin-bottom:14px">
          <label class="form-label">Select Product</label>
          <select id="recordSaleProductSelect" class="form-control">
            ${products.map(p => `
              <option value="${p.id}" data-price="${p.sellingPrice}" data-stock="${p.stock}">
                ${p.name} (${p.sku}) — In Stock: ${p.stock} units
              </option>
            `).join('')}
          </select>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px">
          <div class="form-group">
            <label class="form-label">Quantity Sold</label>
            <input type="number" id="recordSaleQty" class="form-control" value="1" min="1" step="1">
          </div>
          <div class="form-group">
            <label class="form-label">Unit Price (${DemoData.shopConfig.currencySymbol})</label>
            <input type="number" id="recordSalePrice" class="form-control" value="${defaultProduct ? defaultProduct.sellingPrice : 0}" step="0.5">
          </div>
        </div>

        <div class="form-group" style="margin-bottom:14px">
          <label class="form-label">Sale Date & Time</label>
          <input type="datetime-local" id="recordSaleDate" class="form-control" value="${new Date().toISOString().slice(0, 16)}">
        </div>

        <div style="padding:12px;background:var(--bg-hover);border-radius:8px;display:flex;justify-content:space-between;align-items:center">
          <span style="font-weight:600">Total Transaction Amount:</span>
          <span style="font-weight:700;font-size:1.2rem;color:var(--color-primary)" id="recordSaleTotal">
            ${App.formatCurrency(defaultProduct ? defaultProduct.sellingPrice : 0)}
          </span>
        </div>
      </div>
    `;

    const footer = `
      <button class="btn btn-secondary" id="modalCancelSale">Cancel</button>
      <button class="btn btn-primary" id="modalConfirmSale"><i data-lucide="check"></i> Save Sale</button>
    `;

    App.showModal({
      title: 'Record New Retail Sale',
      content,
      footer,
      size: 'modal-md'
    });

    const select = document.getElementById('recordSaleProductSelect');
    const qtyInput = document.getElementById('recordSaleQty');
    const priceInput = document.getElementById('recordSalePrice');
    const totalEl = document.getElementById('recordSaleTotal');

    const updateTotal = () => {
      const q = parseInt(qtyInput.value) || 0;
      const p = parseFloat(priceInput.value) || 0;
      totalEl.textContent = App.formatCurrency(q * p);
    };

    if (select && priceInput) {
      select.addEventListener('change', () => {
        const opt = select.selectedOptions[0];
        if (opt) {
          priceInput.value = opt.dataset.price;
          updateTotal();
        }
      });
    }

    if (qtyInput) qtyInput.addEventListener('input', updateTotal);
    if (priceInput) priceInput.addEventListener('input', updateTotal);

    document.getElementById('modalCancelSale')?.addEventListener('click', () => {
      document.querySelector('.modal-overlay')?.remove();
    });

    document.getElementById('modalConfirmSale')?.addEventListener('click', async () => {
      const productId = select.value;
      const product = DemoData.getProduct(productId);
      const qty = parseInt(qtyInput.value) || 0;
      const unitPrice = parseFloat(priceInput.value) || 0;
      const saleDate = new Date(document.getElementById('recordSaleDate').value);

      if (qty <= 0) {
        App.showToast('error', 'Invalid Quantity', 'Quantity must be at least 1 unit');
        return;
      }

      if (product && product.stock < qty) {
        App.showToast('warning', 'Stock Warning', `Current stock is only ${product.stock} units. Recording sale will set inventory to zero.`);
      }

      // Add sale transaction
      const newSale = {
        id: `S${String(DemoData.salesHistory.length + 1).padStart(5, '0')}`,
        date: isNaN(saleDate.getTime()) ? new Date() : saleDate,
        productId,
        sku: product ? product.sku : 'SKU-001',
        productName: product ? product.name : 'Product',
        quantitySold: qty,
        unitPrice,
        total: qty * unitPrice,
      };

      DemoData.salesHistory.push(newSale);

      // Deduct inventory
      if (product) {
        product.stock = Math.max(0, product.stock - qty);
      }

      App.showToast('success', 'Sale Recorded', `${qty} units of ${product ? product.name : 'product'} sold for ${App.formatCurrency(qty * unitPrice)}`);
      document.querySelector('.modal-overlay')?.remove();
      renderTable();
    });
  }

  return {
    render,
  };
})();

App.registerPage('sales', SalesModule);
