/* ========================================
   StockSense — Dashboard Module
   ======================================== */

const DashboardModule = (() => {
  let charts = {};

  function render(container) {
    const products = DemoData.products;
    const totalProducts = products.length;
    const totalUnits = products.reduce((s, p) => s + p.stock, 0);
    const totalValue = products.reduce((s, p) => s + p.stock * p.costPrice, 0);
    const lowStockCount = products.filter(p => p.stock > 0 && p.stock <= p.reorderLevel).length;
    const outOfStock = products.filter(p => p.stock === 0).length;

    const nearExpiry = products.filter(p => {
      const d = DemoData.daysUntil(p.expiryDate);
      return d > 0 && d <= 7 && p.stock > 0;
    }).length;

    // Predicted stockouts (will run out within lead time)
    const predictedStockouts = products.filter(p => {
      if (p.stock === 0) return false;
      const sup = DemoData.getSupplier(p.supplierId);
      const lt = sup ? sup.leadTime : 3;
      return p.avgDailySales > 0 && (p.stock / p.avgDailySales) < lt;
    }).length;

    // Estimated lost sales from out-of-stock
    const estLostSales = products.filter(p => p.stock === 0).reduce((s, p) => s + p.avgDailySales * p.sellingPrice, 0);

    // Quick reorder investment
    let reorderInvestment = 0;
    products.forEach(p => {
      const sup = DemoData.getSupplier(p.supplierId);
      const lt = sup ? sup.leadTime : 3;
      const safetyStock = Math.round(p.avgDailySales * DemoData.shopConfig.safetyStockDays);
      const reorderPoint = Math.round(p.avgDailySales * lt) + safetyStock;
      const netStock = p.stock + p.incomingStock - p.reservedStock;
      if (netStock <= reorderPoint) {
        const target = Math.round(p.avgDailySales * (lt + DemoData.shopConfig.reviewPeriodDays + DemoData.shopConfig.safetyStockDays));
        const qty = Math.max(0, target - netStock);
        reorderInvestment += qty * p.costPrice;
      }
    });

    container.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h1>Dashboard Overview</h1>
          <p>Real-time inventory health and performance summary</p>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-secondary" onclick="App.navigateTo('reports')"><i data-lucide="bar-chart-3"></i> Reports</button>
          <button class="btn btn-primary" onclick="App.navigateTo('reorder')"><i data-lucide="shopping-cart"></i> Generate Reorder Plan</button>
        </div>
      </div>



      <!-- Stats Grid -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon emerald"><i data-lucide="package"></i></div>
          <div class="stat-content">
            <div class="stat-label">Total Products</div>
            <div class="stat-value">${totalProducts}</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon blue"><i data-lucide="boxes"></i></div>
          <div class="stat-content">
            <div class="stat-label">Total Inventory</div>
            <div class="stat-value">${App.formatNumber(totalUnits)}</div>
            <div class="stat-change up"><i data-lucide="trending-up"></i> units in stock</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon navy"><i data-lucide="indian-rupee"></i></div>
          <div class="stat-content">
            <div class="stat-label">Inventory Value</div>
            <div class="stat-value">${App.formatCurrency(totalValue)}</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon amber"><i data-lucide="alert-triangle"></i></div>
          <div class="stat-content">
            <div class="stat-label">Low Stock Items</div>
            <div class="stat-value">${lowStockCount + outOfStock}</div>
            <div class="stat-change down"><i data-lucide="arrow-down"></i> ${outOfStock} out of stock</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon red"><i data-lucide="alert-circle"></i></div>
          <div class="stat-content">
            <div class="stat-label">Predicted Stockouts</div>
            <div class="stat-value">${predictedStockouts}</div>
            <div class="stat-change down"><i data-lucide="clock"></i> within lead time</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon amber"><i data-lucide="timer"></i></div>
          <div class="stat-content">
            <div class="stat-label">Near Expiry</div>
            <div class="stat-value">${nearExpiry}</div>
            <div class="stat-change ${nearExpiry > 0 ? 'down' : 'up'}"><i data-lucide="${nearExpiry > 0 ? 'alert-triangle' : 'check'}"></i> within 7 days</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon emerald"><i data-lucide="wallet"></i></div>
          <div class="stat-content">
            <div class="stat-label">Reorder Investment</div>
            <div class="stat-value">${App.formatCurrency(reorderInvestment)}</div>
            <div class="stat-change"><i data-lucide="info"></i> recommended</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon red"><i data-lucide="trending-down"></i></div>
          <div class="stat-content">
            <div class="stat-label">Est. Lost Sales/Day</div>
            <div class="stat-value">${App.formatCurrency(estLostSales)}</div>
            <div class="stat-change down"><i data-lucide="alert-circle"></i> from stockouts</div>
          </div>
        </div>
      </div>

      <!-- Charts Row 1 -->
      <div class="dashboard-charts">
        <div class="card">
          <div class="card-header"><h3>Sales vs Forecast Demand (7 Days)</h3></div>
          <div class="card-body"><div class="chart-container" style="height:280px"><canvas id="salesForecastChart"></canvas></div></div>
        </div>
        <div class="card">
          <div class="card-header"><h3>Inventory Health</h3></div>
          <div class="card-body">
            <div class="health-ring-container">
              <div class="health-ring"><canvas id="healthChart"></canvas>
                <div class="health-ring-center">
                  <div class="value">${totalProducts}</div>
                  <div class="label">Products</div>
                </div>
              </div>
              <div class="health-legend" id="healthLegend"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Charts Row 2 -->
      <div class="charts-grid">
        <div class="card">
          <div class="card-header"><h3>Top Selling Products</h3></div>
          <div class="card-body"><div id="topProductsList" class="top-products-list"></div></div>
        </div>
        <div class="card">
          <div class="card-header"><h3>Stockout Risk Products</h3></div>
          <div class="card-body"><div id="stockoutRiskList"></div></div>
        </div>
        <div class="card">
          <div class="card-header"><h3>Inventory Value by Category</h3></div>
          <div class="card-body"><div class="chart-container" style="height:220px"><canvas id="categoryChart"></canvas></div><div id="categoryLegend" class="category-legend"></div></div>
        </div>
        <div class="card">
          <div class="card-header"><h3>Reorder Urgency</h3></div>
          <div class="card-body"><div id="urgencyBars" class="urgency-bars"></div></div>
        </div>
      </div>

      <!-- Bottom Row: Activity + Alerts -->
      <div class="two-col">
        <div class="card">
          <div class="card-header"><h3>Recent Activity</h3><span class="badge badge-info">Live</span></div>
          <div class="card-body compact"><div class="activity-feed" id="activityFeed"></div></div>
        </div>
        <div class="card">
          <div class="card-header"><h3>Critical Alerts</h3><span class="badge badge-critical">${DemoData.notifications.filter(n => !n.read).length} new</span></div>
          <div class="card-body compact"><div class="alerts-panel" id="alertsPanel"></div></div>
        </div>
      </div>
    `;

    lucide.createIcons();
    renderCharts();
    renderTopProducts();
    renderStockoutRisk();
    renderUrgencyBars();
    renderActivityFeed();
    renderAlerts();
  }

  function renderCharts() {
    // Destroy old charts
    Object.values(charts).forEach(c => c.destroy());
    charts = {};

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const gridColor = isDark ? 'rgba(148,163,184,0.1)' : 'rgba(0,0,0,0.05)';
    const textColor = isDark ? '#94a3b8' : '#64748b';

    // Sales vs Forecast
    const salesDates = [];
    const salesValues = [];
    const forecastValues = [];
    const today = new Date();

    for (let d = -7; d <= 7; d++) {
      const date = new Date(today.getTime() + d * 86400000);
      const label = date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
      salesDates.push(label);

      if (d <= 0) {
        // Historical sales
        const dayStr = date.toISOString().split('T')[0];
        const daySales = DemoData.salesHistory.filter(s => s.date.toISOString().split('T')[0] === dayStr);
        salesValues.push(daySales.reduce((s, sale) => s + sale.total, 0));
        forecastValues.push(null);
      } else {
        salesValues.push(null);
        // Simple forecast
        const avgDayTotal = DemoData.products.reduce((s, p) => s + p.avgDailySales * p.sellingPrice, 0);
        const variation = 0.9 + Math.random() * 0.2;
        forecastValues.push(Math.round(avgDayTotal * variation));
      }
    }

    const sfCtx = document.getElementById('salesForecastChart');
    if (sfCtx) {
      charts.salesForecast = new Chart(sfCtx, {
        type: 'line',
        data: {
          labels: salesDates,
          datasets: [
            {
              label: 'Actual Sales',
              data: salesValues,
              borderColor: '#3b82f6',
              backgroundColor: 'rgba(59,130,246,0.08)',
              fill: true,
              tension: 0.4,
              pointRadius: 3,
              pointHoverRadius: 5,
              borderWidth: 2,
            },
            {
              label: 'Forecast',
              data: forecastValues,
              borderColor: '#10b981',
              borderDash: [5, 5],
              backgroundColor: 'rgba(16,185,129,0.06)',
              fill: true,
              tension: 0.4,
              pointRadius: 3,
              pointHoverRadius: 5,
              borderWidth: 2,
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'top', labels: { usePointStyle: true, font: { size: 11 }, color: textColor } },
            tooltip: {
              backgroundColor: isDark ? '#1e293b' : '#fff',
              titleColor: isDark ? '#f1f5f9' : '#0f172a',
              bodyColor: isDark ? '#94a3b8' : '#475569',
              borderColor: isDark ? '#334155' : '#e2e8f0',
              borderWidth: 1,
              padding: 10,
              cornerRadius: 8,
              callbacks: {
                label: (ctx) => `${ctx.dataset.label}: ${DemoData.formatCurrency(ctx.parsed.y)}`
              }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              grid: { color: gridColor },
              ticks: { color: textColor, font: { size: 10 }, callback: v => DemoData.shopConfig.currency + (v / 1000).toFixed(0) + 'k' }
            },
            x: { grid: { display: false }, ticks: { color: textColor, font: { size: 10 }, maxRotation: 45 } }
          }
        }
      });
    }

    // Health Donut
    const healthy = DemoData.products.filter(p => DemoData.getStockStatus(p).label === 'Healthy').length;
    const low = DemoData.products.filter(p => DemoData.getStockStatus(p).label === 'Low Stock').length;
    const critical = DemoData.products.filter(p => DemoData.getStockStatus(p).label === 'Critical' || DemoData.getStockStatus(p).label === 'Near Expiry').length;
    const oos = DemoData.products.filter(p => DemoData.getStockStatus(p).label === 'Out of Stock').length;

    const healthCtx = document.getElementById('healthChart');
    if (healthCtx) {
      charts.health = new Chart(healthCtx, {
        type: 'doughnut',
        data: {
          labels: ['Healthy', 'Low Stock', 'Critical/Expiry', 'Out of Stock'],
          datasets: [{
            data: [healthy, low, critical, oos],
            backgroundColor: ['#10b981', '#f59e0b', '#ef4444', '#1e293b'],
            borderWidth: 0,
            hoverOffset: 4,
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '72%',
          plugins: { legend: { display: false } },
        }
      });

      // Legend
      const legend = document.getElementById('healthLegend');
      if (legend) {
        const items = [
          { color: '#10b981', label: 'Healthy', count: healthy },
          { color: '#f59e0b', label: 'Low Stock', count: low },
          { color: '#ef4444', label: 'Critical / Expiry', count: critical },
          { color: '#1e293b', label: 'Out of Stock', count: oos },
        ];
        legend.innerHTML = items.map(i => `
          <div class="health-legend-item">
            <span class="health-legend-dot" style="background:${i.color}"></span>
            <span>${i.label}</span>
            <span class="count">${i.count}</span>
          </div>
        `).join('');
      }
    }

    // Category Value
    const categoryMap = {};
    DemoData.products.forEach(p => {
      if (!categoryMap[p.category]) categoryMap[p.category] = 0;
      categoryMap[p.category] += p.stock * p.costPrice;
    });
    const catLabels = Object.keys(categoryMap);
    const catValues = Object.values(categoryMap);
    const catColors = ['#059669', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

    const catCtx = document.getElementById('categoryChart');
    if (catCtx) {
      charts.category = new Chart(catCtx, {
        type: 'doughnut',
        data: {
          labels: catLabels,
          datasets: [{ data: catValues, backgroundColor: catColors.slice(0, catLabels.length), borderWidth: 0 }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '60%',
          plugins: { legend: { display: false } },
        }
      });

      const catLegend = document.getElementById('categoryLegend');
      if (catLegend) {
        catLegend.innerHTML = catLabels.map((l, i) => `
          <div class="category-legend-item">
            <span class="category-legend-color" style="background:${catColors[i]}"></span>
            <span class="category-legend-label">${l}</span>
            <span class="category-legend-value">${DemoData.formatCurrency(catValues[i])}</span>
          </div>
        `).join('');
      }
    }
  }

  function renderTopProducts() {
    const el = document.getElementById('topProductsList');
    if (!el) return;

    // Aggregate weekly sales
    const weekAgo = new Date(Date.now() - 7 * 86400000);
    const weeklySales = {};
    DemoData.salesHistory.filter(s => s.date >= weekAgo).forEach(s => {
      if (!weeklySales[s.productId]) weeklySales[s.productId] = 0;
      weeklySales[s.productId] += s.quantitySold;
    });

    const sorted = Object.entries(weeklySales)
      .map(([id, qty]) => ({ product: DemoData.getProduct(id), qty }))
      .filter(x => x.product)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 6);

    const maxQty = sorted[0]?.qty || 1;

    el.innerHTML = sorted.map((item, i) => `
      <div class="top-product-item">
        <div class="top-product-rank ${i < 3 ? `rank-${i + 1}` : ''}">${i + 1}</div>
        <div class="top-product-info">
          <div class="top-product-name">${item.product.icon} ${item.product.name}</div>
          <div class="top-product-bar"><div class="top-product-bar-fill" style="width:${(item.qty / maxQty * 100)}%"></div></div>
        </div>
        <div class="top-product-value">${item.qty} units</div>
      </div>
    `).join('');
  }

  function renderStockoutRisk() {
    const el = document.getElementById('stockoutRiskList');
    if (!el) return;

    const riskProducts = DemoData.products
      .map(p => {
        const sup = DemoData.getSupplier(p.supplierId);
        const lt = sup ? sup.leadTime : 3;
        const daysLeft = p.avgDailySales > 0 ? Math.round(p.stock / p.avgDailySales * 10) / 10 : Infinity;
        return { product: p, daysLeft, leadTime: lt };
      })
      .filter(x => x.daysLeft < 10)
      .sort((a, b) => a.daysLeft - b.daysLeft)
      .slice(0, 6);

    if (riskProducts.length === 0) {
      el.innerHTML = '<div class="empty-state" style="padding:20px"><p>No stockout risks detected</p></div>';
      return;
    }

    el.innerHTML = `<table class="risk-table"><tbody>${riskProducts.map(r => {
      const riskClass = r.daysLeft < r.leadTime ? 'critical' : r.daysLeft < r.leadTime * 2 ? 'warning' : 'safe';
      return `<tr>
        <td style="width:40%"><div class="product-cell"><span class="product-icon">${r.product.icon}</span><div class="product-info"><div class="product-name">${r.product.name}</div><div class="product-sku">${r.product.sku}</div></div></div></td>
        <td class="text-right">${r.product.stock} units</td>
        <td class="text-right"><span class="risk-days ${riskClass}">${r.daysLeft === 0 ? 'Now' : r.daysLeft + 'd'}</span></td>
        <td class="text-right"><span class="badge badge-${riskClass === 'critical' ? 'critical' : riskClass === 'warning' ? 'warning' : 'healthy'} badge-dot">${riskClass === 'critical' ? 'Critical' : riskClass === 'warning' ? 'At Risk' : 'Monitor'}</span></td>
      </tr>`;
    }).join('')}</tbody></table>`;
  }

  function renderUrgencyBars() {
    const el = document.getElementById('urgencyBars');
    if (!el) return;

    // Calculate urgency counts
    const counts = { critical: 0, high: 0, medium: 0, low: 0 };
    DemoData.products.forEach(p => {
      const sup = DemoData.getSupplier(p.supplierId);
      const lt = sup ? sup.leadTime : 3;
      const safetyStock = Math.round(p.avgDailySales * DemoData.shopConfig.safetyStockDays);
      const reorderPoint = Math.round(p.avgDailySales * lt) + safetyStock;
      const netStock = p.stock + p.incomingStock;
      const daysOfStock = p.avgDailySales > 0 ? p.stock / p.avgDailySales : Infinity;

      if (p.stock === 0 && p.incomingStock === 0) counts.critical++;
      else if (daysOfStock < lt) counts.critical++;
      else if (netStock <= reorderPoint) counts.high++;
      else if (netStock <= reorderPoint * 1.3) counts.medium++;
      else counts.low++;
    });

    const total = DemoData.products.length;
    const bars = [
      { label: 'Critical', key: 'critical', count: counts.critical },
      { label: 'High', key: 'high', count: counts.high },
      { label: 'Medium', key: 'medium', count: counts.medium },
      { label: 'Low', key: 'low', count: counts.low },
    ];

    el.innerHTML = bars.map(b => `
      <div class="urgency-bar-item">
        <span class="urgency-label badge badge-${b.key === 'critical' ? 'critical' : b.key === 'high' ? 'warning' : b.key === 'medium' ? 'info' : 'healthy'} badge-dot">${b.label}</span>
        <div class="urgency-bar"><div class="urgency-bar-fill ${b.key}" style="width:${total > 0 ? (b.count / total * 100) : 0}%"></div></div>
        <span class="urgency-count">${b.count}</span>
      </div>
    `).join('');
  }

  function renderActivityFeed() {
    const el = document.getElementById('activityFeed');
    if (!el) return;

    el.innerHTML = DemoData.activityFeed.map(a => `
      <div class="activity-item">
        <div class="activity-icon ${a.type}"><i data-lucide="${a.icon}"></i></div>
        <div class="activity-content">
          <p>${a.message}</p>
          <div class="activity-time">${a.time}</div>
        </div>
      </div>
    `).join('');
    lucide.createIcons();
  }

  function renderAlerts() {
    const el = document.getElementById('alertsPanel');
    if (!el) return;

    // Generate contextual alerts from data
    const alerts = [];

    // Out of stock alerts
    DemoData.products.filter(p => p.stock === 0).forEach(p => {
      alerts.push({
        type: 'critical',
        icon: 'alert-triangle',
        title: `${p.name} is out of stock`,
        desc: `Estimated ${p.avgDailySales} units/day lost. ${p.incomingStock > 0 ? `${p.incomingStock} units incoming.` : 'No incoming stock.'}`,
        time: 'Active',
      });
    });

    // Near expiry
    DemoData.products.filter(p => DemoData.daysUntil(p.expiryDate) <= 5 && DemoData.daysUntil(p.expiryDate) > 0 && p.stock > 0).forEach(p => {
      alerts.push({
        type: 'warning',
        icon: 'clock',
        title: `${p.name} expires in ${DemoData.daysUntil(p.expiryDate)} days`,
        desc: `${p.stock} units at risk. Consider clearance or promotion.`,
        time: 'Active',
      });
    });

    // Stockout predictions
    DemoData.products.filter(p => {
      const sup = DemoData.getSupplier(p.supplierId);
      const lt = sup ? sup.leadTime : 3;
      const daysLeft = p.avgDailySales > 0 ? p.stock / p.avgDailySales : Infinity;
      return daysLeft > 0 && daysLeft < lt && p.stock > 0;
    }).forEach(p => {
      const daysLeft = Math.round(p.stock / p.avgDailySales * 10) / 10;
      alerts.push({
        type: 'warning',
        icon: 'trending-down',
        title: `${p.name} — stockout in ~${daysLeft} days`,
        desc: `Current stock: ${p.stock}. Avg daily sales: ${p.avgDailySales}.`,
        time: 'Active',
      });
    });

    if (alerts.length === 0) {
      el.innerHTML = '<div class="empty-state" style="padding:20px"><i data-lucide="check-circle" style="color:var(--color-success);width:32px;height:32px;margin:0 auto 8px;display:block"></i><p>No critical alerts. All systems healthy!</p></div>';
      lucide.createIcons();
      return;
    }

    el.innerHTML = alerts.slice(0, 8).map(a => `
      <div class="alert-item ${a.type}">
        <i data-lucide="${a.icon}" class="alert-icon"></i>
        <div class="alert-text">
          <div class="alert-title">${a.title}</div>
          <div class="alert-desc">${a.desc}</div>
          <div class="alert-time">${a.time}</div>
        </div>
      </div>
    `).join('');
    lucide.createIcons();
  }

  return { render };
})();

App.registerPage('overview', DashboardModule);
