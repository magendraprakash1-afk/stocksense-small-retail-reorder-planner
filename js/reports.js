/* ========================================
   StockSense — Reports & Analytics Module
   Valuation, sales trends, dead stock, and shelf-life wastage mitigation
   ======================================== */

const ReportsModule = (() => {
  let charts = {};

  async function render(container) {
    container.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:center;padding:80px 0">
        <div class="spinner" style="width:32px;height:32px"></div>
      </div>
    `;

    try {
      const [trendsRes, valuationRes, slowRes, expiryRes] = await Promise.all([
        API.Reports.getSalesTrends(30),
        API.Reports.getInventoryValuation(),
        API.Reports.getSlowMoving(2),
        API.Reports.getExpiryRisks()
      ]);

      renderContent(container, trendsRes.data, valuationRes.data, slowRes.data, expiryRes.data);
    } catch (err) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon"><i data-lucide="alert-triangle"></i></div>
          <h3>Failed to load analytics</h3>
          <p>${err.message}</p>
        </div>
      `;
      lucide.createIcons();
    }
  }

  function renderContent(container, salesTrends, valuation, slowMoving, expiryRisks) {
    const totalCost = valuation.reduce((s, v) => s + v.costValue, 0);
    const totalRetail = valuation.reduce((s, v) => s + v.retailValue, 0);
    const potentialMargin = totalRetail > 0 ? Math.round(((totalRetail - totalCost) / totalRetail) * 100) : 0;
    const totalExpiryLossRisk = expiryRisks.reduce((s, p) => s + (p.stock * p.costPrice), 0);
    const slowStockCapital = slowMoving.reduce((s, p) => s + (p.stock * p.costPrice), 0);

    container.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h1>Inventory Analytics & Waste Reports</h1>
          <p>Financial valuation, category revenue contribution, slow-moving dead stock, and shelf-life risk mitigation</p>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-secondary" onclick="window.print()"><i data-lucide="printer"></i> Print / PDF</button>
          <button class="btn btn-primary" id="exportReportCsvBtn"><i data-lucide="download"></i> Export Analytics CSV</button>
        </div>
      </div>

      <!-- KPI Overview Grid -->
      <div class="stats-grid" style="margin-bottom: 24px;">
        <div class="stat-card">
          <div class="stat-icon emerald"><i data-lucide="banknote"></i></div>
          <div class="stat-content">
            <div class="stat-label">Total Inventory Valuation</div>
            <div class="stat-value">${App.formatCurrency(totalCost)}</div>
            <div class="stat-change" style="color:var(--text-secondary);font-size:0.75rem">
              Cost basis across all categories
            </div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon blue"><i data-lucide="trending-up"></i></div>
          <div class="stat-content">
            <div class="stat-label">Potential Retail Value</div>
            <div class="stat-value">${App.formatCurrency(totalRetail)}</div>
            <div class="stat-change positive">
              <i data-lucide="arrow-up-right"></i> ${potentialMargin}% projected gross margin
            </div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon red"><i data-lucide="shield-alert"></i></div>
          <div class="stat-content">
            <div class="stat-label">At-Risk Wastage Value</div>
            <div class="stat-value" style="color:var(--color-danger)">${App.formatCurrency(totalExpiryLossRisk)}</div>
            <div class="stat-change negative">
              <i data-lucide="clock"></i> ${expiryRisks.length} perishable products &le; 14 days
            </div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon amber"><i data-lucide="hourglass"></i></div>
          <div class="stat-content">
            <div class="stat-label">Slow-Moving Tied Capital</div>
            <div class="stat-value" style="color:var(--color-warning-dark)">${App.formatCurrency(slowStockCapital)}</div>
            <div class="stat-change" style="color:var(--text-secondary);font-size:0.75rem">
              ${slowMoving.length} low velocity items (&le; 2 units/day)
            </div>
          </div>
        </div>
      </div>

      <!-- Analytics Charts -->
      <div class="dashboard-charts" style="margin-bottom: 24px;">
        <div class="card">
          <div class="card-header" style="display:flex;align-items:center;justify-content:space-between">
            <div style="font-weight:600">30-Day Sales & Revenue Velocity</div>
            <span class="badge badge-emerald" style="font-size:0.7rem">Daily Rolling Ledger</span>
          </div>
          <div class="card-body">
            <div style="height:280px;position:relative">
              <canvas id="salesTrendsChart"></canvas>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-header" style="display:flex;align-items:center;justify-content:space-between">
            <div style="font-weight:600">Inventory Valuation by Category</div>
            <span style="font-size:0.75rem;color:var(--text-tertiary)">Cost Basis Breakdown</span>
          </div>
          <div class="card-body">
            <div style="height:280px;position:relative">
              <canvas id="categoryValuationChart"></canvas>
            </div>
          </div>
        </div>
      </div>

      <!-- Expiry & Waste Mitigation Section -->
      <div class="card" style="margin-bottom: 24px; border-left: 4px solid var(--color-danger);">
        <div class="card-header" style="display:flex;align-items:center;justify-content:space-between">
          <div style="display:flex;align-items:center;gap:10px">
            <div style="width:32px;height:32px;border-radius:6px;background:var(--color-danger-50);color:var(--color-danger);display:flex;align-items:center;justify-content:center">
              <i data-lucide="flame" style="width:18px;height:18px"></i>
            </div>
            <div>
              <h3 style="margin:0;font-size:1rem;font-weight:600">Perishable Shelf-Life Risk & Wastage Action Plan</h3>
              <p style="margin:0;font-size:0.75rem;color:var(--text-secondary)">Items approaching expiry requiring markdown or clearance promotions to prevent inventory write-offs</p>
            </div>
          </div>
          <span class="badge badge-danger">${expiryRisks.length} Critical Items</span>
        </div>

        <div class="table-responsive">
          <table class="table" style="font-size:0.875rem">
            <thead>
              <tr>
                <th>Product & SKU</th>
                <th>Category</th>
                <th>Current Stock</th>
                <th>Expiry Date</th>
                <th>Days Left</th>
                <th>Projected Sellout</th>
                <th>At-Risk Loss</th>
                <th>Recommended Action</th>
              </tr>
            </thead>
            <tbody>
              ${expiryRisks.length === 0 ? `
                <tr><td colspan="8" style="text-align:center;padding:24px;color:var(--text-tertiary)">No perishable items at immediate expiry risk!</td></tr>
              ` : expiryRisks.map(p => {
                const daysLeft = DemoData.daysUntil(p.expiryDate);
                const canSell = Math.round(p.avgDailySales * Math.max(0, daysLeft));
                const unsoldRisk = Math.max(0, p.stock - canSell);
                const potentialLoss = unsoldRisk * p.costPrice;

                let actionTag = '';
                if (daysLeft <= 3) {
                  actionTag = '<span class="badge badge-danger">Flash Clearance 50% Off</span>';
                } else if (daysLeft <= 7) {
                  actionTag = '<span class="badge badge-warning">Markdown 25% Off</span>';
                } else {
                  actionTag = '<span class="badge badge-info">Front-of-Store Display</span>';
                }

                return `
                  <tr>
                    <td>
                      <div style="display:flex;align-items:center;gap:8px">
                        <span>${p.icon || '📦'}</span>
                        <div>
                          <div style="font-weight:600">${p.name}</div>
                          <div style="font-size:0.75rem;color:var(--text-tertiary);font-family:var(--font-mono)">${p.sku}</div>
                        </div>
                      </div>
                    </td>
                    <td>${p.category}</td>
                    <td style="font-weight:600">${p.stock} units</td>
                    <td>${App.formatDate(p.expiryDate)}</td>
                    <td>
                      <span class="badge ${daysLeft <= 3 ? 'badge-danger' : daysLeft <= 7 ? 'badge-warning' : 'badge-neutral'}">
                        ${daysLeft <= 0 ? 'Expired Today' : `${daysLeft} days`}
                      </span>
                    </td>
                    <td>
                      <div style="font-weight:500">${canSell} units</div>
                      <div style="font-size:0.7rem;color:var(--text-tertiary)">@ ${p.avgDailySales}/day</div>
                    </td>
                    <td>
                      <div style="font-weight:700;color:var(--color-danger)">${App.formatCurrency(potentialLoss)}</div>
                      <div style="font-size:0.7rem;color:var(--text-tertiary)">(${unsoldRisk} excess units)</div>
                    </td>
                    <td>
                      ${actionTag}
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Slow Moving & Dead Stock Section -->
      <div class="card">
        <div class="card-header" style="display:flex;align-items:center;justify-content:space-between">
          <div>
            <h3 style="margin:0;font-size:1rem;font-weight:600">Slow-Moving Inventory Analysis</h3>
            <p style="margin:0;font-size:0.75rem;color:var(--text-secondary)">Products with low sales turnover rate (&le; 2 units/day) holding tied-up working capital</p>
          </div>
          <span class="badge badge-neutral">${slowMoving.length} Products</span>
        </div>

        <div class="table-responsive">
          <table class="table" style="font-size:0.875rem">
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th>Stock Level</th>
                <th>Daily Velocity</th>
                <th>Months of Supply</th>
                <th>Capital Tied Up</th>
                <th>Suggested Optimization</th>
              </tr>
            </thead>
            <tbody>
              ${slowMoving.slice(0, 10).map(p => {
                const daysSupply = p.avgDailySales > 0 ? Math.round(p.stock / p.avgDailySales) : 999;
                const monthsSupply = Math.round((daysSupply / 30) * 10) / 10;
                const tiedCapital = p.stock * p.costPrice;

                return `
                  <tr>
                    <td>
                      <div style="display:flex;align-items:center;gap:8px">
                        <span>${p.icon || '📦'}</span>
                        <div>
                          <div style="font-weight:600">${p.name}</div>
                          <div style="font-size:0.75rem;color:var(--text-tertiary);font-family:var(--font-mono)">${p.sku}</div>
                        </div>
                      </div>
                    </td>
                    <td>${p.category}</td>
                    <td style="font-weight:600">${p.stock} units</td>
                    <td>${p.avgDailySales} units/day</td>
                    <td>
                      <span style="font-weight:600;color:${monthsSupply > 3 ? 'var(--color-danger)' : 'var(--color-warning-dark)'}">
                        ${monthsSupply} months
                      </span>
                    </td>
                    <td style="font-weight:700;color:var(--text-primary)">
                      ${App.formatCurrency(tiedCapital)}
                    </td>
                    <td>
                      <span style="font-size:0.8125rem;color:var(--text-secondary)">
                        ${monthsSupply > 4 ? 'Liquidate / Halt Reorders' : 'Bundle with fast-moving items'}
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

    bindReportEvents(container, salesTrends, valuation, slowMoving, expiryRisks);
    initCharts(salesTrends, valuation);
    lucide.createIcons();
  }

  function bindReportEvents(container, salesTrends, valuation, slowMoving, expiryRisks) {
    const exportBtn = container.querySelector('#exportReportCsvBtn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        const rows = DemoData.products.map(p => {
          const daysSupply = p.avgDailySales > 0 ? Math.round(p.stock / p.avgDailySales) : 0;
          return {
            'SKU': p.sku,
            'Name': p.name,
            'Category': p.category,
            'Stock': p.stock,
            'Cost Price': p.costPrice,
            'Selling Price': p.sellingPrice,
            'Inventory Value (Cost)': p.stock * p.costPrice,
            'Inventory Value (Retail)': p.stock * p.sellingPrice,
            'Daily Sales Velocity': p.avgDailySales,
            'Days of Supply': daysSupply,
            'Expiry Date': p.expiryDate ? p.expiryDate.toISOString().split('T')[0] : 'N/A',
          };
        });

        App.exportCSV(rows, `StockSense_Analytics_Valuation_${new Date().toISOString().split('T')[0]}.csv`);
        App.showToast('info', 'Export Complete', 'Full inventory analytics exported as CSV');
      });
    }
  }

  function initCharts(salesTrends, valuation) {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#94a3b8' : '#475569';
    const gridColor = isDark ? '#334155' : '#f1f5f9';

    // 1. Sales Trends Dual Axis Chart
    const trendsCtx = document.getElementById('salesTrendsChart')?.getContext('2d');
    if (trendsCtx) {
      if (charts.trends) charts.trends.destroy();

      const labels = salesTrends.map(t => {
        const d = new Date(t.date);
        return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
      });
      const revenueData = salesTrends.map(t => t.revenue);
      const unitsData = salesTrends.map(t => t.units);

      charts.trends = new Chart(trendsCtx, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            {
              type: 'line',
              label: 'Units Sold',
              data: unitsData,
              borderColor: '#10b981',
              backgroundColor: '#10b981',
              tension: 0.3,
              yAxisID: 'y1',
              pointRadius: 2,
              borderWidth: 2,
            },
            {
              type: 'bar',
              label: 'Revenue (₹)',
              data: revenueData,
              backgroundColor: isDark ? 'rgba(59, 130, 246, 0.4)' : 'rgba(59, 130, 246, 0.25)',
              borderColor: '#3b82f6',
              borderWidth: 1,
              borderRadius: 4,
              yAxisID: 'y',
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'top', labels: { usePointStyle: true, font: { size: 11 }, color: textColor } },
            tooltip: {
              callbacks: {
                label: (ctx) => {
                  if (ctx.datasetIndex === 1) return `Revenue: ₹${Number(ctx.raw).toLocaleString('en-IN')}`;
                  return `Units: ${ctx.raw} units`;
                }
              }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              grid: { color: gridColor },
              ticks: {
                color: textColor,
                font: { size: 10 },
                callback: (v) => '₹' + v.toLocaleString('en-IN')
              },
              title: { display: true, text: 'Revenue (₹)', color: textColor, font: { size: 10 } }
            },
            y1: {
              beginAtZero: true,
              position: 'right',
              grid: { drawOnChartArea: false },
              ticks: { color: textColor, font: { size: 10 } },
              title: { display: true, text: 'Units Sold', color: textColor, font: { size: 10 } }
            },
            x: {
              grid: { display: false },
              ticks: { color: textColor, font: { size: 9 }, maxTicksLimit: 15 }
            }
          }
        }
      });
    }

    // 2. Category Valuation Doughnut Chart
    const catCtx = document.getElementById('categoryValuationChart')?.getContext('2d');
    if (catCtx) {
      if (charts.category) charts.category.destroy();

      const palette = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#14b8a6', '#6366f1'];

      charts.category = new Chart(catCtx, {
        type: 'doughnut',
        data: {
          labels: valuation.map(v => v.category),
          datasets: [{
            data: valuation.map(v => v.costValue),
            backgroundColor: palette.slice(0, valuation.length),
            borderWidth: 2,
            borderColor: isDark ? '#1e293b' : '#ffffff',
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'right', labels: { usePointStyle: true, font: { size: 10 }, color: textColor } },
            tooltip: {
              callbacks: {
                label: (ctx) => {
                  const val = ctx.raw;
                  return ` ${ctx.label}: ₹${Number(val).toLocaleString('en-IN')}`;
                }
              }
            }
          },
          cutout: '65%',
        }
      });
    }
  }

  return {
    render,
  };
})();

App.registerPage('reports', ReportsModule);
