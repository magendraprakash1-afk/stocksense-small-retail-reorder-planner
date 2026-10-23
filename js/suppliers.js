/* ========================================
   StockSense — Suppliers & Purchase Orders Module
   Supplier directory, lead times, MOQ configuration, and stock receiving
   ======================================== */

const SuppliersModule = (() => {
  let activeTab = 'suppliers'; // 'suppliers' | 'orders'
  let searchQuery = '';

  async function render(container) {
    container.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:center;padding:80px 0">
        <div class="spinner" style="width:32px;height:32px"></div>
      </div>
    `;

    try {
      const [suppliersRes, ordersRes] = await Promise.all([
        API.Suppliers.getAll(),
        API.PurchaseOrders.getAll()
      ]);

      renderContent(container, suppliersRes.data, ordersRes.data);
    } catch (err) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon"><i data-lucide="alert-triangle"></i></div>
          <h3>Failed to load suppliers</h3>
          <p>${err.message}</p>
        </div>
      `;
      lucide.createIcons();
    }
  }

  function renderContent(container, suppliers, orders) {
    const totalSuppliers = suppliers.length;
    const avgLeadTime = Math.round(suppliers.reduce((s, sup) => s + sup.leadTime, 0) / (totalSuppliers || 1) * 10) / 10;
    const pendingOrders = orders.filter(o => o.status === 'sent' || o.status === 'partially_received').length;
    const pendingIncomingUnits = DemoData.products.reduce((s, p) => s + (p.incomingStock || 0), 0);

    container.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h1>Suppliers & Purchase Orders</h1>
          <p>Configure supplier lead times, minimum order quantities, manage contacts, and receive incoming inventory shipments</p>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-secondary" id="newSupplierBtn"><i data-lucide="user-plus"></i> Add Supplier</button>
          <button class="btn btn-primary" id="newOrderBtn"><i data-lucide="plus"></i> New Purchase Order</button>
        </div>
      </div>

      <!-- Stats Grid -->
      <div class="stats-grid" style="margin-bottom: 24px;">
        <div class="stat-card">
          <div class="stat-icon emerald"><i data-lucide="building-2"></i></div>
          <div class="stat-content">
            <div class="stat-label">Active Suppliers</div>
            <div class="stat-value">${totalSuppliers}</div>
            <div class="stat-change" style="color:var(--text-secondary);font-size:0.75rem">
              Verified wholesale vendors
            </div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon blue"><i data-lucide="clock"></i></div>
          <div class="stat-content">
            <div class="stat-label">Average Lead Time</div>
            <div class="stat-value">${avgLeadTime} <span style="font-size:0.875rem;font-weight:400;color:var(--text-tertiary)">days</span></div>
            <div class="stat-change" style="color:var(--text-secondary);font-size:0.75rem">
              Order placement to store arrival
            </div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon amber"><i data-lucide="truck"></i></div>
          <div class="stat-content">
            <div class="stat-label">Orders In Transit</div>
            <div class="stat-value" style="color:var(--color-warning-dark)">${pendingOrders}</div>
            <div class="stat-change" style="color:var(--text-secondary);font-size:0.75rem">
              ${pendingIncomingUnits} incoming units expected
            </div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon purple"><i data-lucide="package-check"></i></div>
          <div class="stat-content">
            <div class="stat-label">Total Orders Placed</div>
            <div class="stat-value">${orders.length}</div>
            <div class="stat-change positive">
              <i data-lucide="check"></i> System integrated
            </div>
          </div>
        </div>
      </div>

      <!-- Navigation Tabs & Search -->
      <div class="card" style="margin-bottom: 20px;">
        <div class="card-body" style="padding: 12px 20px;">
          <div style="display:flex;flex-wrap:wrap;gap:16px;align-items:center;justify-content:space-between">
            <div class="tabs" style="border:none;margin:0;padding:0">
              <button class="tab-btn ${activeTab === 'suppliers' ? 'active' : ''}" id="tabSuppliersBtn">
                <i data-lucide="building-2"></i> Supplier Directory (${suppliers.length})
              </button>
              <button class="tab-btn ${activeTab === 'orders' ? 'active' : ''}" id="tabOrdersBtn">
                <i data-lucide="shopping-cart"></i> Purchase Orders (${orders.length})
              </button>
            </div>

            <div class="search-input" style="min-width:260px;position:relative">
              <i data-lucide="search" style="position:absolute;left:10px;top:50%;transform:translateY(-50%);width:16px;height:16px;color:var(--text-tertiary)"></i>
              <input type="text" id="supplierSearchInput" class="form-control" style="padding-left:34px;height:36px;font-size:0.875rem" placeholder="Search suppliers, orders, items..." value="${searchQuery}">
            </div>
          </div>
        </div>
      </div>

      <!-- Content Area -->
      <div id="supplierTabContent"></div>
    `;

    bindTabControls(container, suppliers, orders);
    renderTabContent(suppliers, orders);
    lucide.createIcons();
  }

  function renderTabContent(suppliers, orders) {
    const container = document.getElementById('supplierTabContent');
    if (!container) return;

    if (activeTab === 'suppliers') {
      renderSuppliersList(container, suppliers);
    } else {
      renderOrdersList(container, orders);
    }
    lucide.createIcons();
  }

  // ── Suppliers Directory View ──
  function renderSuppliersList(container, suppliers) {
    let filtered = [...suppliers];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(s =>
        s.name.toLowerCase().includes(q) ||
        (s.contactPerson && s.contactPerson.toLowerCase().includes(q)) ||
        (s.phone && s.phone.includes(q))
      );
    }

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="card">
          <div class="card-body">
            <div class="empty-state" style="padding:48px 20px">
              <div class="empty-state-icon"><i data-lucide="building-2"></i></div>
              <h3>No suppliers match search</h3>
              <p>Try searching with another name or add a new supplier</p>
            </div>
          </div>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(360px, 1fr));gap:20px">
        ${filtered.map(s => {
          const suppliedProducts = DemoData.products.filter(p => p.supplierId === s.id);
          const ratingStars = '★'.repeat(Math.round(s.rating || 4)) + '☆'.repeat(5 - Math.round(s.rating || 4));

          return `
            <div class="card" style="display:flex;flex-direction:column;justify-content:space-between">
              <div class="card-body" style="padding:20px">
                <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:12px">
                  <div style="display:flex;align-items:center;gap:12px">
                    <div style="width:44px;height:44px;border-radius:10px;background:var(--color-primary-50);color:var(--color-primary);display:flex;align-items:center;justify-content:center">
                      <i data-lucide="building-2" style="width:24px;height:24px"></i>
                    </div>
                    <div>
                      <h3 style="margin:0;font-size:1.05rem;font-weight:600">${s.name}</h3>
                      <div style="font-size:0.75rem;color:var(--text-tertiary)">ID: ${s.id}</div>
                    </div>
                  </div>
                  <span style="color:var(--color-warning);font-size:0.875rem" title="Supplier Rating">${ratingStars}</span>
                </div>

                <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:12px;background:var(--bg-body);border-radius:8px;margin-bottom:14px;font-size:0.8125rem">
                  <div>
                    <span style="color:var(--text-tertiary)">Lead Time:</span>
                    <strong style="color:var(--text-primary);display:block">${s.leadTime} Days</strong>
                  </div>
                  <div>
                    <span style="color:var(--text-tertiary)">Min Order (MOQ):</span>
                    <strong style="color:var(--text-primary);display:block">${s.minOrderQty || 1} Units</strong>
                  </div>
                  <div>
                    <span style="color:var(--text-tertiary)">Case Pack:</span>
                    <strong style="color:var(--text-primary);display:block">${s.casePackSize || 1} Units/box</strong>
                  </div>
                  <div>
                    <span style="color:var(--text-tertiary)">Payment Terms:</span>
                    <strong style="color:var(--text-primary);display:block">${s.paymentTerms || 'Net 15'}</strong>
                  </div>
                </div>

                <div style="font-size:0.8125rem;color:var(--text-secondary);display:flex;flex-direction:column;gap:6px;margin-bottom:14px">
                  <div style="display:flex;align-items:center;gap:8px">
                    <i data-lucide="user" style="width:14px;height:14px;color:var(--text-tertiary)"></i>
                    <span>${s.contactPerson || 'Wholesale Rep'}</span>
                  </div>
                  <div style="display:flex;align-items:center;gap:8px">
                    <i data-lucide="phone" style="width:14px;height:14px;color:var(--text-tertiary)"></i>
                    <span>${s.phone || 'N/A'}</span>
                  </div>
                  <div style="display:flex;align-items:center;gap:8px">
                    <i data-lucide="mail" style="width:14px;height:14px;color:var(--text-tertiary)"></i>
                    <span>${s.email || 'N/A'}</span>
                  </div>
                  <div style="display:flex;align-items:center;gap:8px">
                    <i data-lucide="map-pin" style="width:14px;height:14px;color:var(--text-tertiary)"></i>
                    <span>${s.address || 'Local Market'}</span>
                  </div>
                </div>

                <div style="font-size:0.75rem;color:var(--text-tertiary)">
                  Supplies <strong>${suppliedProducts.length} items</strong> in your catalog
                </div>
              </div>

              <div class="card-footer" style="padding:12px 20px;border-top:1px solid var(--border-color);display:flex;justify-content:space-between;background:var(--bg-hover)">
                <button class="btn btn-sm btn-outline edit-supplier-btn" data-id="${s.id}">
                  <i data-lucide="edit-2"></i> Edit Details & Lead Time
                </button>
                <button class="btn btn-sm btn-primary order-from-supplier-btn" data-id="${s.id}">
                  <i data-lucide="plus"></i> Create PO
                </button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;

    container.querySelectorAll('.edit-supplier-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const sup = DemoData.getSupplier(id);
        if (sup) openEditSupplierModal(sup);
      });
    });

    container.querySelectorAll('.order-from-supplier-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        openCreatePoForSupplierModal(id);
      });
    });
  }

  // ── Purchase Orders List View ──
  function renderOrdersList(container, orders) {
    let filtered = [...orders];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(o =>
        o.id.toLowerCase().includes(q) ||
        o.supplierName.toLowerCase().includes(q) ||
        o.items.some(i => i.productName.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q))
      );
    }

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="card">
          <div class="card-body">
            <div class="empty-state" style="padding:48px 20px">
              <div class="empty-state-icon"><i data-lucide="shopping-cart"></i></div>
              <h3>No purchase orders found</h3>
              <p>Generate orders from the Reorder Plan or create a new order directly</p>
            </div>
          </div>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="card">
        <div class="table-responsive">
          <table class="table" style="font-size:0.875rem">
            <thead>
              <tr>
                <th>PO Number & Date</th>
                <th>Supplier</th>
                <th>Line Items</th>
                <th>Expected Delivery</th>
                <th>Order Amount</th>
                <th>Status</th>
                <th style="text-align:right">Action</th>
              </tr>
            </thead>
            <tbody>
              ${filtered.map(order => {
                const totalUnits = order.items.reduce((s, i) => s + i.quantity, 0);
                const receivedUnits = order.items.reduce((s, i) => s + (i.received || 0), 0);

                let statusBadge = '';
                if (order.status === 'received') {
                  statusBadge = '<span class="badge badge-emerald"><i data-lucide="check-circle" style="width:12px;height:12px;margin-right:3px"></i> Received</span>';
                } else if (order.status === 'partially_received') {
                  statusBadge = `<span class="badge badge-warning"><i data-lucide="clock" style="width:12px;height:12px;margin-right:3px"></i> Partial (${receivedUnits}/${totalUnits})</span>`;
                } else if (order.status === 'sent') {
                  statusBadge = '<span class="badge badge-info"><i data-lucide="truck" style="width:12px;height:12px;margin-right:3px"></i> In Transit</span>';
                } else {
                  statusBadge = '<span class="badge badge-neutral"><i data-lucide="file" style="width:12px;height:12px;margin-right:3px"></i> Draft</span>';
                }

                return `
                  <tr>
                    <td>
                      <div style="font-weight:600;font-family:var(--font-mono);color:var(--text-primary)">${order.id}</div>
                      <div style="font-size:0.75rem;color:var(--text-tertiary)">${App.formatDate(order.orderDate)}</div>
                    </td>
                    <td>
                      <div style="font-weight:600">${order.supplierName}</div>
                      <div style="font-size:0.75rem;color:var(--text-secondary)">ID: ${order.supplierId}</div>
                    </td>
                    <td>
                      <div style="font-weight:500">${order.items.length} products (${totalUnits} units)</div>
                      <div style="font-size:0.75rem;color:var(--text-tertiary);white-space:nowrap;max-width:200px;overflow:hidden;text-overflow:ellipsis">
                        ${order.items.map(i => i.productName).join(', ')}
                      </div>
                    </td>
                    <td>
                      <div style="font-weight:500">${App.formatDate(order.expectedDate)}</div>
                      <div style="font-size:0.75rem;color:var(--text-secondary)">
                        ${order.status === 'received' ? 'Delivered' : DemoData.daysUntil(order.expectedDate) <= 0 ? 'Due Today' : `In ${DemoData.daysUntil(order.expectedDate)} days`}
                      </div>
                    </td>
                    <td>
                      <div style="font-weight:700;color:var(--color-primary)">${App.formatCurrency(order.totalAmount)}</div>
                    </td>
                    <td>
                      ${statusBadge}
                    </td>
                    <td style="text-align:right">
                      <div style="display:flex;align-items:center;justify-content:flex-end;gap:8px">
                        <a href="${DataStore.generateWhatsAppOrderLink ? (DataStore.generateWhatsAppOrderLink(order.id) || '#') : '#'}" target="_blank" class="btn btn-sm btn-secondary" title="Send PO on WhatsApp" style="color:#16a34a;border-color:#bbf7d0">
                          <i data-lucide="message-circle"></i> WhatsApp
                        </a>
                        ${order.status !== 'received' ? `
                          <button class="btn btn-sm btn-primary receive-stock-btn" data-id="${order.id}">
                            <i data-lucide="package-check"></i> Receive Goods
                          </button>
                        ` : `
                          <button class="btn btn-sm btn-outline view-po-btn" data-id="${order.id}">
                            <i data-lucide="eye"></i> View Slip
                          </button>
                        `}
                      </div>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    container.querySelectorAll('.receive-stock-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const order = DemoData.purchaseOrders.find(o => o.id === id);
        if (order) openReceiveStockModal(order);
      });
    });

    container.querySelectorAll('.view-po-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const order = DemoData.purchaseOrders.find(o => o.id === id);
        if (order) openViewPoModal(order);
      });
    });
  }

  function bindTabControls(container, suppliers, orders) {
    const tabSup = container.querySelector('#tabSuppliersBtn');
    const tabOrd = container.querySelector('#tabOrdersBtn');

    if (tabSup && tabOrd) {
      tabSup.addEventListener('click', () => {
        activeTab = 'suppliers';
        tabSup.classList.add('active');
        tabOrd.classList.remove('active');
        renderTabContent(suppliers, orders);
      });

      tabOrd.addEventListener('click', () => {
        activeTab = 'orders';
        tabOrd.classList.add('active');
        tabSup.classList.remove('active');
        renderTabContent(suppliers, orders);
      });
    }

    const searchInput = container.querySelector('#supplierSearchInput');
    if (searchInput) {
      let timer;
      searchInput.addEventListener('input', () => {
        clearTimeout(timer);
        timer = setTimeout(() => {
          searchQuery = searchInput.value.trim();
          renderTabContent(suppliers, orders);
        }, 200);
      });
    }

    const newSupBtn = container.querySelector('#newSupplierBtn');
    if (newSupBtn) newSupBtn.addEventListener('click', openAddSupplierModal);

    const newOrderBtn = container.querySelector('#newOrderBtn');
    if (newOrderBtn) newOrderBtn.addEventListener('click', () => openCreatePoForSupplierModal());
  }

  // ── Receive Stock Modal (Physical Goods Receipt) ──
  function openReceiveStockModal(order) {
    const content = `
      <div style="font-size:0.875rem">
        <div style="display:flex;align-items:center;justify-content:space-between;padding:12px;background:var(--bg-hover);border-radius:8px;margin-bottom:16px">
          <div>
            <div style="font-weight:700;font-size:1.05rem">${order.id}</div>
            <div style="font-size:0.75rem;color:var(--text-secondary)">Supplier: ${order.supplierName} • Ordered: ${App.formatDate(order.orderDate)}</div>
          </div>
          <button class="btn btn-sm btn-outline" id="receiveAllBtn">
            <i data-lucide="check-check"></i> Fill All Full Quantity
          </button>
        </div>

        <p style="font-size:0.8125rem;color:var(--text-secondary);margin-bottom:12px">
          Confirm the actual quantities delivered by the delivery agent. Receiving stock will immediately increment store inventory and resolve pending reorder alerts.
        </p>

        <div style="border:1px solid var(--border-color);border-radius:8px;overflow:hidden;margin-bottom:16px">
          <table class="table" style="font-size:0.8125rem;margin:0">
            <thead>
              <tr style="background:var(--bg-body)">
                <th>Product</th>
                <th style="text-align:center">Ordered Qty</th>
                <th style="text-align:center">Previously Received</th>
                <th style="min-width:120px;text-align:right">Units Receiving Now</th>
              </tr>
            </thead>
            <tbody>
              ${order.items.map(item => {
                const prev = item.received || 0;
                const remaining = Math.max(0, item.quantity - prev);
                return `
                  <tr>
                    <td>
                      <div style="font-weight:600">${item.productName}</div>
                      <div style="font-size:0.7rem;color:var(--text-tertiary);font-family:var(--font-mono)">${item.sku}</div>
                    </td>
                    <td style="text-align:center;font-weight:600">${item.quantity}</td>
                    <td style="text-align:center;color:var(--text-secondary)">${prev}</td>
                    <td style="text-align:right">
                      <input type="number" 
                        class="form-control receive-item-input" 
                        data-product-id="${item.productId}" 
                        value="${remaining}" 
                        min="0" 
                        max="${remaining}" 
                        style="width:80px;height:30px;font-size:0.8125rem;text-align:center;margin-left:auto;font-weight:600">
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    const footer = `
      <button class="btn btn-secondary" id="modalCancelReceive">Cancel</button>
      <button class="btn btn-primary" id="modalConfirmReceive"><i data-lucide="package-check"></i> Complete Goods Receipt</button>
    `;

    App.showModal({
      title: `Goods Receiving — ${order.id}`,
      content,
      footer,
      size: 'modal-lg'
    });

    document.getElementById('receiveAllBtn')?.addEventListener('click', () => {
      document.querySelectorAll('.receive-item-input').forEach(input => {
        input.value = input.max;
      });
    });

    document.getElementById('modalCancelReceive')?.addEventListener('click', () => {
      document.querySelector('.modal-overlay')?.remove();
    });

    document.getElementById('modalConfirmReceive')?.addEventListener('click', async () => {
      const inputs = document.querySelectorAll('.receive-item-input');
      const receivedItems = [];

      inputs.forEach(inp => {
        const qty = parseInt(inp.value) || 0;
        if (qty > 0) {
          receivedItems.push({
            productId: inp.dataset.productId,
            quantity: qty,
          });
        }
      });

      if (receivedItems.length === 0) {
        App.showToast('warning', 'Zero Received', 'Please enter at least 1 unit to receive');
        return;
      }

      await API.PurchaseOrders.receivePartial(order.id, receivedItems);
      App.showToast('success', 'Goods Received', `Inventory updated for ${order.id}`);
      document.querySelector('.modal-overlay')?.remove();
      render(document.getElementById('pageContent'));
    });
  }

  // ── View Order Slip Modal ──
  function openViewPoModal(order) {
    const content = `
      <div style="font-size:0.875rem">
        <div style="display:flex;justify-content:space-between;border-bottom:1px solid var(--border-color);padding-bottom:12px;margin-bottom:14px">
          <div>
            <h3 style="margin:0">${DemoData.shopConfig.name}</h3>
            <div style="font-size:0.75rem;color:var(--text-secondary)">Purchase Order #${order.id}</div>
          </div>
          <div style="text-align:right">
            <span class="badge badge-emerald">Received & Closed</span>
            <div style="font-size:0.75rem;color:var(--text-tertiary);margin-top:4px">${App.formatDate(order.orderDate)}</div>
          </div>
        </div>

        <div style="margin-bottom:14px;font-size:0.8125rem">
          <strong>Supplier:</strong> ${order.supplierName} (${order.supplierId})<br>
          <strong>Notes:</strong> ${order.notes || 'None'}
        </div>

        <table class="table" style="font-size:0.8125rem">
          <thead>
            <tr>
              <th>Item</th>
              <th>SKU</th>
              <th style="text-align:right">Qty</th>
              <th style="text-align:right">Rate</th>
              <th style="text-align:right">Total</th>
            </tr>
          </thead>
          <tbody>
            ${order.items.map(i => `
              <tr>
                <td>${i.productName}</td>
                <td style="font-family:var(--font-mono)">${i.sku}</td>
                <td style="text-align:right;font-weight:600">${i.quantity}</td>
                <td style="text-align:right">${App.formatCurrency(i.unitCost)}</td>
                <td style="text-align:right;font-weight:600">${App.formatCurrency(i.total)}</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr style="font-weight:700">
              <td colspan="4" style="text-align:right">Grand Total:</td>
              <td style="text-align:right;color:var(--color-primary)">${App.formatCurrency(order.totalAmount)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    `;

    App.showModal({
      title: `Purchase Slip — ${order.id}`,
      content,
      footer: '<button class="btn btn-secondary" onclick="document.querySelector(\'.modal-overlay\').remove()">Close</button>',
      size: 'modal-md'
    });
  }

  // ── Add/Edit Supplier Modals ──
  function openAddSupplierModal() {
    const content = `
      <div style="font-size:0.875rem">
        <div class="form-group" style="margin-bottom:12px">
          <label class="form-label">Supplier / Company Name</label>
          <input type="text" id="supName" class="form-control" placeholder="e.g. Metro Cash & Carry Wholesalers">
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
          <div class="form-group">
            <label class="form-label">Standard Lead Time (Days)</label>
            <input type="number" id="supLeadTime" class="form-control" value="3" min="1" step="1">
            <div style="font-size:0.7rem;color:var(--text-tertiary);margin-top:2px">Directly drives reorder point safety margins</div>
          </div>
          <div class="form-group">
            <label class="form-label">Minimum Order Qty (MOQ)</label>
            <input type="number" id="supMoq" class="form-control" value="10" min="1">
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
          <div class="form-group">
            <label class="form-label">Contact Person</label>
            <input type="text" id="supContact" class="form-control" placeholder="Representative name">
          </div>
          <div class="form-group">
            <label class="form-label">Phone Number</label>
            <input type="tel" id="supPhone" class="form-control" placeholder="+91 98765 43210">
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
          <div class="form-group">
            <label class="form-label">Email Address</label>
            <input type="email" id="supEmail" class="form-control" placeholder="orders@supplier.com">
          </div>
          <div class="form-group">
            <label class="form-label">Payment Terms</label>
            <select id="supTerms" class="form-control">
              <option value="Net 7">Net 7 Days</option>
              <option value="Net 15" selected>Net 15 Days</option>
              <option value="Net 30">Net 30 Days</option>
              <option value="COD">Cash on Delivery (COD)</option>
            </select>
          </div>
        </div>
      </div>
    `;

    const footer = `
      <button class="btn btn-secondary" id="modalCancelAddSup">Cancel</button>
      <button class="btn btn-primary" id="modalSaveAddSup"><i data-lucide="check"></i> Save Supplier</button>
    `;

    App.showModal({
      title: 'Add New Wholesale Supplier',
      content,
      footer,
      size: 'modal-md'
    });

    document.getElementById('modalCancelAddSup')?.addEventListener('click', () => {
      document.querySelector('.modal-overlay')?.remove();
    });

    document.getElementById('modalSaveAddSup')?.addEventListener('click', async () => {
      const name = document.getElementById('supName').value.trim();
      const leadTime = parseInt(document.getElementById('supLeadTime').value) || 3;
      const moq = parseInt(document.getElementById('supMoq').value) || 10;
      const contact = document.getElementById('supContact').value.trim();
      const phone = document.getElementById('supPhone').value.trim();
      const email = document.getElementById('supEmail').value.trim();
      const terms = document.getElementById('supTerms').value;

      if (!name) {
        App.showToast('error', 'Name Required', 'Please enter a supplier name');
        return;
      }

      await API.Suppliers.create({
        name,
        leadTime,
        minOrderQty: moq,
        casePackSize: 1,
        contactPerson: contact,
        phone,
        email,
        paymentTerms: terms,
        rating: 4.5,
      });

      App.showToast('success', 'Supplier Added', `${name} registered successfully`);
      document.querySelector('.modal-overlay')?.remove();
      render(document.getElementById('pageContent'));
    });
  }

  function openEditSupplierModal(sup) {
    const content = `
      <div style="font-size:0.875rem">
        <div class="form-group" style="margin-bottom:12px">
          <label class="form-label">Supplier Name</label>
          <input type="text" id="editSupName" class="form-control" value="${sup.name}">
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
          <div class="form-group">
            <label class="form-label">Lead Time (Days)</label>
            <input type="number" id="editSupLeadTime" class="form-control" value="${sup.leadTime}" min="1">
            <div style="font-size:0.7rem;color:var(--text-tertiary);margin-top:2px">Updating lead time recalculates reorder points</div>
          </div>
          <div class="form-group">
            <label class="form-label">Minimum Order Qty (MOQ)</label>
            <input type="number" id="editSupMoq" class="form-control" value="${sup.minOrderQty || 1}" min="1">
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
          <div class="form-group">
            <label class="form-label">Contact Person</label>
            <input type="text" id="editSupContact" class="form-control" value="${sup.contactPerson || ''}">
          </div>
          <div class="form-group">
            <label class="form-label">Phone Number</label>
            <input type="tel" id="editSupPhone" class="form-control" value="${sup.phone || ''}">
          </div>
        </div>

        <div class="form-group" style="margin-bottom:12px">
          <label class="form-label">Payment Terms</label>
          <input type="text" id="editSupTerms" class="form-control" value="${sup.paymentTerms || 'Net 15'}">
        </div>
      </div>
    `;

    const footer = `
      <button class="btn btn-secondary" id="modalCancelEditSup">Cancel</button>
      <button class="btn btn-primary" id="modalSaveEditSup"><i data-lucide="check"></i> Save Changes</button>
    `;

    App.showModal({
      title: `Edit ${sup.name}`,
      content,
      footer,
      size: 'modal-md'
    });

    document.getElementById('modalCancelEditSup')?.addEventListener('click', () => {
      document.querySelector('.modal-overlay')?.remove();
    });

    document.getElementById('modalSaveEditSup')?.addEventListener('click', async () => {
      const updates = {
        name: document.getElementById('editSupName').value.trim(),
        leadTime: parseInt(document.getElementById('editSupLeadTime').value) || 3,
        minOrderQty: parseInt(document.getElementById('editSupMoq').value) || 1,
        contactPerson: document.getElementById('editSupContact').value.trim(),
        phone: document.getElementById('editSupPhone').value.trim(),
        paymentTerms: document.getElementById('editSupTerms').value.trim(),
      };

      await API.Suppliers.update(sup.id, updates);
      App.showToast('success', 'Supplier Updated', `${updates.name} details saved`);
      document.querySelector('.modal-overlay')?.remove();
      render(document.getElementById('pageContent'));
    });
  }

  function openCreatePoForSupplierModal(defaultSupplierId = null) {
    const suppliers = DemoData.suppliers;
    const sup = defaultSupplierId ? DemoData.getSupplier(defaultSupplierId) : suppliers[0];
    const products = DemoData.products.filter(p => !defaultSupplierId || p.supplierId === defaultSupplierId);

    const content = `
      <div style="font-size:0.875rem">
        <div class="form-group" style="margin-bottom:12px">
          <label class="form-label">Select Supplier</label>
          <select id="newPoSupplierSelect" class="form-control">
            ${suppliers.map(s => `<option value="${s.id}" ${s.id === defaultSupplierId ? 'selected' : ''}>${s.name} (${s.leadTime}d lead)</option>`).join('')}
          </select>
        </div>

        <div class="form-group" style="margin-bottom:12px">
          <label class="form-label">Add Product</label>
          <div style="display:flex;gap:8px">
            <select id="newPoProductSelect" class="form-control" style="flex:1">
              ${products.map(p => `<option value="${p.id}" data-cost="${p.costPrice}">${p.name} (${p.sku}) — Cost: ${App.formatCurrency(p.costPrice)}</option>`).join('')}
            </select>
            <input type="number" id="newPoQty" class="form-control" value="10" min="1" style="width:90px" placeholder="Qty">
            <button class="btn btn-secondary" id="addPoLineBtn"><i data-lucide="plus"></i> Add</button>
          </div>
        </div>

        <div style="border:1px solid var(--border-color);border-radius:6px;max-height:160px;overflow-y:auto;margin-bottom:14px">
          <table class="table" style="font-size:0.8125rem;margin:0" id="newPoTable">
            <thead>
              <tr style="background:var(--bg-body)">
                <th>Product</th>
                <th>Qty</th>
                <th>Rate</th>
                <th>Subtotal</th>
                <th style="width:30px"></th>
              </tr>
            </thead>
            <tbody id="newPoLines">
              <tr>
                <td colspan="5" style="text-align:center;color:var(--text-tertiary);padding:16px">No products added yet</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div style="display:flex;justify-content:space-between;align-items:center;padding:10px;background:var(--bg-hover);border-radius:6px">
          <span style="font-weight:600">Total Amount:</span>
          <span style="font-weight:700;font-size:1.15rem;color:var(--color-primary)" id="newPoTotalSum">${App.formatCurrency(0)}</span>
        </div>
      </div>
    `;

    const footer = `
      <button class="btn btn-secondary" id="modalCancelCreatePo">Cancel</button>
      <button class="btn btn-primary" id="modalConfirmCreatePo"><i data-lucide="send"></i> Place Order</button>
    `;

    App.showModal({
      title: 'Create Manual Purchase Order',
      content,
      footer,
      size: 'modal-md'
    });

    const lines = [];
    const supSelect = document.getElementById('newPoSupplierSelect');
    const prodSelect = document.getElementById('newPoProductSelect');
    const qtyInput = document.getElementById('newPoQty');
    const addBtn = document.getElementById('addPoLineBtn');
    const tbody = document.getElementById('newPoLines');
    const totalEl = document.getElementById('newPoTotalSum');

    // Filter products when supplier changes
    supSelect.addEventListener('change', () => {
      const selectedSupId = supSelect.value;
      const filteredProds = DemoData.products.filter(p => p.supplierId === selectedSupId);
      prodSelect.innerHTML = filteredProds.map(p => `<option value="${p.id}" data-cost="${p.costPrice}">${p.name} (${p.sku}) — Cost: ${App.formatCurrency(p.costPrice)}</option>`).join('');
    });

    const updateLinesTable = () => {
      if (lines.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-tertiary);padding:16px">No products added yet</td></tr>';
        totalEl.textContent = App.formatCurrency(0);
        return;
      }

      let total = 0;
      tbody.innerHTML = lines.map((l, idx) => {
        const sub = l.quantity * l.unitCost;
        total += sub;
        return `
          <tr>
            <td>${l.productName}</td>
            <td style="font-weight:600">${l.quantity}</td>
            <td>${App.formatCurrency(l.unitCost)}</td>
            <td style="font-weight:600">${App.formatCurrency(sub)}</td>
            <td>
              <button class="btn btn-icon btn-sm remove-line-btn" data-idx="${idx}" style="padding:2px;color:var(--color-danger)">
                <i data-lucide="trash-2" style="width:14px;height:14px"></i>
              </button>
            </td>
          </tr>
        `;
      }).join('');

      totalEl.textContent = App.formatCurrency(total);
      lucide.createIcons();

      tbody.querySelectorAll('.remove-line-btn').forEach(b => {
        b.addEventListener('click', () => {
          const i = parseInt(b.dataset.idx);
          lines.splice(i, 1);
          updateLinesTable();
        });
      });
    };

    addBtn.addEventListener('click', () => {
      const prodId = prodSelect.value;
      const product = DemoData.getProduct(prodId);
      const qty = parseInt(qtyInput.value) || 0;

      if (!product || qty <= 0) return;

      const existing = lines.find(l => l.productId === prodId);
      if (existing) {
        existing.quantity += qty;
      } else {
        lines.push({
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          quantity: qty,
          unitCost: product.costPrice,
          total: qty * product.costPrice,
          received: 0,
        });
      }

      updateLinesTable();
    });

    document.getElementById('modalCancelCreatePo')?.addEventListener('click', () => {
      document.querySelector('.modal-overlay')?.remove();
    });

    document.getElementById('modalConfirmCreatePo')?.addEventListener('click', async () => {
      if (lines.length === 0) {
        App.showToast('warning', 'Empty Order', 'Please add at least one line item');
        return;
      }

      const selectedSup = DemoData.getSupplier(supSelect.value);
      const totalAmount = lines.reduce((s, i) => s + (i.quantity * i.unitCost), 0);

      const orderData = {
        supplierId: selectedSup ? selectedSup.id : 'SUP001',
        supplierName: selectedSup ? selectedSup.name : 'Supplier',
        expectedDate: new Date(Date.now() + (selectedSup ? selectedSup.leadTime : 3) * 86400000),
        notes: 'Manual purchase order',
        totalAmount,
        items: lines,
      };

      const res = await API.PurchaseOrders.create(orderData);
      lines.forEach(l => {
        const prod = DemoData.getProduct(l.productId);
        if (prod) prod.incomingStock += l.quantity;
      });

      App.showToast('success', 'Purchase Order Created', `Order #${res.data.id} placed`);
      document.querySelector('.modal-overlay')?.remove();
      render(document.getElementById('pageContent'));
    });
  }

  return {
    render,
  };
})();

App.registerPage('suppliers', SuppliersModule);
