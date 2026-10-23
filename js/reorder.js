/* ========================================
   StockSense — Reorder Recommendation Module
   Intelligent purchase reorder lists, shelf-life caps & waste prevention
   ======================================== */

const ReorderModule = (() => {
  let recommendations = [];
  let summary = {};
  let selectedSupplier = 'all';
  let selectedUrgency = 'all';
  let onlyShelfLifeRisk = false;
  let searchQuery = '';
  let selectedProductIds = new Set();
  let modifiedQuantities = {};
  let activeView = 'table'; // 'table' | 'supplier'

  async function render(container) {
    container.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:center;padding:80px 0">
        <div class="spinner" style="width:32px;height:32px"></div>
      </div>
    `;

    try {
      const planRes = await API.Reorder.generatePlan();
      recommendations = planRes.data.recommendations;
      summary = planRes.data.summary;

      // Select all products needing reorder by default
      selectedProductIds = new Set(
        recommendations.filter(r => r.suggestedQty > 0).map(r => r.productId)
      );
      modifiedQuantities = {};

      renderContent(container);
    } catch (err) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon"><i data-lucide="alert-triangle"></i></div>
          <h3>Failed to generate reorder plan</h3>
          <p>${err.message}</p>
          <button class="btn btn-primary" onclick="ReorderModule.render(document.getElementById('pageContent'))">Try Again</button>
        </div>
      `;
      lucide.createIcons();
    }
  }

  function renderContent(container) {
    if (recommendations.length === 0) {
      container.innerHTML = `
        <div class="page-header">
          <div class="page-header-left">
            <h1>Intelligent Reorder Plan</h1>
            <p>Automated replenishment recommendations based on forecasted demand</p>
          </div>
        </div>
        <div class="card" style="padding:48px 24px;text-align:center;border:2px dashed var(--border-color);background:var(--bg-card)">
          <div style="font-size:3rem;margin-bottom:12px">✨</div>
          <h3 style="font-size:1.3rem;margin-bottom:8px">No Products In Store (Clean Slate Active)</h3>
          <p style="color:var(--text-secondary);max-width:520px;margin:0 auto 20px">
            All demo data has been removed. Add products via Touch POS, Barcode, Tamil Voice, or load the sample supermarket catalog to test automated replenishment algorithms.
          </p>
          <div style="display:flex;justify-content:center;gap:12px">
            <button class="btn btn-primary" onclick="ShopkeeperModule.showAddModal()">
              <i data-lucide="plus"></i> Add Product
            </button>
            <button class="btn btn-secondary" onclick="DataStore.loadSampleCatalog(); ReorderModule.render(document.getElementById('pageContent'))">
              <i data-lucide="sparkles"></i> Load Sample Supermarket Catalog
            </button>
          </div>
        </div>
      `;
      lucide.createIcons();
      return;
    }

    const suppliers = DemoData.suppliers;

    // Feature 13: Multi-Branch Stock Balancing Suggestions
    const branchTransfers = DataStore.getMultiBranchTransfers ? DataStore.getMultiBranchTransfers() : [];

    // Feature 11: Budget Status Check
    const budgetStatus = DataStore.getBudgetStatus ? DataStore.getBudgetStatus() : { monthlyBudget: 50000, currentSpend: 0, usedPct: 0, remaining: 50000 };

    // Calculate dynamic totals based on modified quantities & selection
    const selectedList = recommendations.filter(r => selectedProductIds.has(r.productId));
    const totalOrderCost = selectedList.reduce((sum, r) => {
      const qty = modifiedQuantities[r.productId] !== undefined ? modifiedQuantities[r.productId] : r.suggestedQty;
      return sum + (qty * r.unitCost);
    }, 0);
    const totalOrderUnits = selectedList.reduce((sum, r) => {
      const qty = modifiedQuantities[r.productId] !== undefined ? modifiedQuantities[r.productId] : r.suggestedQty;
      return sum + qty;
    }, 0);

    const shelfLifeCappedCount = recommendations.filter(r => r.shelfLifeCapped).length;

    container.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <div style="display:flex;align-items:center;gap:12px">
            <h1>Intelligent Reorder Plan</h1>
            <span class="badge badge-emerald" style="font-size:0.75rem;padding:4px 8px;">Lead-Time & Shelf-Life Aware</span>
          </div>
          <p>Automated replenishment recommendations based on forecasted demand, supplier lead times, and wastage prevention caps</p>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-secondary" id="exportReorderCsvBtn"><i data-lucide="download"></i> Export Reorder CSV</button>
          <button class="btn btn-primary" id="createBatchPoBtn" ${selectedProductIds.size === 0 ? 'disabled' : ''}>
            <i data-lucide="shopping-cart"></i> Generate Purchase Orders (${selectedProductIds.size})
          </button>
        </div>
      </div>

      <!-- Feature 13: Multi-Branch Stock Balancing Banner -->
      ${branchTransfers.length > 0 ? `
        <div class="transfer-alert-card">
          <div class="transfer-alert-left">
            <div class="transfer-icon"><i data-lucide="arrow-right-left"></i></div>
            <div>
              <div style="font-weight:700;color:#1e40af;font-size:0.95rem">
                🔄 கிளை இருப்பு மாற்றல் பரிந்துரை (Multi-Branch Stock Balancing)
              </div>
              <div style="font-size:0.8125rem;color:var(--text-secondary);margin-top:2px">
                Branch 2 has surplus stock. Transfer <strong>${branchTransfers.reduce((s,t)=>s+t.transferQty,0)} units</strong> between branches instead of placing new supplier POs.
                <strong>Saves ₹${branchTransfers.reduce((s,t)=>s+t.savingsCost,0).toLocaleString('en-IN')}!</strong>
              </div>
            </div>
          </div>
          <button class="btn btn-sm btn-primary" onclick="ReorderModule.executeTransfers()" style="background:#2563eb;border-color:#2563eb;white-space:nowrap">
            <i data-lucide="check"></i> உடனே மாற்றுக (Execute Transfer)
          </button>
        </div>
      ` : ''}

      <!-- Feature 11: Budget Status Banner -->
      <div style="background:var(--bg-card);border:1px solid var(--border-color);border-radius:10px;padding:12px 18px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px">
        <div style="display:flex;align-items:center;gap:10px">
          <i data-lucide="wallet" style="color:var(--color-primary)"></i>
          <span style="font-size:0.875rem;font-weight:600">Monthly Purchase Budget: ₹${budgetStatus.monthlyBudget.toLocaleString('en-IN')}</span>
          <span style="font-size:0.8125rem;color:var(--text-secondary)">(Used: ₹${budgetStatus.currentSpend.toLocaleString('en-IN')} / ${budgetStatus.usedPct}%)</span>
        </div>
        <div style="display:flex;align-items:center;gap:8px">
          <span class="badge ${budgetStatus.warningThreshold ? 'badge-warning' : 'badge-healthy'}" style="font-size:0.75rem">
            ${budgetStatus.warningThreshold ? 'Budget Warning: ≥80% used' : 'Budget Healthy'}
          </span>
          <span style="font-size:0.8125rem;color:var(--text-tertiary)">Auto-approval limit: ₹5,000</span>
        </div>
      </div>

      <!-- KPI Summary Cards -->
      <div class="stats-grid" style="margin-bottom: 24px;">
        <div class="stat-card">
          <div class="stat-icon emerald"><i data-lucide="shopping-bag"></i></div>
          <div class="stat-content">
            <div class="stat-label">Items to Reorder</div>
            <div class="stat-value">${summary.needsReorder} <span style="font-size:0.875rem;font-weight:400;color:var(--text-tertiary)">/ ${summary.totalProducts}</span></div>
            <div class="stat-change" style="color:var(--text-secondary);font-size:0.75rem">
              ${selectedProductIds.size} selected (${totalOrderUnits} units)
            </div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon blue"><i data-lucide="wallet"></i></div>
          <div class="stat-content">
            <div class="stat-label">Estimated Order Value</div>
            <div class="stat-value">${App.formatCurrency(totalOrderCost)}</div>
            <div class="stat-change" style="color:var(--text-secondary);font-size:0.75rem">
              Based on active supplier cost prices
            </div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon red"><i data-lucide="alert-octagon"></i></div>
          <div class="stat-content">
            <div class="stat-label">Critical Urgency</div>
            <div class="stat-value" style="color:var(--color-danger)">${summary.criticalCount}</div>
            <div class="stat-change negative">
              <i data-lucide="arrow-up-right"></i> Imminent stockout &lt; Lead Time
            </div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon amber"><i data-lucide="shield-alert"></i></div>
          <div class="stat-content">
            <div class="stat-label">Wastage Prevention</div>
            <div class="stat-value" style="color:var(--color-warning)">${shelfLifeCappedCount}</div>
            <div class="stat-change" style="color:var(--color-warning-dark);font-size:0.75rem">
              Orders capped to prevent expiry
            </div>
          </div>
        </div>
      </div>

      <!-- Action & View Controls Bar -->
      <div class="card" style="margin-bottom: 20px;">
        <div class="card-body" style="padding: 16px 20px;">
          <div style="display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:space-between">
            <div style="display:flex;flex-wrap:wrap;gap:12px;align-items:center;flex:1">
              <!-- Search -->
              <div class="search-input" style="min-width:240px;position:relative">
                <i data-lucide="search" style="position:absolute;left:10px;top:50%;transform:translateY(-50%);width:16px;height:16px;color:var(--text-tertiary)"></i>
                <input type="text" id="reorderSearch" class="form-control" style="padding-left:34px;height:38px;font-size:0.875rem" placeholder="Search product or SKU..." value="${searchQuery}">
              </div>

              <!-- Supplier Filter -->
              <select id="reorderSupplierFilter" class="form-control" style="width:auto;min-width:180px;height:38px;font-size:0.875rem">
                <option value="all" ${selectedSupplier === 'all' ? 'selected' : ''}>All Suppliers</option>
                ${suppliers.map(s => `<option value="${s.id}" ${selectedSupplier === s.id ? 'selected' : ''}>${s.name} (${s.leadTime}d lead)</option>`).join('')}
              </select>

              <!-- Urgency Filter -->
              <select id="reorderUrgencyFilter" class="form-control" style="width:auto;min-width:150px;height:38px;font-size:0.875rem">
                <option value="all" ${selectedUrgency === 'all' ? 'selected' : ''}>All Urgency</option>
                <option value="critical" ${selectedUrgency === 'critical' ? 'selected' : ''}>Critical (${summary.criticalCount})</option>
                <option value="high" ${selectedUrgency === 'high' ? 'selected' : ''}>High (${summary.highCount})</option>
                <option value="medium" ${selectedUrgency === 'medium' ? 'selected' : ''}>Medium (${summary.mediumCount})</option>
                <option value="low" ${selectedUrgency === 'low' ? 'selected' : ''}>Low (${summary.lowCount})</option>
              </select>

              <!-- Shelf life toggle -->
              <label style="display:flex;align-items:center;gap:6px;font-size:0.8125rem;cursor:pointer;user-select:none;margin-left:4px">
                <input type="checkbox" id="shelfLifeFilterToggle" ${onlyShelfLifeRisk ? 'checked' : ''} style="cursor:pointer;accent-color:var(--color-primary)">
                <span>Show Perishable / Expiry Risks</span>
              </label>
            </div>

            <!-- View switcher -->
            <div class="btn-group">
              <button class="btn btn-sm ${activeView === 'table' ? 'btn-primary' : 'btn-secondary'}" id="viewTableBtn" title="Detailed Table View">
                <i data-lucide="table"></i> Table View
              </button>
              <button class="btn btn-sm ${activeView === 'supplier' ? 'btn-primary' : 'btn-secondary'}" id="viewSupplierBtn" title="Group by Supplier for Ordering">
                <i data-lucide="truck"></i> By Supplier
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Main Reorder View Container -->
      <div id="reorderViewContainer"></div>
    `;

    bindFilters(container);
    renderActiveView();
    lucide.createIcons();
  }

  function getFilteredItems() {
    return recommendations.filter(r => {
      if (selectedSupplier !== 'all' && r.supplierId !== selectedSupplier) return false;
      if (selectedUrgency !== 'all' && r.urgency !== selectedUrgency) return false;
      if (onlyShelfLifeRisk && !r.shelfLifeWarning && !r.expiryRisk && !(r.shelfLifeDays && r.shelfLifeDays < 30)) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase().trim();
        const prod = DemoData.getProduct(r.productId);
        const matchesKeyword = prod && prod.keywords && prod.keywords.some(k => k.toLowerCase().includes(q) || q.includes(k.toLowerCase()));
        return r.name.toLowerCase().includes(q) || r.sku.toLowerCase().includes(q) || matchesKeyword;
      }
      return true;
    });
  }

  function renderActiveView() {
    const container = document.getElementById('reorderViewContainer');
    if (!container) return;

    if (activeView === 'supplier') {
      renderSupplierGroupView(container);
    } else {
      renderTableView(container);
    }
    lucide.createIcons();
  }

  function renderTableView(container) {
    const items = getFilteredItems();

    if (items.length === 0) {
      container.innerHTML = `
        <div class="card">
          <div class="card-body">
            <div class="empty-state" style="padding:48px 20px">
              <div class="empty-state-icon"><i data-lucide="check-circle-2" style="color:var(--color-primary)"></i></div>
              <h3>No items match your filter</h3>
              <p>Try resetting filters or adjusting search keywords</p>
              <button class="btn btn-secondary btn-sm" onclick="ReorderModule.resetFilters()">Reset Filters</button>
            </div>
          </div>
        </div>
      `;
      return;
    }

    const allFilteredSelected = items.length > 0 && items.every(i => selectedProductIds.has(i.productId));

    container.innerHTML = `
      <div class="card">
        <div class="table-responsive">
          <table class="table" style="font-size:0.875rem">
            <thead>
              <tr>
                <th style="width:40px;text-align:center">
                  <input type="checkbox" id="selectAllCheckbox" ${allFilteredSelected ? 'checked' : ''} style="cursor:pointer;accent-color:var(--color-primary)">
                </th>
                <th>Product & SKU</th>
                <th>Supplier / Lead Time</th>
                <th>Current Stock</th>
                <th>Forecast Lead Demand</th>
                <th>Safety Stock</th>
                <th>Reorder Point</th>
                <th style="min-width:140px">Recommended Qty</th>
                <th>Est. Cost</th>
                <th>Urgency & Reason</th>
                <th style="text-align:right">Action</th>
              </tr>
            </thead>
            <tbody>
              ${items.map(item => {
                const isSelected = selectedProductIds.has(item.productId);
                const currentQty = modifiedQuantities[item.productId] !== undefined ? modifiedQuantities[item.productId] : item.suggestedQty;
                const cost = currentQty * item.unitCost;
                const daysOfStock = item.avgDailySales > 0 ? Math.round((item.currentStock / item.avgDailySales) * 10) / 10 : '∞';

                let urgencyBadge = '';
                if (item.urgency === 'critical') {
                  urgencyBadge = `<span class="badge badge-danger" style="animation:pulse 2s infinite"><i data-lucide="alert-octagon" style="width:12px;height:12px;margin-right:3px"></i> Critical</span>`;
                } else if (item.urgency === 'high') {
                  urgencyBadge = `<span class="badge badge-warning"><i data-lucide="alert-triangle" style="width:12px;height:12px;margin-right:3px"></i> High</span>`;
                } else if (item.urgency === 'medium') {
                  urgencyBadge = `<span class="badge badge-info"><i data-lucide="clock" style="width:12px;height:12px;margin-right:3px"></i> Medium</span>`;
                } else {
                  urgencyBadge = `<span class="badge badge-neutral"><i data-lucide="check" style="width:12px;height:12px;margin-right:3px"></i> Healthy</span>`;
                }

                return `
                  <tr class="${isSelected ? 'selected-row' : ''}" style="${item.urgency === 'critical' ? 'background-color:rgba(239, 68, 68, 0.03);' : ''}">
                    <td style="text-align:center">
                      <input type="checkbox" class="product-row-checkbox" data-id="${item.productId}" ${isSelected ? 'checked' : ''} style="cursor:pointer;accent-color:var(--color-primary)">
                    </td>
                    <td>
                      <div style="display:flex;align-items:center;gap:10px">
                        <span style="font-size:1.25rem">${item.icon || '📦'}</span>
                        <div>
                          <div style="font-weight:600;color:var(--text-primary)">${item.name}</div>
                          <div style="font-size:0.75rem;color:var(--text-tertiary);font-family:var(--font-mono)">${item.sku} • ${item.category}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style="font-weight:500">${item.supplierName}</div>
                      <div style="font-size:0.75rem;color:var(--text-secondary);display:flex;align-items:center;gap:4px">
                        <i data-lucide="truck" style="width:12px;height:12px"></i> ${item.leadTime}d lead • ETA: ${App.formatDate(item.estimatedArrival)}
                      </div>
                    </td>
                    <td>
                      <div style="font-weight:600;color:${item.currentStock === 0 ? 'var(--color-danger)' : 'var(--text-primary)'}">
                        ${item.currentStock} units
                      </div>
                      <div style="font-size:0.75rem;color:var(--text-tertiary)">
                        ${daysOfStock} days supply (${item.avgDailySales}/day)
                      </div>
                    </td>
                    <td>
                      <span style="font-weight:500">${item.forecastLeadTimeDemand} units</span>
                    </td>
                    <td>
                      <span style="color:var(--text-secondary)">${item.safetyStock} units</span>
                    </td>
                    <td>
                      <span style="font-weight:600;color:var(--color-navy-400)">${item.reorderPoint} units</span>
                    </td>
                    <td>
                      <div style="display:flex;align-items:center;gap:6px">
                        <input type="number" min="0" step="1" 
                          class="form-control reorder-qty-input" 
                          data-id="${item.productId}" 
                          value="${currentQty}" 
                          style="width:80px;height:32px;font-size:0.875rem;text-align:center;font-weight:600">
                        <span style="font-size:0.75rem;color:var(--text-tertiary)">units</span>
                      </div>
                      ${item.shelfLifeCapped ? `
                        <div style="font-size:0.7rem;color:var(--color-warning-dark);margin-top:2px;display:flex;align-items:center;gap:3px">
                          <i data-lucide="shield-alert" style="width:11px;height:11px"></i> Waste cap applied
                        </div>
                      ` : ''}
                    </td>
                    <td>
                      <div style="font-weight:600" id="cost-${item.productId}">${App.formatCurrency(cost)}</div>
                      <div style="font-size:0.75rem;color:var(--text-tertiary)">@ ${App.formatCurrency(item.unitCost)}/unit</div>
                    </td>
                    <td>
                      <div>${urgencyBadge}</div>
                      <div style="font-size:0.75rem;color:var(--text-secondary);margin-top:3px;max-width:260px">
                        ${item.reason}
                      </div>
                      ${item.shelfLifeWarning ? `
                        <div class="alert-item warning" style="padding:4px 8px;margin-top:4px;font-size:0.7rem;border-radius:4px">
                          <i data-lucide="shield-alert" style="width:12px;height:12px;flex-shrink:0"></i>
                          <span>${item.shelfLifeWarning}</span>
                        </div>
                      ` : ''}
                      ${item.expiryRisk ? `
                        <div class="alert-item alert" style="padding:4px 8px;margin-top:4px;font-size:0.7rem;border-radius:4px">
                          <i data-lucide="flame" style="width:12px;height:12px;flex-shrink:0"></i>
                          <span>${item.expiryRisk}</span>
                        </div>
                      ` : ''}
                    </td>
                    <td style="text-align:right">
                      <button class="btn btn-sm btn-secondary single-po-btn" data-id="${item.productId}" title="Create PO for this item">
                        <i data-lucide="plus"></i> Order
                      </button>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    bindTableEvents(container);
  }

  function renderSupplierGroupView(container) {
    const items = getFilteredItems().filter(i => (modifiedQuantities[i.productId] !== undefined ? modifiedQuantities[i.productId] : i.suggestedQty) > 0);

    // Group items by supplier
    const grouped = {};
    DemoData.suppliers.forEach(s => {
      grouped[s.id] = {
        supplier: s,
        items: [],
      };
    });

    items.forEach(item => {
      if (!grouped[item.supplierId]) {
        grouped[item.supplierId] = {
          supplier: { id: item.supplierId, name: item.supplierName, leadTime: item.leadTime, minOrderQty: 10, paymentTerms: 'Net 15' },
          items: [],
        };
      }
      grouped[item.supplierId].items.push(item);
    });

    const activeGroups = Object.values(grouped).filter(g => g.items.length > 0);

    if (activeGroups.length === 0) {
      container.innerHTML = `
        <div class="card">
          <div class="card-body">
            <div class="empty-state" style="padding:48px 20px">
              <div class="empty-state-icon"><i data-lucide="truck"></i></div>
              <h3>No supplier orders needed</h3>
              <p>All items have suggested reorder quantities of zero or are filtered out.</p>
            </div>
          </div>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:20px">
        ${activeGroups.map(group => {
          const s = group.supplier;
          const groupUnits = group.items.reduce((sum, item) => {
            const qty = modifiedQuantities[item.productId] !== undefined ? modifiedQuantities[item.productId] : item.suggestedQty;
            return sum + qty;
          }, 0);
          const groupCost = group.items.reduce((sum, item) => {
            const qty = modifiedQuantities[item.productId] !== undefined ? modifiedQuantities[item.productId] : item.suggestedQty;
            return sum + (qty * item.unitCost);
          }, 0);

          const meetsMoq = groupUnits >= (s.minOrderQty || 0);

          return `
            <div class="card">
              <div class="card-header" style="display:flex;align-items:center;justify-content:space-between;background-color:var(--bg-hover)">
                <div style="display:flex;align-items:center;gap:12px">
                  <div style="width:36px;height:36px;border-radius:8px;background:var(--color-primary-50);color:var(--color-primary);display:flex;align-items:center;justify-content:center">
                    <i data-lucide="building-2" style="width:20px;height:20px"></i>
                  </div>
                  <div>
                    <h3 style="margin:0;font-size:1.05rem;font-weight:600">${s.name}</h3>
                    <div style="font-size:0.75rem;color:var(--text-secondary);display:flex;gap:12px;margin-top:2px">
                      <span><i data-lucide="phone" style="width:11px;height:11px"></i> ${s.phone || 'N/A'}</span>
                      <span><i data-lucide="clock" style="width:11px;height:11px"></i> ${s.leadTime} days lead time</span>
                      <span><i data-lucide="credit-card" style="width:11px;height:11px"></i> ${s.paymentTerms || 'Net 30'}</span>
                    </div>
                  </div>
                </div>
                <div style="display:flex;align-items:center;gap:16px">
                  <div style="text-align:right">
                    <div style="font-size:0.75rem;color:var(--text-tertiary)">Total PO Value</div>
                    <div style="font-weight:700;font-size:1.1rem;color:var(--color-primary)">${App.formatCurrency(groupCost)}</div>
                  </div>
                  <button class="btn btn-primary btn-sm create-group-po-btn" data-supplier-id="${s.id}">
                    <i data-lucide="send"></i> Create PO (${group.items.length} items)
                  </button>
                </div>
              </div>

              <!-- MOQ alert if applicable -->
              ${!meetsMoq ? `
                <div style="background-color:var(--color-warning-50);color:var(--color-warning-dark);padding:8px 16px;font-size:0.8125rem;display:flex;align-items:center;gap:8px;border-bottom:1px solid var(--border-color)">
                  <i data-lucide="alert-triangle" style="width:14px;height:14px"></i>
                  <span>Total order is ${groupUnits} units. Supplier Minimum Order Quantity is ${s.minOrderQty} units. Consider increasing quantities.</span>
                </div>
              ` : ''}

              <div class="table-responsive">
                <table class="table" style="font-size:0.875rem">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>SKU</th>
                      <th>Current Stock</th>
                      <th>Lead Time Demand</th>
                      <th>Order Qty</th>
                      <th>Unit Cost</th>
                      <th>Subtotal</th>
                      <th>Urgency</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${group.items.map(item => {
                      const qty = modifiedQuantities[item.productId] !== undefined ? modifiedQuantities[item.productId] : item.suggestedQty;
                      return `
                        <tr>
                          <td>
                            <div style="display:flex;align-items:center;gap:8px">
                              <span>${item.icon || '📦'}</span>
                              <span style="font-weight:600">${item.name}</span>
                            </div>
                          </td>
                          <td style="font-family:var(--font-mono);font-size:0.75rem">${item.sku}</td>
                          <td>${item.currentStock} units</td>
                          <td>${item.forecastLeadTimeDemand} units</td>
                          <td>
                            <input type="number" min="0" step="1" 
                              class="form-control reorder-qty-input" 
                              data-id="${item.productId}" 
                              value="${qty}" 
                              style="width:75px;height:30px;font-size:0.8125rem;text-align:center;font-weight:600">
                          </td>
                          <td>${App.formatCurrency(item.unitCost)}</td>
                          <td style="font-weight:600">${App.formatCurrency(qty * item.unitCost)}</td>
                          <td>
                            <span class="badge ${item.urgency === 'critical' ? 'badge-danger' : item.urgency === 'high' ? 'badge-warning' : 'badge-neutral'}">
                              ${item.urgency}
                            </span>
                          </td>
                        </tr>
                      `;
                    }).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;

    bindSupplierViewEvents(container);
  }

  function bindFilters(container) {
    const searchInput = container.querySelector('#reorderSearch');
    if (searchInput) {
      let timer;
      searchInput.addEventListener('input', () => {
        clearTimeout(timer);
        timer = setTimeout(() => {
          searchQuery = searchInput.value.trim();
          renderActiveView();
        }, 250);
      });
    }

    const supplierFilter = container.querySelector('#reorderSupplierFilter');
    if (supplierFilter) {
      supplierFilter.addEventListener('change', () => {
        selectedSupplier = supplierFilter.value;
        renderActiveView();
      });
    }

    const urgencyFilter = container.querySelector('#reorderUrgencyFilter');
    if (urgencyFilter) {
      urgencyFilter.addEventListener('change', () => {
        selectedUrgency = urgencyFilter.value;
        renderActiveView();
      });
    }

    const shelfLifeToggle = container.querySelector('#shelfLifeFilterToggle');
    if (shelfLifeToggle) {
      shelfLifeToggle.addEventListener('change', () => {
        onlyShelfLifeRisk = shelfLifeToggle.checked;
        renderActiveView();
      });
    }

    const viewTableBtn = container.querySelector('#viewTableBtn');
    const viewSupplierBtn = container.querySelector('#viewSupplierBtn');
    if (viewTableBtn && viewSupplierBtn) {
      viewTableBtn.addEventListener('click', () => {
        activeView = 'table';
        viewTableBtn.className = 'btn btn-sm btn-primary';
        viewSupplierBtn.className = 'btn btn-sm btn-secondary';
        renderActiveView();
      });
      viewSupplierBtn.addEventListener('click', () => {
        activeView = 'supplier';
        viewSupplierBtn.className = 'btn btn-sm btn-primary';
        viewTableBtn.className = 'btn btn-sm btn-secondary';
        renderActiveView();
      });
    }

    const exportBtn = container.querySelector('#exportReorderCsvBtn');
    if (exportBtn) {
      exportBtn.addEventListener('click', exportReorderCSV);
    }

    const createBatchPoBtn = container.querySelector('#createBatchPoBtn');
    if (createBatchPoBtn) {
      createBatchPoBtn.addEventListener('click', openBatchPoModal);
    }
  }

  function bindTableEvents(container) {
    const selectAllCheckbox = container.querySelector('#selectAllCheckbox');
    if (selectAllCheckbox) {
      selectAllCheckbox.addEventListener('change', () => {
        const filtered = getFilteredItems();
        if (selectAllCheckbox.checked) {
          filtered.forEach(i => selectedProductIds.add(i.productId));
        } else {
          filtered.forEach(i => selectedProductIds.delete(i.productId));
        }
        renderActiveView();
        updateBatchButton();
      });
    }

    container.querySelectorAll('.product-row-checkbox').forEach(cb => {
      cb.addEventListener('change', () => {
        const id = cb.dataset.id;
        if (cb.checked) {
          selectedProductIds.add(id);
        } else {
          selectedProductIds.delete(id);
        }
        cb.closest('tr')?.classList.toggle('selected-row', cb.checked);
        updateBatchButton();
      });
    });

    container.querySelectorAll('.reorder-qty-input').forEach(input => {
      input.addEventListener('change', () => {
        const id = input.dataset.id;
        const val = Math.max(0, parseInt(input.value) || 0);
        input.value = val;
        modifiedQuantities[id] = val;

        const item = recommendations.find(r => r.productId === id);
        if (item) {
          const costEl = document.getElementById(`cost-${id}`);
          if (costEl) costEl.textContent = App.formatCurrency(val * item.unitCost);
        }
        updateBatchButton();
      });
    });

    container.querySelectorAll('.single-po-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const item = recommendations.find(r => r.productId === id);
        if (item) openSinglePoModal(item);
      });
    });
  }

  function bindSupplierViewEvents(container) {
    container.querySelectorAll('.reorder-qty-input').forEach(input => {
      input.addEventListener('change', () => {
        const id = input.dataset.id;
        const val = Math.max(0, parseInt(input.value) || 0);
        input.value = val;
        modifiedQuantities[id] = val;
        renderActiveView();
      });
    });

    container.querySelectorAll('.create-group-po-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const supId = btn.dataset.supplierId;
        openSupplierPoModal(supId);
      });
    });
  }

  function updateBatchButton() {
    const btn = document.getElementById('createBatchPoBtn');
    if (btn) {
      btn.innerHTML = `<i data-lucide="shopping-cart"></i> Generate Purchase Orders (${selectedProductIds.size})`;
      btn.disabled = selectedProductIds.size === 0;
      lucide.createIcons();
    }
  }

  function resetFilters() {
    selectedSupplier = 'all';
    selectedUrgency = 'all';
    onlyShelfLifeRisk = false;
    searchQuery = '';
    const pageContent = document.getElementById('pageContent');
    if (pageContent) renderContent(pageContent);
  }

  // ── Purchase Order Creation Modals ──
  function openSinglePoModal(item) {
    const qty = modifiedQuantities[item.productId] !== undefined ? modifiedQuantities[item.productId] : item.suggestedQty;
    const sup = DemoData.getSupplier(item.supplierId);
    const eta = new Date(Date.now() + (item.leadTime || 3) * 86400000);

    const content = `
      <div style="font-size:0.875rem">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;padding:12px;background:var(--bg-hover);border-radius:8px">
          <span style="font-size:1.8rem">${item.icon || '📦'}</span>
          <div>
            <div style="font-weight:700;font-size:1.05rem">${item.name}</div>
            <div style="color:var(--text-tertiary);font-family:var(--font-mono)">${item.sku} • Supplier: ${item.supplierName}</div>
          </div>
        </div>

        <div class="form-group" style="margin-bottom:14px">
          <label class="form-label">Order Quantity (Units)</label>
          <input type="number" id="poOrderQty" class="form-control" value="${qty}" min="1" step="1">
          <div style="font-size:0.75rem;color:var(--text-tertiary);margin-top:4px">
            Case pack: ${sup ? sup.casePackSize : 1} units • MOQ: ${sup ? sup.minOrderQty : 1} units
          </div>
        </div>

        <div class="form-group" style="margin-bottom:14px">
          <label class="form-label">Expected Delivery Date</label>
          <input type="date" id="poDeliveryDate" class="form-control" value="${eta.toISOString().split('T')[0]}">
          <div style="font-size:0.75rem;color:var(--text-tertiary);margin-top:4px">
            Supplier standard lead time is ${item.leadTime} days
          </div>
        </div>

        <div class="form-group" style="margin-bottom:14px">
          <label class="form-label">Internal Order Notes (Optional)</label>
          <textarea id="poNotes" class="form-control" rows="2" placeholder="Urgent order due to predicted stockout..."></textarea>
        </div>

        <div style="border-top:1px solid var(--border-color);padding-top:12px;display:flex;justify-content:space-between;align-items:center">
          <span style="color:var(--text-secondary)">Estimated Total:</span>
          <span style="font-weight:700;font-size:1.15rem;color:var(--color-primary)" id="modalPoTotal">
            ${App.formatCurrency(qty * item.unitCost)}
          </span>
        </div>
      </div>
    `;

    const footer = `
      <button class="btn btn-secondary" id="modalCancelPo">Cancel</button>
      <button class="btn btn-primary" id="modalSubmitPo"><i data-lucide="check"></i> Confirm & Send PO</button>
    `;

    App.showModal({
      title: `Generate PO for ${item.name}`,
      content,
      footer,
      size: 'modal-md'
    });

    const qtyInput = document.getElementById('poOrderQty');
    const totalEl = document.getElementById('modalPoTotal');
    if (qtyInput && totalEl) {
      qtyInput.addEventListener('input', () => {
        const val = parseInt(qtyInput.value) || 0;
        totalEl.textContent = App.formatCurrency(val * item.unitCost);
      });
    }

    document.getElementById('modalCancelPo')?.addEventListener('click', () => {
      document.querySelector('.modal-overlay')?.remove();
    });

    document.getElementById('modalSubmitPo')?.addEventListener('click', async () => {
      const finalQty = parseInt(qtyInput.value) || 0;
      if (finalQty <= 0) {
        App.showToast('error', 'Invalid Quantity', 'Please enter a quantity greater than zero');
        return;
      }

      const orderData = {
        supplierId: item.supplierId,
        supplierName: item.supplierName,
        expectedDate: new Date(document.getElementById('poDeliveryDate').value),
        notes: document.getElementById('poNotes').value,
        totalAmount: finalQty * item.unitCost,
        items: [{
          productId: item.productId,
          productName: item.name,
          sku: item.sku,
          quantity: finalQty,
          unitCost: item.unitCost,
          total: finalQty * item.unitCost,
          received: 0,
        }]
      };

      try {
        const res = await API.PurchaseOrders.create(orderData);
        // Also update incoming stock in DemoData
        const product = DemoData.getProduct(item.productId);
        if (product) product.incomingStock += finalQty;

        App.showToast('success', 'Purchase Order Created', `PO #${res.data.id} created for ${item.name}`);
        document.querySelector('.modal-overlay')?.remove();
        App.navigateTo('suppliers');
      } catch (e) {
        App.showToast('error', 'Error', e.message);
      }
    });
  }

  function openSupplierPoModal(supplierId) {
    const s = DemoData.getSupplier(supplierId);
    const supItems = recommendations.filter(r => r.supplierId === supplierId && selectedProductIds.has(r.productId));

    if (supItems.length === 0) {
      App.showToast('warning', 'No Items', 'No items selected for this supplier');
      return;
    }

    const itemsWithQty = supItems.map(item => {
      const qty = modifiedQuantities[item.productId] !== undefined ? modifiedQuantities[item.productId] : item.suggestedQty;
      return { ...item, qty, lineTotal: qty * item.unitCost };
    }).filter(i => i.qty > 0);

    const totalCost = itemsWithQty.reduce((s, i) => s + i.lineTotal, 0);
    const totalUnits = itemsWithQty.reduce((s, i) => s + i.qty, 0);

    const content = `
      <div style="font-size:0.875rem">
        <div style="padding:12px;background:var(--bg-hover);border-radius:8px;margin-bottom:16px">
          <div style="font-weight:700;font-size:1.05rem;color:var(--text-primary)">${s ? s.name : 'Supplier'}</div>
          <div style="color:var(--text-secondary);font-size:0.75rem;margin-top:2px">
            Lead Time: ${s ? s.leadTime : 3} days • Contact: ${s ? s.contactPerson : 'N/A'} (${s ? s.phone : 'N/A'})
          </div>
        </div>

        <div style="max-height:220px;overflow-y:auto;border:1px solid var(--border-color);border-radius:8px;margin-bottom:14px">
          <table class="table" style="font-size:0.8125rem;margin:0">
            <thead>
              <tr style="background:var(--bg-body)">
                <th>Product</th>
                <th>Qty</th>
                <th>Rate</th>
                <th style="text-align:right">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${itemsWithQty.map(i => `
                <tr>
                  <td>${i.name} <span style="font-size:0.7rem;color:var(--text-tertiary)">(${i.sku})</span></td>
                  <td style="font-weight:600">${i.qty}</td>
                  <td>${App.formatCurrency(i.unitCost)}</td>
                  <td style="text-align:right;font-weight:600">${App.formatCurrency(i.lineTotal)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <div style="display:flex;justify-content:space-between;padding:10px;background:var(--color-primary-50);border-radius:6px;font-weight:600;color:var(--color-primary-dark)">
          <span>Total ${totalUnits} Units (${itemsWithQty.length} Products):</span>
          <span>${App.formatCurrency(totalCost)}</span>
        </div>
      </div>
    `;

    const footer = `
      <button class="btn btn-secondary" id="modalCancelSupplierPo">Cancel</button>
      <button class="btn btn-primary" id="modalConfirmSupplierPo"><i data-lucide="check"></i> Confirm PO</button>
    `;

    App.showModal({
      title: `Create Consolidated PO — ${s ? s.name : 'Supplier'}`,
      content,
      footer,
      size: 'modal-md'
    });

    document.getElementById('modalCancelSupplierPo')?.addEventListener('click', () => {
      document.querySelector('.modal-overlay')?.remove();
    });

    document.getElementById('modalConfirmSupplierPo')?.addEventListener('click', async () => {
      const orderData = {
        supplierId: supplierId,
        supplierName: s ? s.name : 'Supplier',
        expectedDate: new Date(Date.now() + (s ? s.leadTime : 3) * 86400000),
        notes: `Consolidated stock reorder plan (${itemsWithQty.length} line items)`,
        totalAmount: totalCost,
        items: itemsWithQty.map(i => ({
          productId: i.productId,
          productName: i.name,
          sku: i.sku,
          quantity: i.qty,
          unitCost: i.unitCost,
          total: i.lineTotal,
          received: 0,
        }))
      };

      try {
        const res = await API.PurchaseOrders.create(orderData);
        // update incomingStock
        itemsWithQty.forEach(i => {
          const product = DemoData.getProduct(i.productId);
          if (product) product.incomingStock += i.qty;
        });

        App.showToast('success', 'Purchase Order Created', `PO #${res.data.id} placed for ${s ? s.name : 'Supplier'}`);
        document.querySelector('.modal-overlay')?.remove();
        App.navigateTo('suppliers');
      } catch (e) {
        App.showToast('error', 'Error', e.message);
      }
    });
  }

  function openBatchPoModal() {
    const selected = recommendations.filter(r => selectedProductIds.has(r.productId));
    if (selected.length === 0) return;

    // Group selected products by supplier
    const bySupplier = {};
    selected.forEach(item => {
      const qty = modifiedQuantities[item.productId] !== undefined ? modifiedQuantities[item.productId] : item.suggestedQty;
      if (qty > 0) {
        if (!bySupplier[item.supplierId]) {
          bySupplier[item.supplierId] = {
            supplierName: item.supplierName,
            leadTime: item.leadTime,
            items: [],
          };
        }
        bySupplier[item.supplierId].items.push({ ...item, qty, lineTotal: qty * item.unitCost });
      }
    });

    const supplierCount = Object.keys(bySupplier).length;
    const totalPosCost = Object.values(bySupplier).reduce((acc, sup) => {
      return acc + sup.items.reduce((sum, i) => sum + i.lineTotal, 0);
    }, 0);

    const content = `
      <div style="font-size:0.875rem">
        <p style="color:var(--text-secondary);margin-bottom:16px">
          This will generate <strong>${supplierCount} separate Purchase Orders</strong> (one per supplier) for a total of <strong>${selected.length} items</strong>.
        </p>

        <div style="display:flex;flex-direction:column;gap:10px;max-height:260px;overflow-y:auto;padding-right:4px">
          ${Object.entries(bySupplier).map(([supId, data]) => {
            const subtotal = data.items.reduce((s, i) => s + i.lineTotal, 0);
            const units = data.items.reduce((s, i) => s + i.qty, 0);
            return `
              <div style="padding:10px 14px;border:1px solid var(--border-color);border-radius:8px;display:flex;align-items:center;justify-content:space-between">
                <div>
                  <div style="font-weight:600">${data.supplierName}</div>
                  <div style="font-size:0.75rem;color:var(--text-tertiary)">${data.items.length} items • ${units} units • ${data.leadTime}d lead</div>
                </div>
                <div style="font-weight:700;color:var(--color-primary)">${App.formatCurrency(subtotal)}</div>
              </div>
            `;
          }).join('')}
        </div>

        <div style="border-top:1px solid var(--border-color);margin-top:16px;padding-top:14px;display:flex;justify-content:space-between;align-items:center">
          <span style="font-weight:600">Combined Total:</span>
          <span style="font-size:1.25rem;font-weight:700;color:var(--color-primary)">${App.formatCurrency(totalPosCost)}</span>
        </div>
      </div>
    `;

    const footer = `
      <button class="btn btn-secondary" id="modalCancelBatch">Cancel</button>
      <button class="btn btn-primary" id="modalConfirmBatch"><i data-lucide="check-check"></i> Generate ${supplierCount} POs</button>
    `;

    App.showModal({
      title: 'Batch Purchase Order Generation',
      content,
      footer,
      size: 'modal-md'
    });

    document.getElementById('modalCancelBatch')?.addEventListener('click', () => {
      document.querySelector('.modal-overlay')?.remove();
    });

    document.getElementById('modalConfirmBatch')?.addEventListener('click', async () => {
      let createdCount = 0;
      for (const [supId, data] of Object.entries(bySupplier)) {
        const orderData = {
          supplierId: supId,
          supplierName: data.supplierName,
          expectedDate: new Date(Date.now() + (data.leadTime || 3) * 86400000),
          notes: 'Auto-generated from StockSense intelligent reorder plan',
          totalAmount: data.items.reduce((s, i) => s + i.lineTotal, 0),
          items: data.items.map(i => ({
            productId: i.productId,
            productName: i.name,
            sku: i.sku,
            quantity: i.qty,
            unitCost: i.unitCost,
            total: i.lineTotal,
            received: 0,
          }))
        };
        await API.PurchaseOrders.create(orderData);
        data.items.forEach(i => {
          const product = DemoData.getProduct(i.productId);
          if (product) product.incomingStock += i.qty;
        });
        createdCount++;
      }

      App.showToast('success', 'Batch POs Created', `Successfully generated ${createdCount} Purchase Orders`);
      document.querySelector('.modal-overlay')?.remove();
      App.navigateTo('suppliers');
    });
  }

  function exportReorderCSV() {
    const items = getFilteredItems().map(item => {
      const qty = modifiedQuantities[item.productId] !== undefined ? modifiedQuantities[item.productId] : item.suggestedQty;
      return {
        'SKU': item.sku,
        'Product Name': item.name,
        'Category': item.category,
        'Supplier': item.supplierName,
        'Lead Time (Days)': item.leadTime,
        'Current Stock': item.currentStock,
        'Daily Avg Sales': item.avgDailySales,
        'Forecast Lead Demand': item.forecastLeadTimeDemand,
        'Safety Stock': item.safetyStock,
        'Reorder Point': item.reorderPoint,
        'Suggested Qty': qty,
        'Unit Cost': item.unitCost,
        'Estimated Cost': qty * item.unitCost,
        'Urgency': item.urgency,
        'Reason': item.reason,
        'Shelf Life Warning': item.shelfLifeWarning || '',
      };
    });

    App.exportCSV(items, `StockSense_Reorder_Plan_${new Date().toISOString().split('T')[0]}.csv`);
    App.showToast('info', 'Export Complete', 'Reorder plan downloaded as CSV');
  }

  function executeTransfers() {
    const branchTransfers = DataStore.getMultiBranchTransfers ? DataStore.getMultiBranchTransfers() : [];
    if (branchTransfers.length === 0) {
      App.showToast('info', 'No Transfers', 'No inter-branch transfers needed.');
      return;
    }

    let count = 0;
    branchTransfers.forEach(t => {
      DataStore.executeBranchTransfer(t.productId, t.transferQty);
      count++;
    });

    App.showToast('success', 'கிளை மாற்றல் முடிந்தது', `${count} inter-branch transfers completed successfully. Avoided new purchase order!`);
    render(document.getElementById('pageContent'));
  }

  return {
    render,
    resetFilters,
    executeTransfers
  };
})();

App.registerPage('reorder', ReorderModule);
