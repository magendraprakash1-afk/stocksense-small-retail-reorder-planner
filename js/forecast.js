/* ========================================
   StockSense — Demand Forecast Module
   ======================================== */

const ForecastModule = (() => {
  let selectedProduct = null;
  let forecastHorizon = 14;
  let viewMode = 'daily';
  let forecastChart = null;

  function render(container) {
    container.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h1>Demand Forecast</h1>
          <p>Analyze historical sales trends and forecast future demand</p>
        </div>
      </div>

      <div class="card mb-lg">
        <div class="card-body">
          <div class="forecast-controls">
            <div class="form-group" style="margin:0;min-width:250px">
              <label class="form-label">Select Product</label>
              <select class="form-select" id="forecastProductSelect">
                <option value="">— Choose a product —</option>
                ${DemoData.products.map(p => `<option value="${p.id}">${p.icon} ${p.name} (${p.sku})</option>`).join('')}
              </select>
            </div>
            <div class="form-group" style="margin:0;min-width:130px">
              <label class="form-label">Horizon</label>
              <select class="form-select" id="forecastHorizon">
                <option value="7" ${forecastHorizon === 7 ? 'selected' : ''}>7 days</option>
                <option value="14" ${forecastHorizon === 14 ? 'selected' : ''}>14 days</option>
                <option value="30" ${forecastHorizon === 30 ? 'selected' : ''}>30 days</option>
              </select>
            </div>
            <div class="form-group" style="margin:0;min-width:130px">
              <label class="form-label">View</label>
              <div class="filter-pills">
                <button class="filter-pill ${viewMode === 'daily' ? 'active' : ''}" data-view="daily">Daily</button>
                <button class="filter-pill ${viewMode === 'weekly' ? 'active' : ''}" data-view="weekly">Weekly</button>
              </div>
            </div>
            <div style="margin-top:auto">
              <button class="btn btn-primary" id="runForecastBtn"><i data-lucide="play"></i> Run Forecast</button>
            </div>
          </div>
        </div>
      </div>

      <div id="forecastContent">
        <div class="empty-state">
          <div class="empty-state-icon"><i data-lucide="trending-up"></i></div>
          <h3>Select a Product</h3>
          <p>Choose a product above to view historical sales and demand forecast</p>
        </div>
      </div>
    `;

    lucide.createIcons();

    document.getElementById('forecastProductSelect')?.addEventListener('change', (e) => {
      selectedProduct = e.target.value;
      if (selectedProduct) runForecast();
    });

    document.getElementById('forecastHorizon')?.addEventListener('change', (e) => {
      forecastHorizon = parseInt(e.target.value);
      if (selectedProduct) runForecast();
    });

    document.querySelector('.forecast-controls .filter-pills')?.addEventListener('click', (e) => {
      const pill = e.target.closest('.filter-pill');
      if (!pill) return;
      viewMode = pill.dataset.view;
      document.querySelectorAll('.forecast-controls .filter-pill').forEach(p => p.classList.toggle('active', p.dataset.view === viewMode));
      if (selectedProduct) runForecast();
    });

    document.getElementById('runForecastBtn')?.addEventListener('click', () => {
      if (selectedProduct) runForecast();
      else App.showToast('warning', 'Select Product', 'Please select a product first');
    });
  }

  async function runForecast() {
    const content = document.getElementById('forecastContent');
    if (!content) return;

    content.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;padding:60px 0"><div class="spinner" style="width:32px;height:32px"></div></div>';

    try {
      const result = await API.Forecast.generate(selectedProduct, forecastHorizon);
      const fc = result.data;
      const product = DemoData.getProduct(selectedProduct);
      const supplier = DemoData.getSupplier(product.supplierId);

      const leadTimeDemand = fc.leadTimeDemand;
      const safetyStock = Math.round(product.avgDailySales * DemoData.shopConfig.safetyStockDays);
      const reviewDemand = Math.round(product.avgDailySales * DemoData.shopConfig.reviewPeriodDays);
      const daysLeft = product.avgDailySales > 0 ? Math.round(product.stock / product.avgDailySales) : Infinity;
      const stockoutDate = daysLeft < Infinity ? new Date(Date.now() + daysLeft * 86400000) : null;

      content.innerHTML = `
        <div class="forecast-metric-cards">
          <div class="forecast-metric">
            <div class="value">${fc.avgDailySales}</div>
            <div class="label">Avg Daily Sales (28d)</div>
          </div>
          <div class="forecast-metric">
            <div class="value">${fc.recentAvg}</div>
            <div class="label">Recent Avg (7d)</div>
          </div>
          <div class="forecast-metric">
            <div class="value">${leadTimeDemand}</div>
            <div class="label">Demand During Lead Time (${supplier ? supplier.leadTime + 'd' : '?'})</div>
          </div>
          <div class="forecast-metric">
            <div class="value">${reviewDemand}</div>
            <div class="label">Review Period Demand (${DemoData.shopConfig.reviewPeriodDays}d)</div>
          </div>
          <div class="forecast-metric">
            <div class="value">${product.stock}</div>
            <div class="label">Current Stock</div>
          </div>
          <div class="forecast-metric">
            <div class="value ${daysLeft < 7 ? 'text-danger' : ''}">${daysLeft === Infinity ? '∞' : daysLeft + 'd'}</div>
            <div class="label">Projected Depletion</div>
          </div>
          <div class="forecast-metric">
            <div class="value ${stockoutDate && daysLeft < 7 ? 'text-danger' : ''}">${stockoutDate ? DemoData.formatDate(stockoutDate) : 'No risk'}</div>
            <div class="label">Stockout Date (Est.)</div>
          </div>
          <div class="forecast-metric">
            <div class="value">${safetyStock}</div>
            <div class="label">Safety Stock</div>
          </div>
        </div>

        <div class="card mb-lg">
          <div class="card-header">
            <h3>${product.icon} ${product.name} — Sales & Forecast</h3>
            <span class="badge badge-info">${fc.forecastMethod}</span>
          </div>
          <div class="card-body">
            <div class="chart-container" style="height:350px"><canvas id="forecastDetailChart"></canvas></div>
          </div>
        </div>

        <div class="card">
          <div class="card-header"><h3>Forecast Data Table</h3></div>
          <div class="table-container">
            <table>
              <thead><tr>
                <th>Date</th><th class="text-right">Predicted Demand</th><th class="text-right">Lower Bound</th><th class="text-right">Upper Bound</th>
              </tr></thead>
              <tbody>
                ${fc.forecast.map(f => `<tr>
                  <td>${new Date(f.date).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' })}</td>
                  <td class="text-right font-medium">${f.predicted}</td>
                  <td class="text-right text-secondary">${f.lower}</td>
                  <td class="text-right text-secondary">${f.upper}</td>
                </tr>`).join('')}
              </tbody>
            </table>
          </div>
        </div>


      `;

      lucide.createIcons();
      renderForecastChart(fc, product);
    } catch (error) {
      content.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${error.message}</p></div>`;
    }
  }

  function renderForecastChart(fc, product) {
    if (forecastChart) forecastChart.destroy();

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const gridColor = isDark ? 'rgba(148,163,184,0.1)' : 'rgba(0,0,0,0.05)';
    const textColor = isDark ? '#94a3b8' : '#64748b';

    const labels = [];
    const historicalData = [];
    const forecastData = [];
    const upperData = [];
    const lowerData = [];

    // Historical
    fc.historical.forEach(h => {
      labels.push(new Date(h.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }));
      historicalData.push(h.qty);
      forecastData.push(null);
      upperData.push(null);
      lowerData.push(null);
    });

    // Forecast
    fc.forecast.forEach(f => {
      labels.push(new Date(f.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }));
      historicalData.push(null);
      forecastData.push(f.predicted);
      upperData.push(f.upper);
      lowerData.push(f.lower);
    });

    const ctx = document.getElementById('forecastDetailChart');
    if (!ctx) return;

    forecastChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Historical Sales',
            data: historicalData,
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59,130,246,0.06)',
            fill: true,
            tension: 0.3,
            pointRadius: 2,
            borderWidth: 2,
          },
          {
            label: 'Forecast',
            data: forecastData,
            borderColor: '#10b981',
            borderDash: [6, 4],
            backgroundColor: 'rgba(16,185,129,0.04)',
            fill: true,
            tension: 0.3,
            pointRadius: 3,
            borderWidth: 2,
          },
          {
            label: 'Upper Bound',
            data: upperData,
            borderColor: 'rgba(16,185,129,0.2)',
            backgroundColor: 'rgba(16,185,129,0.06)',
            fill: '+1',
            tension: 0.3,
            pointRadius: 0,
            borderWidth: 1,
          },
          {
            label: 'Lower Bound',
            data: lowerData,
            borderColor: 'rgba(16,185,129,0.2)',
            fill: false,
            tension: 0.3,
            pointRadius: 0,
            borderWidth: 1,
          },
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
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: gridColor },
            ticks: { color: textColor, font: { size: 10 } },
            title: { display: true, text: 'Units', color: textColor, font: { size: 11 } },
          },
          x: { grid: { display: false }, ticks: { color: textColor, font: { size: 9 }, maxRotation: 60 } }
        }
      }
    });
  }

  return { render };
})();

App.registerPage('forecast', ForecastModule);
