/* ========================================
   StockSense — Settings & Configuration Module
   Store profile, safety buffer math, data backup/restore
   ======================================== */

const SettingsModule = (() => {
  function render(container) {
    const config = API.Settings.getShopConfig();
    const currentTheme = API.Settings.getTheme();

    container.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h1>System Configuration & Store Profile</h1>
          <p>Configure shop parameters, inventory safety thresholds, forecasting variables, and manage local data backups</p>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-primary" id="saveAllSettingsBtn"><i data-lucide="check"></i> Save Changes</button>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:2fr 1fr;gap:24px">
        <!-- Left: Main Settings Forms -->
        <div style="display:flex;flex-direction:column;gap:24px">
          <!-- Store Profile Card -->
          <div class="card">
            <div class="card-header">
              <h3 style="margin:0;font-size:1.05rem;font-weight:600">Store Identity & Details</h3>
              <p style="margin:0;font-size:0.75rem;color:var(--text-secondary)">Information displayed on purchase orders, invoices, and reorder reports</p>
            </div>
            <div class="card-body" style="padding:20px">
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
                <div class="form-group">
                  <label class="form-label">Shop / Retail Store Name</label>
                  <input type="text" id="settingShopName" class="form-control" value="${config.name || ''}">
                </div>
                <div class="form-group">
                  <label class="form-label">Proprietor / Store Manager</label>
                  <input type="text" id="settingOwner" class="form-control" value="${config.owner || ''}">
                </div>
              </div>

              <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
                <div class="form-group">
                  <label class="form-label">Store Email</label>
                  <input type="email" id="settingEmail" class="form-control" value="${config.email || ''}">
                </div>
                <div class="form-group">
                  <label class="form-label">Store Contact Phone</label>
                  <input type="tel" id="settingPhone" class="form-control" value="${config.phone || ''}">
                </div>
              </div>

              <div style="display:grid;grid-template-columns:2fr 1fr;gap:16px">
                <div class="form-group">
                  <label class="form-label">Store Address</label>
                  <input type="text" id="settingAddress" class="form-control" value="${config.address || ''}">
                </div>
                <div class="form-group">
                  <label class="form-label">Currency Symbol</label>
                  <select id="settingCurrency" class="form-control">
                    <option value="₹" ${config.currencySymbol === '₹' ? 'selected' : ''}>₹ (INR Rupee)</option>
                    <option value="$" ${config.currencySymbol === '$' ? 'selected' : ''}>$ (USD Dollar)</option>
                    <option value="€" ${config.currencySymbol === '€' ? 'selected' : ''}>€ (EUR Euro)</option>
                    <option value="£" ${config.currencySymbol === '£' ? 'selected' : ''}>£ (GBP Pound)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <!-- Inventory Replenishment & Safety Rules Card -->
          <div class="card">
            <div class="card-header">
              <h3 style="margin:0;font-size:1.05rem;font-weight:600">Replenishment & Forecasting Algorithm</h3>
              <p style="margin:0;font-size:0.75rem;color:var(--text-secondary)">Fine-tune the mathematical parameters that dictate safety stock and purchase reorder quantities</p>
            </div>
            <div class="card-body" style="padding:20px">
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
                <div class="form-group">
                  <label class="form-label">Safety Stock Buffer (Days)</label>
                  <input type="number" id="settingSafetyDays" class="form-control" value="${config.safetyStockDays || 5}" min="1" max="30">
                  <div style="font-size:0.7rem;color:var(--text-tertiary);margin-top:4px">
                    Buffer stock maintained against unexpected demand spikes: <code>Safety Stock = Avg Daily Sales × ${config.safetyStockDays || 5}</code>
                  </div>
                </div>

                <div class="form-group">
                  <label class="form-label">Review Period Cycle (Days)</label>
                  <input type="number" id="settingReviewDays" class="form-control" value="${config.reviewPeriodDays || 7}" min="1" max="60">
                  <div style="font-size:0.7rem;color:var(--text-tertiary);margin-top:4px">
                    Frequency between scheduled stock purchase audits (e.g. weekly orders = 7 days)
                  </div>
                </div>
              </div>

              <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
                <div class="form-group">
                  <label class="form-label">Perishable Alert Threshold (Days)</label>
                  <input type="number" id="settingShelfThreshold" class="form-control" value="${config.shelfLifeWarningDays || 7}" min="1" max="30">
                  <div style="font-size:0.7rem;color:var(--text-tertiary);margin-top:4px">
                    Trigger clearance markdown notifications when expiry is within this timeframe
                  </div>
                </div>

                <div class="form-group">
                  <label class="form-label">Stockout Urgency Buffer</label>
                  <select id="settingLeadBuffer" class="form-control">
                    <option value="strict">Strict (Stock &lt; Supplier Lead Time)</option>
                    <option value="moderate" selected>Moderate (Stock &le; Lead Time + 1 Day)</option>
                    <option value="aggressive">Aggressive (Stock &le; Reorder Point)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Right: Appearance & Database Management -->
        <div style="display:flex;flex-direction:column;gap:24px">
          <!-- Appearance & Language Card -->
          <div class="card">
            <div class="card-header">
              <h3 style="margin:0;font-size:1rem;font-weight:600">Interface & Language</h3>
            </div>
            <div class="card-body" style="padding:20px">
              <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0">
                <div>
                  <div style="font-weight:600;font-size:0.875rem">Color Theme</div>
                  <div style="font-size:0.75rem;color:var(--text-secondary)">Toggle light or dark dashboard mode</div>
                </div>
                <button class="btn btn-secondary btn-sm" id="settingsThemeToggle">
                  <i data-lucide="${currentTheme === 'dark' ? 'sun' : 'moon'}"></i>
                  <span>${currentTheme === 'dark' ? 'Dark' : 'Light'}</span>
                </button>
              </div>

              <hr style="border:none;border-top:1px solid var(--border-color);margin:12px 0">

              <div style="padding:4px 0">
                <div style="font-weight:600;font-size:0.875rem;margin-bottom:4px">System & Voice Language</div>
                <div style="font-size:0.75rem;color:var(--text-secondary);margin-bottom:8px">Voice speech-to-text recognition and UI translations across 30 languages</div>
                <select id="settingsLangSelect" class="form-control" style="font-size:0.8125rem">
                  ${window.I18n ? I18n.getAllLanguages().map(l => `<option value="${l.code}" ${l.code === I18n.getLanguage() ? 'selected' : ''}>${l.flag} ${l.native} (${l.name})</option>`).join('') : '<option value="en">English</option>'}
                </select>
              </div>

              <div style="margin-top:14px">
                <button class="btn btn-outline btn-sm" id="testVoiceAssistantBtn" style="width:100%;justify-content:center">
                  <i data-lucide="mic"></i> Open Voice Assistant HUD
                </button>
              </div>
            </div>
          </div>

          <!-- Backup & Data Management Card -->
          <div class="card">
            <div class="card-header">
              <h3 style="margin:0;font-size:1rem;font-weight:600">Data & Persistence</h3>
            </div>
            <div class="card-body" style="padding:20px;display:flex;flex-direction:column;gap:12px">
              <p style="font-size:0.8125rem;color:var(--text-secondary);margin:0">
                All inventory changes, sales transactions, and purchase orders are stored locally in browser storage.
              </p>

              <button class="btn btn-outline" id="exportAllJsonBtn" style="width:100%;justify-content:center">
                <i data-lucide="download"></i> Backup Store Data (JSON)
              </button>

              <div style="position:relative">
                <input type="file" id="importJsonFileInput" accept=".json" style="display:none">
                <button class="btn btn-outline" id="importAllJsonBtn" style="width:100%;justify-content:center">
                  <i data-lucide="upload"></i> Restore from JSON
                </button>
              </div>

              <hr style="border:none;border-top:1px solid var(--border-color);margin:8px 0">

              <button class="btn btn-outline" id="clearStoreDataBtn" style="width:100%;justify-content:center;color:var(--color-danger);border-color:var(--color-danger-100)">
                <i data-lucide="trash-2"></i> Clear Store Records (Clean Slate)
              </button>
            </div>
          </div>

          <!-- About Card -->
          <div class="card" style="background:var(--bg-hover)">
            <div class="card-body" style="padding:20px">
              <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
                <div style="width:28px;height:28px;border-radius:6px;background:var(--color-primary);color:white;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:0.875rem">
                  SS
                </div>
                <div style="font-weight:700">StockSense Management</div>
              </div>
              <p style="font-size:0.75rem;color:var(--text-secondary);margin:0 0 8px 0">
                Version 1.0.0 Commercial SaaS Edition • PS11 Problem Statement Solver for Retail Inventory Intelligence
              </p>
              <div style="font-size:0.7rem;color:var(--text-tertiary)">
                Designed for small grocery, kirana, and general stores.
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    bindSettingsEvents(container);
    lucide.createIcons();
  }

  function bindSettingsEvents(container) {
    const saveBtn = container.querySelector('#saveAllSettingsBtn');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        const currentConfig = API.Settings.getShopConfig();
        const updated = {
          ...currentConfig,
          name: document.getElementById('settingShopName').value.trim() || 'StockSense Store',
          owner: document.getElementById('settingOwner').value.trim() || 'Store Manager',
          email: document.getElementById('settingEmail').value.trim(),
          phone: document.getElementById('settingPhone').value.trim(),
          address: document.getElementById('settingAddress').value.trim(),
          currencySymbol: document.getElementById('settingCurrency').value,
          safetyStockDays: parseInt(document.getElementById('settingSafetyDays').value) || 5,
          reviewPeriodDays: parseInt(document.getElementById('settingReviewDays').value) || 7,
          shelfLifeWarningDays: parseInt(document.getElementById('settingShelfThreshold').value) || 7,
        };

        API.Settings.saveShopConfig(updated);

        // Update brand in sidebar and topbar
        const brand = document.querySelector('.sidebar-brand span');
        if (brand) brand.textContent = updated.name;
        const topbarShop = document.querySelector('.topbar-shop-select span');
        if (topbarShop) topbarShop.textContent = updated.name;
        const userName = document.querySelector('.sidebar-user-info .name');
        if (userName) userName.textContent = updated.owner;

        App.showToast('success', 'Settings Saved', 'Store configuration and replenishment rules updated');
      });
    }

    const themeBtn = container.querySelector('#settingsThemeToggle');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme') || 'light';
        const next = current === 'dark' ? 'light' : 'dark';
        API.Settings.setTheme(next);
        themeBtn.innerHTML = `<i data-lucide="${next === 'dark' ? 'sun' : 'moon'}"></i> <span>${next === 'dark' ? 'Dark' : 'Light'}</span>`;
        lucide.createIcons();
        App.showToast('info', 'Theme Changed', `Switched to ${next} theme`);
      });
    }

    const langSelect = container.querySelector('#settingsLangSelect');
    if (langSelect && window.I18n) {
      langSelect.addEventListener('change', () => {
        I18n.setLanguage(langSelect.value);
      });
    }

    const testVoiceBtn = container.querySelector('#testVoiceAssistantBtn');
    if (testVoiceBtn && window.VoiceAssistant) {
      testVoiceBtn.addEventListener('click', () => {
        VoiceAssistant.openAssistantHud();
      });
    }

    // Export all data JSON
    const exportJsonBtn = container.querySelector('#exportAllJsonBtn');
    if (exportJsonBtn) {
      exportJsonBtn.addEventListener('click', () => {
        const fullBackup = {
          shopConfig: DemoData.shopConfig,
          products: DemoData.products,
          suppliers: DemoData.suppliers,
          purchaseOrders: DemoData.purchaseOrders,
          salesHistory: DemoData.salesHistory,
          exportedAt: new Date().toISOString(),
        };

        const blob = new Blob([JSON.stringify(fullBackup, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `StockSense_Backup_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        App.showToast('success', 'Backup Exported', 'Full store database downloaded as JSON');
      });
    }

    // Import all data JSON
    const importBtn = container.querySelector('#importAllJsonBtn');
    const importInput = container.querySelector('#importJsonFileInput');
    if (importBtn && importInput) {
      importBtn.addEventListener('click', () => importInput.click());
      importInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const data = JSON.parse(event.target.result);
            if (data.products && Array.isArray(data.products)) {
              DemoData.products.length = 0;
              DemoData.products.push(...data.products);
            }
            if (data.suppliers && Array.isArray(data.suppliers)) {
              DemoData.suppliers.length = 0;
              DemoData.suppliers.push(...data.suppliers);
            }
            if (data.purchaseOrders && Array.isArray(data.purchaseOrders)) {
              DemoData.purchaseOrders.length = 0;
              DemoData.purchaseOrders.push(...data.purchaseOrders);
            }
            if (data.salesHistory && Array.isArray(data.salesHistory)) {
              DemoData.salesHistory.length = 0;
              DemoData.salesHistory.push(...data.salesHistory.map(s => ({ ...s, date: new Date(s.date) })));
            }
            if (data.shopConfig) {
              API.Settings.saveShopConfig(data.shopConfig);
            }

            App.showToast('success', 'Restore Complete', 'Store data successfully loaded from backup file');
            render(document.getElementById('pageContent'));
          } catch (err) {
            App.showToast('error', 'Restore Failed', 'Invalid JSON backup format: ' + err.message);
          }
        };
        reader.readAsText(file);
      });
    }

    // Clear store data
    const clearBtn = container.querySelector('#clearStoreDataBtn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        App.showConfirm({
          title: 'Clear Store Records?',
          message: 'This will wipe all inventory items, sales records, and purchase orders so you can start with a clean slate. Supplier profiles and settings will be preserved.',
          confirmText: 'Clear All Records',
          type: 'danger',
          onConfirm: () => {
            DataStore.clearAllData();
            App.showToast('success', 'Records Cleared', 'Inventory and sales records have been wiped to a clean slate.');
            setTimeout(() => window.location.reload(), 400);
          }
        });
      });
    }
  }

  return {
    render,
  };
})();

App.registerPage('settings', SettingsModule);
